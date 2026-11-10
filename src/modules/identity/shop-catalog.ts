/** Catalogue RLS des boutiques, limité à un utilisateur authentifié. */
import { hashSessionToken } from '@/core/auth/primitives';
import { withIdentityTransaction } from '@/core/db/client';
import { AppError, ValidationError } from '@/core/errors/app-error';

export interface ShopSummary {
  id: string; displayName: string; countryCode: string; currency: string; status: string;
}
export async function listOwnShops(token: string | undefined, page = 1): Promise<{
  shops: ShopSummary[]; nextPage: number | null;
}> {
  if (!Number.isSafeInteger(page) || page < 1 || page > 10_000) throw new ValidationError('Page invalide.');
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
  return withIdentityTransaction(async (db) => {
    const auth = await db.query<{ user_id: string }>(
      `SELECT s.user_id FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
       AND u.status = 'active'`, [hashSessionToken(token)],
    );
    const userId = auth.rows[0]?.user_id;
    if (!userId) throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
    // La policy shops_catalog limite par rôle, permission ET user_shop_access.
    // Le contexte LOCAL disparaît au COMMIT/ROLLBACK et ne se transmet pas au pool.
    await db.query("SELECT set_config('app.list_user_id', $1, true)", [userId]);
    const result = await db.query<{
      id: string; display_name: string; country_code: string; currency: string; status: string;
    }>(`SELECT id::text, display_name, country_code, currency, status FROM shops
       WHERE deleted_at IS NULL ORDER BY id DESC LIMIT $1 OFFSET $2`, [51, (page - 1) * 50]);
    return { shops: result.rows.slice(0, 50).map((r) => ({ id: String(r.id), displayName: r.display_name,
      countryCode: r.country_code, currency: r.currency, status: r.status })),
      nextPage: result.rows.length > 50 ? page + 1 : null };
  });
}
