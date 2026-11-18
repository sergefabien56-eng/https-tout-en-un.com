/**
 * Logo commun — droits, contrôle serveur du fichier, et non-régression des préférences.
 *
 * Ce que ce test prouve, et que l'écran ne prouve pas :
 *  - un Gestionnaire global (qui possède pourtant `settings:manage`) ne peut pas changer
 *    le logo, même en appelant le module directement, sans passer par l'interface ;
 *  - un utilisateur non connecté est refusé ;
 *  - un SVG renommé en PNG est refusé : le type est relevé sur les octets ;
 *  - un fichier trop lourd, trop petit, trop étiré ou de dimensions excessives est refusé ;
 *  - l'image stockée est ré-encodée, donc ses métadonnées d'origine ont disparu ;
 *  - le journal d'audit ne contient jamais l'image, seulement le fait et les dimensions ;
 *  - le retrait ramène à l'icône provisoire.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolClient } from 'pg';
import sharp from 'sharp';
import { createSessionToken } from '@/core/auth/primitives';

let db: PGlite;
vi.mock('@/core/db/client', () => ({
  withIdentityTransaction: async <T>(task: (client: PoolClient) => Promise<T>): Promise<T> => {
    await db.exec('BEGIN;');
    try { const result = await task(db as unknown as PoolClient); await db.exec('COMMIT;'); return result; }
    catch (error) { await db.exec('ROLLBACK;'); throw error; }
  },
}));
const { inspectLogoUpload, readImageSize, readOrganizationLogo, readOrganizationLogoBytes, readVisibleOrganizationLogo,
  removeOrganizationLogo, sniffImageMime, updateOrganizationLogo } = await import('@/modules/identity/organization-logo');
const owner = createSessionToken(); const globalManager = createSessionToken(); const nobody = createSessionToken();

/** PNG carré uni, de la taille demandée, avec une métadonnée EXIF reconnaissable. */
async function png(width: number, height: number, withComment = false): Promise<Buffer> {
  let pipeline = sharp({ create: { width, height, channels: 3, background: { r: 16, g: 28, b: 57 } } });
  if (withComment) pipeline = pipeline.withMetadata({ exif: { IFD0: { Copyright: 'METADONNEE_SECRETE' } } });
  return pipeline.png().toBuffer();
}

beforeAll(async () => {
  db = await PGlite.create();
  const dir = join(process.cwd(), 'drizzle');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.up.sql')).sort())
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  await db.exec(`
    CREATE ROLE settings_test_app NOLOGIN NOBYPASSRLS;
    GRANT USAGE ON SCHEMA public TO settings_test_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO settings_test_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO settings_test_app;
    INSERT INTO marketplace_apps (label, client_id) VALUES ('test', 'test');
    INSERT INTO shops (app_id, jumia_shop_sid, business_client_code, country_code, currency, display_name)
      VALUES (1, gen_random_uuid(), 'test-ci', 'CI', 'XOF', 'Boutique test');
    INSERT INTO users (email, password_hash, display_name) VALUES
      ('owner@logo.invalid','hash','Propriétaire'),
      ('manager@logo.invalid','hash','Gestionnaire global'),
      ('nobody@logo.invalid','hash','Sans droit');
    INSERT INTO user_roles (user_id, role_code, shop_id) VALUES
      (1, 'owner', NULL), (2, 'manager', NULL), (3, 'assistant', 1);
  `);
  for (const [id, session] of [[1, owner], [2, globalManager], [3, nobody]] as const) {
    await db.query(`INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,now()+interval '1 hour')`,
      [id, session.hash]);
  }
});
afterAll(async () => { await db.close(); });

describe('contrôle serveur du fichier importé', () => {
  it('reconnaît le type sur les octets, pas sur le nom', async () => {
    expect(sniffImageMime(await png(64, 64))).toBe('image/png');
    expect(sniffImageMime(await sharp(await png(64, 64)).jpeg().toBuffer())).toBe('image/jpeg');
    expect(sniffImageMime(await sharp(await png(64, 64)).webp().toBuffer())).toBe('image/webp');
  });

  it('refuse un SVG, même déguisé en PNG', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(sniffImageMime(svg)).toBeNull();
    // Le refus doit mentionner le vrai motif, pour que le propriétaire comprenne.
    expect(() => inspectLogoUpload(svg)).toThrow(/SVG/);
  });

  it('refuse les fichiers vides, trop lourds, trop petits, trop grands ou trop étirés', async () => {
    const base = await png(64, 64); const tiny = await png(16, 16);
    const banded = await png(2049, 64); const maxSide = await png(2048, 2048);
    const elongated = await png(1200, 200);
    expect(() => inspectLogoUpload(Buffer.alloc(0))).toThrow(/vide/);
    expect(() => inspectLogoUpload(Buffer.concat([base, Buffer.alloc(1_100_000)]))).toThrow(/volumineux/);
    expect(() => inspectLogoUpload(tiny)).toThrow(/trop petite/);
    // Une bande de 1200×200 : les proportions sont refusées AVANT la taille, pour que
    // le message parle du vrai problème que le propriétaire doit corriger.
    expect(() => inspectLogoUpload(elongated)).toThrow(/[Pp]roportions/);
    expect(() => inspectLogoUpload(banded)).toThrow(/trop grande/);
    expect(inspectLogoUpload(maxSide)).toMatchObject({ width: 2048, height: 2048 });
  });

  it('lit les dimensions dans l’en-tête, pour les trois formats', async () => {
    const p = await png(300, 120);
    expect(readImageSize(p, 'image/png')).toEqual({ width: 300, height: 120 });
    expect(readImageSize(await sharp(p).jpeg().toBuffer(), 'image/jpeg')).toEqual({ width: 300, height: 120 });
    expect(readImageSize(await sharp(p).webp().toBuffer(), 'image/webp')).toEqual({ width: 300, height: 120 });
  });

  it('refuse un en-tête tronqué au lieu d’inventer des dimensions', () => {
    expect(() => inspectLogoUpload(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toThrow(/illisible/);
  });
});

describe('droits : le Propriétaire seul peut changer le logo', () => {
  it('un Gestionnaire global est refusé malgré « settings:manage »', async () => {
    // Vérification préalable : ce Gestionnaire possède bien settings:manage.
    const grants = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM user_roles ur
      JOIN role_permissions rp ON rp.role_code = ur.role_code
      WHERE ur.user_id = 2 AND ur.shop_id IS NULL AND rp.permission_code = 'settings:manage'`);
    expect(grants.rows[0]?.n).toBe(1);
    await expect(updateOrganizationLogo(globalManager.token, await png(64, 64))).rejects.toThrow(/Propriétaire/);
    await expect(removeOrganizationLogo(globalManager.token)).rejects.toThrow(/Propriétaire/);
  });

  it('un utilisateur sans droit global et une session absente sont refusés', async () => {
    await expect(updateOrganizationLogo(nobody.token, await png(64, 64))).rejects.toThrow();
    await expect(updateOrganizationLogo(undefined, await png(64, 64))).rejects.toThrow(/Connexion/);
    await expect(readOrganizationLogo(undefined)).rejects.toThrow(/Connexion/);
  });

  it('le Propriétaire enregistre, l’image est ré-encodée sans ses métadonnées', async () => {
    const before = await readOrganizationLogo(owner.token);
    expect(before).toMatchObject({ custom: false, provisional: true, url: null });

    const dirty = await png(900, 600, true);
    expect(dirty.includes(Buffer.from('METADONNEE_SECRETE'))).toBe(true);
    const saved = await updateOrganizationLogo(owner.token, dirty);
    // Proportions conservées : 900×600 réduit à 512 de côté reste 512×341 (et non 512×512).
    expect(saved).toEqual({ width: 512, height: 341 });

    const stored = await readOrganizationLogoBytes(owner.token);
    expect(stored).not.toBeNull();
    expect(stored!.mime).toBe('image/png');
    expect(stored!.bytes.includes(Buffer.from('METADONNEE_SECRETE'))).toBe(false);

    const after = await readOrganizationLogo(owner.token);
    expect(after).toMatchObject({ custom: true, provisional: false });
    expect(after.url).toMatch(/^\/api\/organization\/logo\?v=/);
    expect(after.width).toBe(512);
  });

  it('un membre limité à une boutique voit le logo mais ne le modifie pas', async () => {
    // Ce compte n'a AUCUN droit global : ni settings:read, ni dashboard:read au global.
    // La lecture du logo ne doit donc pas passer par une permission métier.
    await expect(readOrganizationLogo(nobody.token)).rejects.toThrow();
    const seen = await readVisibleOrganizationLogo(nobody.token);
    expect(seen.custom).toBe(true);
    expect(seen.url).toMatch(/^\/api\/organization\/logo\?v=/);
    const bytes = await readOrganizationLogoBytes(nobody.token);
    expect(bytes?.mime).toBe('image/png');
    await expect(updateOrganizationLogo(nobody.token, await png(64, 64))).rejects.toThrow();
  });

  it('le journal d’audit enregistre le fait, jamais l’image', async () => {
    const rows = await db.query<{ action: string; before: unknown; after: unknown }>(
      `SELECT action, before, after FROM audit_log WHERE action = 'update_organization_logo' ORDER BY id`);
    expect(rows.rows).toHaveLength(1);
    const after = JSON.stringify(rows.rows[0]!.after);
    expect(after).toContain('"width":512');
    // Aucune donnée binaire : pas de base64 de l'image dans le journal.
    expect(after).not.toMatch(/[A-Za-z0-9+/]{200,}/);
    expect(after.length).toBeLessThan(400);
  });

  it('le retrait ramène à l’icône provisoire et journalise', async () => {
    await removeOrganizationLogo(owner.token);
    const state = await readOrganizationLogo(owner.token);
    expect(state).toMatchObject({ custom: false, provisional: true, url: null });
    expect((await readOrganizationLogoBytes(owner.token))).toBeNull();
    const rows = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM audit_log WHERE action = 'remove_organization_logo'`);
    expect(rows.rows[0]?.n).toBe(1);
  });

  it('une valeur corrompue en base n’est pas affichée comme un logo', async () => {
    await db.query(`INSERT INTO app_settings (key, value) VALUES ('organization.logo', $1::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = $1::jsonb`,
    [JSON.stringify({ data: Buffer.from('<svg/>').toString('base64'), mime: 'image/svg+xml' })]);
    const state = await readOrganizationLogo(owner.token);
    expect(state).toMatchObject({ custom: false, provisional: true, url: null });
  });
});

describe('policy 0017 : l’audit du logo est autorisé, rien de plus', () => {
  it('refuse un acteur absent, un acteur différent et une action hors périmètre', async () => {
    const attempt = async (actorContext: string, actor: string, action: string) => {
      await db.exec('BEGIN; SET LOCAL ROLE settings_test_app;');
      try {
        await db.query("SELECT set_config('app.audit_actor_id', $1, true)", [actorContext]);
        await db.query(`INSERT INTO audit_log (actor_user_id, module, action, entity_type, shop_id)
          VALUES ($1, 'settings', $2, 'app_setting', NULL)`, [actor, action]);
      } finally { await db.exec('ROLLBACK;'); }
    };
    // Sans acteur posé : refus.
    await expect(attempt('', '1', 'update_organization_logo')).rejects.toMatchObject({ code: '42501' });
    // Acteur différent de celui du contexte : refus.
    await expect(attempt('1', '2', 'update_organization_logo')).rejects.toMatchObject({ code: '42501' });
    // Action non prévue par la policy : refus, même avec le bon acteur.
    await expect(attempt('1', '1', 'delete_everything')).rejects.toMatchObject({ code: '42501' });
    // Avec une boutique : refus, le logo est global. Chaque refus a sa propre transaction,
    // sinon la transaction avortée masque le refus suivant.
    const attemptWithShop = async () => {
      await db.exec('BEGIN; SET LOCAL ROLE settings_test_app;');
      try {
        await db.query("SELECT set_config('app.audit_actor_id', $1, true)", ['1']);
        await db.query(`INSERT INTO audit_log (actor_user_id, module, action, entity_type, shop_id)
          VALUES (1, 'settings', 'update_organization_logo', 'app_setting', 1)`);
      } finally { await db.exec('ROLLBACK;'); }
    };
    await expect(attemptWithShop()).rejects.toMatchObject({ code: '42501' });
    // La policy n'ouvre aucune lecture du journal.
    await db.exec('BEGIN; SET LOCAL ROLE settings_test_app;');
    try {
      expect((await db.query('SELECT id FROM audit_log')).rows).toEqual([]);
    } finally { await db.exec('ROLLBACK;'); }
  });
});

describe('préférences individuelles : le logo commun n’y touche pas', () => {
  it('aucune clé de thème n’est écrite par la gestion du logo', async () => {
    const keys = await db.query<{ key: string }>('SELECT key FROM app_settings ORDER BY key');
    expect(keys.rows.map((row) => row.key)).not.toContain('theme');
    expect(keys.rows.map((row) => row.key).filter((key) => key.includes('theme'))).toEqual([]);
    // Le thème est une préférence de navigateur : aucune table ne doit le stocker côté serveur.
    const tables = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    expect(tables.rows.map((row) => row.table_name).filter((name) => /theme|appearance/i.test(name))).toEqual([]);
  });
});
