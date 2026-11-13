/**
 * Accès boutiques explicites d'un compte : Propriétaire global uniquement.
 * Le retrait d'un rôle boutique conserve la ligne user_shop_access (voir manage-shop-role) ;
 * ce module rend ces lignes visibles avec leur provenance et permet de gérer
 * les accès indépendants ou liés à un rôle global, sans jamais toucher aux rôles.
 */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { withAuthorizedShopTransaction } from '@/core/auth/authorize-shop';
import { AppError, ForbiddenError, ValidationError } from '@/core/errors/app-error';

export type ShopAccessOrigin = 'scoped_role' | 'global_role' | 'independent';

export interface ShopAccessRoleRow {
  /** NULL = rôle global ; sinon rôle limité à cette boutique. */
  readonly shopId: string | null;
}

/** Provenance d'une ligne d'accès : rôle sur la boutique, rôle global, ou indépendante. */
export function classifyShopAccessOrigin(
  roles: readonly ShopAccessRoleRow[],
  shopId: string,
): ShopAccessOrigin {
  if (roles.some((role) => role.shopId === shopId)) return 'scoped_role';
  if (roles.some((role) => role.shopId === null)) return 'global_role';
  return 'independent';
}

export interface ShopAccessEntry {
  readonly shopId: string;
  readonly shopName: string | null;
  readonly canView: boolean;
  readonly createdAt: string;
  readonly origin: ShopAccessOrigin;
}

function parseTargetUserId(value: string): string {
  if (!/^[1-9]\d{0,17}$/.test(value)) throw new ValidationError('Utilisateur invalide.');
  return value;
}

async function requireGlobalOwner(db: { query: <T>(sql: string, params?: readonly unknown[]) => Promise<{ rows: T[] }> }, actorId: string): Promise<void> {
  const owner = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = $1 AND role_code = 'owner' AND shop_id IS NULL
  ) AS allowed`, [actorId]);
  if (!owner.rows[0]?.allowed)
    throw new ForbiddenError('Seul le Propriétaire peut administrer les accès boutique.');
}

/**
 * Liste les lignes user_shop_access du compte cible avec leur provenance.
 * Lecture sous RLS : le contexte catalogue cible expose ses accès, puis le contexte
 * Propriétaire (policy shops_catalog) expose les noms ; aucune lecture hors RLS.
 */
export async function listUserShopAccess(
  token: string | undefined,
  userId: string,
): Promise<{ userId: string; accesses: ShopAccessEntry[] }> {
  const targetId = parseTargetUserId(userId);
  return withAuthorizedGlobalTransaction({ token, permission: 'roles:manage' }, async (db, context) => {
    await requireGlobalOwner(db, context.userId);
    const target = await db.query<{ id: string }>('SELECT id::text FROM users WHERE id = $1', [targetId]);
    if (!target.rows[0]) throw new AppError('NOT_FOUND', { userMessage: 'Utilisateur introuvable.' });
    const roles = await db.query<{ shop_id: string | null }>(
      'SELECT shop_id::text FROM user_roles WHERE user_id = $1', [targetId]);
    await db.query("SELECT set_config('app.list_user_id', $1, true)", [targetId]);
    const accesses = await db.query<{ shop_id: string; can_view: boolean; created_at: Date | string }>(
      'SELECT shop_id::text, can_view, created_at FROM user_shop_access WHERE user_id = $1 ORDER BY shop_id',
      [targetId]);
    const names = new Map<string, string>();
    if (accesses.rows.length > 0) {
      await db.query("SELECT set_config('app.list_user_id', $1, true)", [context.userId]);
      const placeholders = accesses.rows.map((_, index) => `$${index + 1}::bigint`).join(', ');
      const shops = await db.query<{ id: string; display_name: string }>(
        `SELECT id::text, display_name FROM shops
         WHERE deleted_at IS NULL AND id IN (${placeholders})`,
        accesses.rows.map((row) => row.shop_id));
      for (const shop of shops.rows) names.set(shop.id, shop.display_name);
    }
    const roleRows = roles.rows.map((row) => ({ shopId: row.shop_id === null ? null : String(row.shop_id) }));
    return {
      userId: targetId,
      accesses: accesses.rows.map((row) => ({
        shopId: String(row.shop_id),
        shopName: names.get(String(row.shop_id)) ?? null,
        canView: row.can_view,
        createdAt: new Date(row.created_at).toISOString(),
        origin: classifyShopAccessOrigin(roleRows, String(row.shop_id)),
      })),
    };
  });
}

/**
 * Révoque une ligne d'accès indépendante ou liée à un rôle global : suppression + audit
 * atomiques dans la transaction scopée RLS de la boutique. Les accès issus d'un rôle
 * boutique sont refusés : ils se gèrent d'abord par le rôle de cette boutique.
 * Un accès porté par un rôle global peut être retiré sans supprimer ce rôle global.
 */
export async function revokeShopAccess(input: {
  token: string | undefined; userId: string; shopId: string;
}): Promise<{ userId: string; shopId: string; revoked: boolean; changed: boolean }> {
  const targetId = parseTargetUserId(input.userId);
  return withAuthorizedShopTransaction({ token: input.token, shopId: input.shopId, permission: 'roles:manage' }, async (db, context) => {
    await requireGlobalOwner(db, context.userId);
    if (targetId === context.userId) throw new ForbiddenError('Votre propre compte est protégé.');
    const target = await db.query<{ status: string }>('SELECT status FROM users WHERE id = $1 FOR UPDATE', [targetId]);
    if (!target.rows[0]) throw new AppError('NOT_FOUND', { userMessage: 'Utilisateur introuvable.' });
    if (target.rows[0].status === 'invited')
      throw new AppError('CONFLICT', { userMessage: 'Les invitations ne sont pas gérées ici.' });
    const targetOwner = await db.query<{ owner: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = $1 AND role_code = 'owner'
    ) AS owner`, [targetId]);
    if (targetOwner.rows[0]?.owner) throw new ForbiddenError('Le compte Propriétaire est protégé.');
    const roles = await db.query<{ shop_id: string | null }>(
      'SELECT shop_id::text FROM user_roles WHERE user_id = $1 FOR UPDATE', [targetId]);
    const origin = classifyShopAccessOrigin(
      roles.rows.map((row) => ({ shopId: row.shop_id === null ? null : String(row.shop_id) })),
      context.shopId,
    );
    if (origin === 'scoped_role')
      throw new AppError('CONFLICT', { userMessage: 'Cet accès provient d’un rôle boutique : retirez d’abord ce rôle.' });
    const access = await db.query<{ can_view: boolean; created_at: Date | string }>(
      'SELECT can_view, created_at FROM user_shop_access WHERE user_id = $1 AND shop_id = $2 FOR UPDATE',
      [targetId, context.shopId]);
    const row = access.rows[0];
    if (!row) return { userId: targetId, shopId: context.shopId, revoked: true, changed: false };
    await db.query('DELETE FROM user_shop_access WHERE user_id = $1 AND shop_id = $2', [targetId, context.shopId]);
    await db.query(`INSERT INTO audit_log
      (actor_user_id, shop_id, module, action, entity_type, before, after)
      VALUES ($1, $2, 'users', 'revoke_shop_access', 'user_shop_access', $3::jsonb, $4::jsonb)`,
    [context.userId, context.shopId,
      JSON.stringify({ userId: targetId, shopId: context.shopId, canView: row.can_view,
        createdAt: new Date(row.created_at).toISOString() }),
      JSON.stringify({ userId: targetId, shopId: context.shopId, revoked: true })]);
    return { userId: targetId, shopId: context.shopId, revoked: true, changed: true };
  });
}

/** Accorder l'accès explicite à une boutique à un compte doté d'un rôle global.
 * Ne crée ni ne modifie aucun rôle ; la boutique reste protégée par RLS et autorisation.
 */
export async function grantGlobalRoleShopAccess(input: {
  token: string | undefined; userId: string; shopId: string;
}): Promise<{ userId: string; shopId: string; granted: boolean; changed: boolean }> {
  const targetId = parseTargetUserId(input.userId);
  return withAuthorizedShopTransaction({ token: input.token, shopId: input.shopId, permission: 'roles:manage' }, async (db, context) => {
    await requireGlobalOwner(db, context.userId);
    if (targetId === context.userId) throw new ForbiddenError('Votre propre compte est protégé.');
    const target = await db.query<{ status: string }>('SELECT status FROM users WHERE id = $1 FOR UPDATE', [targetId]);
    if (!target.rows[0]) throw new AppError('NOT_FOUND', { userMessage: 'Utilisateur introuvable.' });
    if (target.rows[0].status === 'invited')
      throw new AppError('CONFLICT', { userMessage: 'Les invitations ne sont pas gérées ici.' });
    const roles = await db.query<{ role_code: string; shop_id: string | null }>(
      'SELECT role_code, shop_id::text FROM user_roles WHERE user_id = $1 FOR UPDATE', [targetId]);
    if (roles.rows.some((role) => role.role_code === 'owner'))
      throw new ForbiddenError('Le compte Propriétaire est protégé.');
    if (!roles.rows.some((role) => role.shop_id === null))
      throw new AppError('CONFLICT', { userMessage: 'Ce compte ne possède aucun rôle global.' });
    const access = await db.query<{ can_view: boolean }>(
      'SELECT can_view FROM user_shop_access WHERE user_id = $1 AND shop_id = $2 FOR UPDATE',
      [targetId, context.shopId]);
    if (access.rows[0]?.can_view === true)
      return { userId: targetId, shopId: context.shopId, granted: true, changed: false };
    await db.query(`INSERT INTO user_shop_access (user_id, shop_id, can_view) VALUES ($1, $2, true)
      ON CONFLICT (user_id, shop_id) DO UPDATE SET can_view = true`, [targetId, context.shopId]);
    await db.query(`INSERT INTO audit_log
      (actor_user_id, shop_id, module, action, entity_type, before, after)
      VALUES ($1, $2, 'users', 'grant_global_shop_access', 'user_shop_access', $3::jsonb, $4::jsonb)`,
    [context.userId, context.shopId,
      JSON.stringify({ userId: targetId, shopId: context.shopId, canView: access.rows[0]?.can_view ?? null }),
      JSON.stringify({ userId: targetId, shopId: context.shopId, canView: true })]);
    return { userId: targetId, shopId: context.shopId, granted: true, changed: true };
  });
}
