/**
 * Incidents applicatifs réels, lus dans `system_events` (0004) et acquittés par le Propriétaire.
 *
 * Ce module ne fabrique aucun incident : il lit ce qui a été écrit. Un écran vide signifie
 * « aucun incident enregistré », jamais « tout va bien ». Le collecteur d'erreurs (lot suivant)
 * est la seule source d'écriture ; tant qu'il n'existe pas, l'écran doit le dire.
 */
import type { PoolClient } from 'pg';
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';

export type IncidentSeverity = 'info' | 'warning' | 'critical';

export interface SystemIncident {
  id: string;
  occurredAt: string;
  severity: IncidentSeverity;
  category: string;
  code: string;
  message: string;
  acknowledgedAt: string | null;
}

export interface IncidentReport {
  /** Bornes de la fenêtre lue, en ISO UTC. */
  windowStart: string;
  windowEnd: string;
  windowDays: number;
  /** Non acquittés par sévérité : ce sont les seuls chiffres que l'écran peut afficher. */
  openCritical: number;
  openWarnings: number;
  openInfos: number;
  acknowledged: number;
  total: number;
  incidents: SystemIncident[];
  limits: string;
}

export const INCIDENT_WINDOW_DAYS = 30;
export const INCIDENT_PAGE_SIZE = 20;

/** Le contexte RLS de la policy 0018 : posé après vérification, jamais avant. */
async function assertOwnerWithSystemManage(db: PoolClient, userId: string): Promise<void> {
  const result = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = 'owner' AND ur.shop_id IS NULL
    JOIN role_permissions rp ON rp.role_code = ur.role_code AND rp.permission_code = 'system:manage'
    WHERE u.id = $1 AND u.status = 'active') AS allowed`, [userId]);
  if (!result.rows[0]?.allowed) throw new ForbiddenError('Incidents réservés au Propriétaire.');
}

export async function readIncidentReport(db: PoolClient, now: Date, page = 1): Promise<IncidentReport> {
  if (!Number.isSafeInteger(page) || page < 1 || page > 10_000) throw new ValidationError('Page invalide.');
  const windowStart = new Date(now.getTime() - INCIDENT_WINDOW_DAYS * 86_400_000);
  const counters = await db.query<{
    critical: number; warning: number; info: number; acknowledged: number; total: number;
  }>(`SELECT
       count(*) FILTER (WHERE severity = 'critical' AND acknowledged_at IS NULL)::int AS critical,
       count(*) FILTER (WHERE severity = 'warning' AND acknowledged_at IS NULL)::int AS warning,
       count(*) FILTER (WHERE severity = 'info' AND acknowledged_at IS NULL)::int AS info,
       count(*) FILTER (WHERE acknowledged_at IS NOT NULL)::int AS acknowledged,
       count(*)::int AS total
     FROM system_events WHERE occurred_at >= $1 AND shop_id IS NULL`, [windowStart]);
  const row = counters.rows[0];
  if (!row) throw new Error('Lecture des incidents indisponible.');
  const rows = await db.query<{
    id: string; occurred_at: Date | string; severity: IncidentSeverity;
    category: string; code: string; message: string; acknowledged_at: Date | string | null;
  }>(`SELECT id::text, occurred_at, severity, category, code, message, acknowledged_at
       FROM system_events WHERE occurred_at >= $1 AND shop_id IS NULL
      ORDER BY acknowledged_at IS NOT NULL, severity = 'critical' DESC, occurred_at DESC, id DESC
      LIMIT $2 OFFSET $3`, [windowStart, INCIDENT_PAGE_SIZE + 1, (page - 1) * INCIDENT_PAGE_SIZE]);
  // Le message est une donnée de journal, jamais du HTML : il est rendu comme texte par React.
  // Il est tronqué ici pour qu'une trace d'exception ne devienne pas une page entière.
  const incidents = rows.rows.slice(0, INCIDENT_PAGE_SIZE).map((entry) => ({
    id: String(entry.id),
    occurredAt: new Date(entry.occurred_at).toISOString(),
    severity: entry.severity,
    category: entry.category,
    code: entry.code,
    message: entry.message.length > 500 ? `${entry.message.slice(0, 500)}…` : entry.message,
    acknowledgedAt: entry.acknowledged_at === null ? null : new Date(entry.acknowledged_at).toISOString(),
  }));
  return {
    windowStart: windowStart.toISOString(), windowEnd: now.toISOString(),
    windowDays: INCIDENT_WINDOW_DAYS,
    openCritical: row.critical, openWarnings: row.warning, openInfos: row.info,
    acknowledged: row.acknowledged, total: row.total,
    incidents,
    limits: 'Incidents globaux uniquement (aucune boutique). Fenêtre 30 jours, 20 par page. '
      + 'Le collecteur d’erreurs automatique n’est pas livré : seuls les incidents déjà écrits apparaissent.',
  };
}

export async function getIncidentReport(token: string | undefined, page = 1): Promise<IncidentReport> {
  return withAuthorizedGlobalTransaction({ token, permission: 'system:manage' }, async (db, { userId }) => {
    await assertOwnerWithSystemManage(db, userId);
    await db.query("SELECT set_config('app.system_events_user_id', $1, true)", [userId]);
    // Aucun contexte boutique n'est posé : la lecture est ouverte par la policy 0018 seule,
    // qui exige à la fois le rôle Propriétaire global et `shop_id IS NULL`.
    return readIncidentReport(db, new Date(), page);
  });
}

/**
 * Acquittement : la seule mutation autorisée sur un incident, et elle est idempotente.
 * Un incident boutique (`shop_id` non nul) ou déjà acquitté ne peut pas être visé : la policy
 * 0018 l'interdit et la requête ne matche alors aucune ligne, donc le résultat est honnête.
 */
export async function acknowledgeIncident(token: string | undefined, id: string): Promise<{ acknowledgedAt: string }> {
  if (!/^[1-9]\d{0,18}$/.test(id)) throw new ValidationError('Incident invalide.');
  return withAuthorizedGlobalTransaction({ token, permission: 'system:manage' }, async (db, { userId }) => {
    await assertOwnerWithSystemManage(db, userId);
    await db.query("SELECT set_config('app.system_events_user_id', $1, true)", [userId]);
    const updated = await db.query<{ acknowledged_at: Date | string }>(
      `UPDATE system_events SET acknowledged_at = now(), acknowledged_by = $1
        WHERE id = $2 AND shop_id IS NULL AND acknowledged_at IS NULL
        RETURNING acknowledged_at`, [userId, id]);
    const acknowledgedAt = updated.rows[0]?.acknowledged_at;
    if (!acknowledgedAt) throw new ForbiddenError('Incident introuvable, déjà acquitté, ou hors périmètre global.');
    return { acknowledgedAt: new Date(acknowledgedAt).toISOString() };
  });
}
