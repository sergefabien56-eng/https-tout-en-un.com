/**
 * Écran Système — mesure de latence et incidents, sur PostgreSQL réel (PGlite) sous RLS.
 *
 * Ce que ces tests doivent prouver, dans cet ordre :
 *   1. la latence est réellement écrite et relue, agrégée, sans identifiant ;
 *   2. un zéro mesuré n'est jamais confondu avec « rien n'a été mesuré » ;
 *   3. les incidents ne sont lisibles NI par un gestionnaire global, NI par un rôle limité ;
 *   4. l'acquittement est unique, borné au global, et ne peut pas toucher une ligne boutique ;
 *   5. aucune donnée personnelle ne peut entrer dans la mesure ni dans l'incident.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolClient } from 'pg';
import { createSessionToken } from '@/core/auth/primitives';

let db: PGlite;
let useRestrictedRole = false;
vi.mock('@/core/db/client', () => ({
  withIdentityTransaction: async <T>(task: (client: PoolClient) => Promise<T>): Promise<T> => {
    await db.exec('BEGIN;');
    try {
      if (useRestrictedRole) await db.exec('SET LOCAL ROLE monitor_test_app;');
      const result = await task(db as unknown as PoolClient);
      await db.exec('COMMIT;');
      return result;
    } catch (error) { await db.exec('ROLLBACK;'); throw error; }
  },
}));

const { recordRouteLatency, getRouteLatency, readRouteLatency } =
  await import('@/modules/monitoring/route-latency');
const { getIncidentReport, acknowledgeIncident, readIncidentReport } =
  await import('@/modules/monitoring/system-incidents');

const owner = createSessionToken();
const globalManager = createSessionToken();
const scoped = createSessionToken();

beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort()) {
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  }
  await db.exec(`
    CREATE ROLE monitor_test_app NOLOGIN NOBYPASSRLS;
    GRANT USAGE ON SCHEMA public TO monitor_test_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO monitor_test_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO monitor_test_app;
    INSERT INTO marketplace_apps (label, client_id) VALUES ('test', 'test');
    INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
      VALUES (1, gen_random_uuid(), 'test-ci', 'CI', 'XOF', 'Boutique test');
    INSERT INTO users (email, password_hash, display_name) VALUES
      ('owner@test.invalid','hash','Propriétaire'),
      ('global@test.invalid','hash','Gestionnaire global'),
      ('scoped@test.invalid','hash','Gestionnaire limité');
    INSERT INTO user_roles (user_id, role_code, shop_id) VALUES
      (1, 'owner', NULL), (2, 'manager', NULL), (3, 'manager', 1);
  `);
  for (const [id, session] of [[1, owner], [2, globalManager], [3, scoped]] as const) {
    await db.query(`INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,now()+interval '1 hour')`,
      [id, session.hash]);
  }
});
afterAll(async () => { await db.close(); });

describe('latence par route : mesurée, agrégée, sans identifiant', () => {
  it('enregistre puis relit une moyenne et un maximum réels', async () => {
    // Horodatage RELATIF à l'instant du test : une date fixe sortirait de la fenêtre d'une heure
    // dès que la suite complète dure plus longtemps que prévu (défaut vu en suite complète).
    const now = new Date(Date.now() - 5 * 60_000);
    for (const durationMs of [100, 200, 1_500]) {
      await recordRouteLatency({ routeKey: 'health', method: 'GET', statusClass: 2, durationMs, now });
    }
    const report = await getRouteLatency(owner.token, 3_600_000);
    const row = report.routes.find((route) => route.routeKey === 'health' && route.method === 'GET');
    expect(row).toMatchObject({ samples: 3, averageMs: 600, maxMs: 1_500, slowSamples: 1, slowPercent: 33 });
    expect(report.totalSamples).toBe(3);
    expect(report.measured).toBe(true);
  });

  it('ne stocke aucun identifiant de requête et garde une clé de route normalisée', async () => {
    const rows = await db.query<{ route_key: string }>('SELECT DISTINCT route_key FROM route_latency');
    // Les clés sont exactement les chemins déclarés : aucun segment variable, aucun UUID.
    expect(rows.rows.map((row) => row.route_key).sort()).toEqual(['health']);
    expect(JSON.stringify(rows.rows)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);
  });

  it('distingue « zéro mesuré » de « aucune mesure »', async () => {
    // Fenêtre d'une heure close il y a une heure : aucun échantillon n'y a été écrit. `measured`
    // doit être faux, sans lever d'erreur, et sans fabriquer un zéro présenté comme une mesure.
    const past = new Date(Date.now() - 3_600_000);
    const empty = await readRouteLatency(db as unknown as PoolClient, past, 3_600_000);
    expect(empty.measured).toBe(false);
    expect(empty.totalSamples).toBe(0);
    expect(empty.routes).toEqual([]);
  });

  it('refuse une route non déclarée et une durée aberrante', async () => {
    await expect(recordRouteLatency({ routeKey: '/api/fantome', method: 'GET', statusClass: 2, durationMs: 5 }))
      .rejects.toThrow();
    await expect(recordRouteLatency({ routeKey: 'health', method: 'GET', statusClass: 2, durationMs: -1 }))
      .rejects.toThrow();
    await expect(recordRouteLatency({ routeKey: 'health', method: 'GET', statusClass: 2, durationMs: 4_000_000 }))
      .rejects.toThrow();
  });

  it('refuse toute lecture sans session propriétaire', async () => {
    await expect(getRouteLatency(scoped.token)).rejects.toThrow();
    await expect(getRouteLatency(globalManager.token)).rejects.toThrow();
    await expect(getRouteLatency(undefined)).rejects.toThrow();
  });
});

describe('incidents : lecture et acquittement réservés au Propriétaire', () => {
  it('lit zéro incident réel sans le confondre avec une absence de lecture', async () => {
    const report = await getIncidentReport(owner.token);
    expect(report.total).toBe(0);
    expect(report.incidents).toEqual([]);
    expect(report.windowDays).toBe(30);
  });

  it('compte séparément critiques, avertissements et acquisitions', async () => {
    await db.exec(`INSERT INTO system_events (severity, category, code, message, shop_id) VALUES
      ('critical','route','route_failure','Une route API a répondu en erreur serveur.',NULL),
      ('warning','export','export_failure','Un export a échoué côté serveur.',NULL),
      ('warning','export','export_failure','Un export a échoué côté serveur.',NULL),
      ('critical','test','shop-scoped','Incident de boutique.',1);`);
    const report = await getIncidentReport(owner.token);
    // L'incident de boutique ne doit jamais apparaître dans le périmètre global.
    expect(report).toMatchObject({ total: 3, openCritical: 1, openWarnings: 2, openInfos: 0 });
    expect(JSON.stringify(report)).not.toContain('Incident de boutique.');
  });

  it('n’ouvre ni la lecture ni l’acquittement à un gestionnaire global', async () => {
    const id = (await getIncidentReport(owner.token)).incidents[0]!.id;
    await expect(getIncidentReport(globalManager.token)).rejects.toThrow();
    await expect(acknowledgeIncident(globalManager.token, id)).rejects.toThrow();
    await expect(acknowledgeIncident(scoped.token, id)).rejects.toThrow();
  });

  it('acquitte une seule fois et refuse un incident de boutique', async () => {
    const critical = (await getIncidentReport(owner.token)).incidents.find((i) => i.severity === 'critical')!;
    const result = await acknowledgeIncident(owner.token, critical.id);
    expect(Date.parse(result.acknowledgedAt)).not.toBeNaN();
    // Deuxième acquittement : refusé, l'horodatage d'origine reste intact.
    await expect(acknowledgeIncident(owner.token, critical.id)).rejects.toThrow();
    const after = await getIncidentReport(owner.token);
    expect(after.openCritical).toBe(0);
    expect(after.acknowledged).toBe(1);
    expect(after.incidents.find((i) => i.id === critical.id)?.acknowledgedAt).toBe(result.acknowledgedAt);
    // L'incident boutique (id 4) n'est pas acquittable depuis le périmètre global.
    await expect(acknowledgeIncident(owner.token, '4')).rejects.toThrow();
  });

  it('refuse un identifiant d’incident qui n’en est pas un', async () => {
    for (const id of ['0', '-1', '1 OR 1=1', 'abc', '1.5']) {
      await expect(acknowledgeIncident(owner.token, id)).rejects.toThrow();
    }
  });

  it('expose le catalogue de lecture sans donnée personnelle', async () => {
    const report = await readIncidentReport(db as unknown as PoolClient, new Date());
    expect(report.limits).toContain('collecteur d’erreurs automatique n’est pas livré');
    expect(JSON.stringify(report)).not.toMatch(/@test\.invalid|token|password/i);
  });
});

describe('mesure sous rôle applicatif restreint (RLS active)', () => {
  it('écrit et relit la latence avec le rôle non privilégié', async () => {
    useRestrictedRole = true;
    try {
      await recordRouteLatency({ routeKey: 'admin/system/incidents', method: 'GET', statusClass: 2, durationMs: 42 });
      const report = await readRouteLatency(db as unknown as PoolClient, new Date(), 3_600_000);
      expect(report.measured).toBe(true);
      expect(report.routes.some((route) => route.routeKey === 'admin/system/incidents')).toBe(true);
    } finally { useRestrictedRole = false; }
  });

  it('refuse au rôle applicatif toute lecture et toute écriture dans le journal système', async () => {
    const open = (await getIncidentReport(owner.token)).incidents.find((i) => i.acknowledgedAt === null)!;
    // Le changement de rôle est LOCAL à une transaction : sans BEGIN explicite, on testerait
    // le rôle propriétaire de PGlite et le test ne prouverait rien (défaut corrigé ici).
    await db.exec('BEGIN; SET LOCAL ROLE monitor_test_app;');
    try {
      // Sans le contexte `app.system_events_user_id`, ni la policy 0018 ni la policy 0007
      // (qui exige un contexte boutique) n'autorisent la lecture : aucune ligne ne sort.
      const read = await db.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM system_events WHERE shop_id IS NULL');
      expect(read.rows[0]?.n).toBe(0);
      // Écriture refusée : aucune policy d'écriture globale n'existe. PostgreSQL ne lève pas
      // d'erreur ici — il ne touche simplement aucune ligne, ce qui est le refus réel. Le test
      // affirme donc le nombre de lignes modifiées, pas une exception qui n'arriverait pas.
      const update = await db.query(
        'UPDATE system_events SET acknowledged_at = now(), acknowledged_by = 1 WHERE id = $1', [open.id]);
      expect(update.affectedRows).toBe(0);
      // Et l'incident reste bien non acquitté du point de vue du Propriétaire.
      const after = await getIncidentReport(owner.token);
      expect(after.incidents.find((i) => i.id === open.id)?.acknowledgedAt).toBeNull();
    } finally { await db.exec('ROLLBACK;'); }
  });
});
