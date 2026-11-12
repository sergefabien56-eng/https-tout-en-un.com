/** Export CSV du catalogue visible via RLS, limité aux boutiques exportables. */
import { hashSessionToken } from '@/core/auth/primitives';
import { withIdentityTransaction } from '@/core/db/client';
import { AppError, ForbiddenError, ValidationError } from '@/core/errors/app-error';
import { safeCsvCell } from '@/core/export/safe-csv';
import { parseShopFilters, shopOrderBy } from '@/modules/identity/shop-catalog';

export async function exportOwnShops(token: string | undefined, filters: { q?: string; status?: string; sort?: string } = {}): Promise<string> {
  const { q, status, sort } = parseShopFilters(filters);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
  return withIdentityTransaction(async (db) => {
    const auth = await db.query<{ user_id: string }>(`SELECT s.user_id FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'active'`,
    [hashSessionToken(token)]);
    const userId = auth.rows[0]?.user_id;
    if (!userId) throw new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
    const permission = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_code = ur.role_code
      WHERE ur.user_id = $1 AND rp.permission_code = 'reports:export'
    ) AS allowed`, [userId]);
    if (!permission.rows[0]?.allowed) throw new ForbiddenError('Export non autorisé.');
    // La policy shops_catalog impose shops:read + user_shop_access. Même un rôle
    // export global ne peut pas contourner la visibilité boutique RLS.
    await db.query("SELECT set_config('app.list_user_id', $1, true)", [userId]);
    const result = await db.query<{
      id: string; display_name: string; country_code: string; currency: string; status: string;
    }>(`SELECT id::text, display_name, country_code, currency, status FROM shops
      WHERE deleted_at IS NULL
        AND ($2::text IS NULL OR position(lower($2) in lower(display_name)) > 0)
        AND ($3::text IS NULL OR status = $3)
        AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_code = ur.role_code
          WHERE ur.user_id = $1 AND rp.permission_code = 'reports:export'
            AND (ur.shop_id IS NULL OR ur.shop_id = shops.id))
      ORDER BY ${shopOrderBy[sort]} LIMIT 10001`, [userId, q || null, status ?? null]);
    if (result.rows.length > 10_000) throw new ValidationError('Export trop volumineux. Affinez les filtres.');
    const lines = [
      ['Périmètre', 'Exporté le UTC', 'Recherche', 'État', 'Tri'].map(safeCsvCell).join(','),
      ['Boutiques accessibles et exportables', new Date().toISOString(), q || 'Non filtrée', status ?? 'Tous', sort]
        .map(safeCsvCell).join(','), '',
      ['Identifiant', 'Boutique', 'Pays', 'Devise', 'État', 'Ventes et commandes'].map(safeCsvCell).join(','),
    ];
    for (const shop of result.rows) lines.push([shop.id, shop.display_name,
      shop.country_code, shop.currency, shop.status, '—'].map(safeCsvCell).join(','));
    return `\uFEFF${lines.join('\r\n')}\r\n`;
  });
}
