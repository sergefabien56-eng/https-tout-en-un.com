import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { ValidationError } from '@/core/errors/app-error';
import { REFERENCE_CURRENCIES, type ReferenceCurrency } from '@/modules/identity/reference-currency';
const KEY = 'organization.reference_currency';

export function parseReferenceCurrency(value: unknown): ReferenceCurrency {
  if (typeof value !== 'string' || !REFERENCE_CURRENCIES.some((currency) => currency === value))
    throw new ValidationError('Devise de référence invalide ou non prise en charge.');
  return value as ReferenceCurrency;
}

export async function readOrganizationCurrency(token: string | undefined): Promise<{ currency: ReferenceCurrency | null }> {
  return withAuthorizedGlobalTransaction({ token, permission: 'settings:read' }, async (db) => {
    const result = await db.query<{ value: unknown }>('SELECT value FROM app_settings WHERE key=$1', [KEY]);
    const value = result.rows[0]?.value;
    return { currency: value === null || value === undefined ? null : parseReferenceCurrency(value) };
  });
}

export async function updateOrganizationCurrency(token: string | undefined, input: unknown): Promise<{ currency: ReferenceCurrency }> {
  const currency = parseReferenceCurrency(input);
  return withAuthorizedGlobalTransaction({ token, permission: 'settings:manage' }, async (db, { userId }) => {
    // Verrouille aussi la première configuration ; ne transforme pas une valeur corrompue en absence.
    await db.query(`INSERT INTO app_settings (key, value) VALUES ($1, 'null'::jsonb) ON CONFLICT (key) DO NOTHING`, [KEY]);
    const result = await db.query<{ value: unknown }>('SELECT value FROM app_settings WHERE key=$1 FOR UPDATE', [KEY]);
    const value = result.rows[0]?.value;
    const before = value === null || value === undefined ? null : parseReferenceCurrency(value);
    if (before !== currency) {
      await db.query('UPDATE app_settings SET value=$2::jsonb, updated_by=$3, updated_at=now() WHERE key=$1',
        [KEY, JSON.stringify(currency), userId]);
      await db.query("SELECT set_config('app.audit_actor_id', $1, true)", [userId]);
      await db.query(`INSERT INTO audit_log (actor_user_id, module, action, entity_type, before, after)
        VALUES ($1, 'settings', 'update_reference_currency', 'app_setting', $2::jsonb, $3::jsonb)`,
      [userId, JSON.stringify({ currency: before }), JSON.stringify({ currency })]);
    }
    return { currency };
  });
}
