/** Nom affiché de l'organisation : distinct du nom officiel de l'application. */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { ValidationError } from '@/core/errors/app-error';

const KEY = 'organization.name';

export function parseOrganizationName(value: unknown): string {
  if (typeof value !== 'string' || /[\p{Cc}\p{Cf}\p{Cs}]/u.test(value))
    throw new ValidationError('Nom d’organisation invalide.');
  const name = value.trim().normalize('NFC');
  if (!name || name.length > 100) throw new ValidationError('Nom d’organisation invalide.');
  return name;
}

export async function readOrganizationName(token: string | undefined): Promise<{ name: string | null }> {
  return withAuthorizedGlobalTransaction({ token, permission: 'settings:read' }, async (db) => {
    const result = await db.query<{ value: unknown }>('SELECT value FROM app_settings WHERE key = $1', [KEY]);
    const value = result.rows[0]?.value;
    if (value === undefined || value === null) return { name: null };
    // Ne pas prétendre qu'une donnée corrompue est un nom valide.
    return { name: parseOrganizationName(value) };
  });
}

export async function updateOrganizationName(token: string | undefined, value: unknown): Promise<{ name: string }> {
  const name = parseOrganizationName(value);
  return withAuthorizedGlobalTransaction({ token, permission: 'settings:manage' }, async (db, { userId }) => {
    // Sérialise aussi les premières écritures concurrentes sur la clé absente.
    await db.query(`INSERT INTO app_settings (key, value) VALUES ($1, 'null'::jsonb)
      ON CONFLICT (key) DO NOTHING`, [KEY]);
    const previous = await db.query<{ value: unknown }>(
      'SELECT value FROM app_settings WHERE key = $1 FOR UPDATE', [KEY]);
    const stored = previous.rows[0]?.value;
    const before = stored === null || stored === undefined ? null : parseOrganizationName(stored);
    if (before !== name) {
      await db.query(`UPDATE app_settings SET value = $2::jsonb, updated_by = $3, updated_at = now() WHERE key = $1`,
        [KEY, JSON.stringify(name), userId]);
      // Policy 0012 : acteur local posé uniquement après autorisation globale.
      await db.query("SELECT set_config('app.audit_actor_id', $1, true)", [userId]);
      await db.query(`INSERT INTO audit_log (actor_user_id, module, action, entity_type, before, after)
        VALUES ($1, 'settings', 'update_organization_name', 'app_setting', $2::jsonb, $3::jsonb)`,
      [userId, JSON.stringify({ name: before }), JSON.stringify({ name })]);
    }
    return { name };
  });
}
