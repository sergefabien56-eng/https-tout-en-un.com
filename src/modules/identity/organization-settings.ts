/** Paramètre d'organisation explicite et limité : aucune lecture générique d'app_settings. */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { ValidationError } from '@/core/errors/app-error';
import { TIMEZONES, type OrganizationTimezone } from '@/modules/identity/organization-timezones';
const SETTING_KEY = 'organization.timezone';

export function parseOrganizationTimezone(value: unknown): OrganizationTimezone {
  if (typeof value !== 'string' || !TIMEZONES.some((zone) => zone === value))
    throw new ValidationError('Fuseau horaire invalide.');
  return value as OrganizationTimezone;
}

export async function readOrganizationSettings(token: string | undefined): Promise<{ timezone: OrganizationTimezone | null }> {
  return withAuthorizedGlobalTransaction({ token, permission: 'settings:read' }, async (db) => {
    const result = await db.query<{ value: unknown }>('SELECT value FROM app_settings WHERE key = $1', [SETTING_KEY]);
    // Une configuration corrompue ne doit pas être affichée comme un choix valide.
    const value = result.rows[0]?.value;
    return { timezone: TIMEZONES.some((zone) => zone === value) ? value as OrganizationTimezone : null };
  });
}

export async function updateOrganizationTimezone(token: string | undefined, value: unknown): Promise<{ timezone: OrganizationTimezone }> {
  const timezone = parseOrganizationTimezone(value);
  return withAuthorizedGlobalTransaction({ token, permission: 'settings:manage' }, async (db, { userId }) => {
    // Matérialiser la clé avant le verrou : deux premières écritures concurrentes ne
    // doivent pas lire toutes deux « absent » et produire un avant/audit obsolète.
    await db.query(`INSERT INTO app_settings (key, value) VALUES ($1, 'null'::jsonb)
      ON CONFLICT (key) DO NOTHING`, [SETTING_KEY]);
    const previous = await db.query<{ value: unknown }>(
      'SELECT value FROM app_settings WHERE key = $1 FOR UPDATE', [SETTING_KEY]);
    const stored = previous.rows[0]?.value;
    const before = TIMEZONES.some((zone) => zone === stored) ? stored as OrganizationTimezone : null;
    if (before !== timezone) {
      await db.query(`INSERT INTO app_settings (key, value, updated_by, updated_at)
        VALUES ($1, $2::jsonb, $3, now()) ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [SETTING_KEY, JSON.stringify(timezone), userId]);
      await db.query(`INSERT INTO audit_log (actor_user_id, module, action, entity_type, before, after)
        VALUES ($1, 'settings', 'update_timezone', 'app_setting', $2::jsonb, $3::jsonb)`,
      [userId, JSON.stringify({ timezone: before }), JSON.stringify({ timezone })]);
    }
    return { timezone };
  });
}
