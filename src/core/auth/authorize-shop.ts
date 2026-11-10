/**
 * Porte d'entrée serveur pour toute opération sur une boutique.
 * Authentification, permission, accès boutique, opération et audit partagent UNE transaction
 * avec SET LOCAL app.shop_id ; aucun composant client ne peut se déclarer autorisé.
 */
import type { PoolClient } from 'pg';
import { hashSessionToken } from '@/core/auth/primitives';
import { withShopTransaction } from '@/core/db/client';
import { parseShopId, type ShopId } from '@/core/db/shop-scope';
import { AppError, ForbiddenError } from '@/core/errors/app-error';
import { redact } from '@/core/logger/logger';

export interface AuthorizedContext {
  readonly userId: string;
  readonly shopId: ShopId;
}

function unauthenticated(): AppError {
  return new AppError('UNAUTHENTICATED', { userMessage: 'Connexion nécessaire.' });
}

/**
 * Le callback reçoit le client après vérification. Les requêtes métier doivent conserver
 * le filtre SQL `shop_id = $n` en plus de la RLS, selon ADR-007.
 * Les mutations doivent passer par `withAuditedShopMutation` ci-dessous.
 */
export async function withAuthorizedShopTransaction<T>(input: {
  token: string | undefined;
  shopId: ShopId;
  permission: string;
}, task: (db: PoolClient, context: AuthorizedContext) => Promise<T>): Promise<T> {
  if (!input.token || !/^[A-Za-z0-9_-]{43}$/.test(input.token)) throw unauthenticated();
  const shopId = parseShopId(input.shopId);
  return withShopTransaction(shopId, async (db) => {
    const identity = await db.query<{ user_id: string }>(
      `SELECT s.user_id FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
         AND u.status = 'active'`,
      [hashSessionToken(input.token!)],
    );
    const row = identity.rows[0];
    if (!row) throw unauthenticated();
    const userId = String(row.user_id);
    // Global owner is the ONLY role allowed to bypass an explicit user_shop_access grant.
    const access = await db.query<{ allowed: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM shops WHERE id = $2 AND deleted_at IS NULL
      ) AND (
        EXISTS (SELECT 1 FROM user_shop_access WHERE user_id = $1 AND shop_id = $2 AND can_view)
        OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = $1 AND role_code = 'owner' AND shop_id IS NULL)
      ) AS allowed`,
      [userId, shopId],
    );
    if (!access.rows[0]?.allowed) {
      throw new ForbiddenError('Boutique introuvable ou non autorisée.');
    }
    const permissions = await db.query<{ allowed: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_code = ur.role_code
        WHERE ur.user_id = $1 AND (ur.shop_id IS NULL OR ur.shop_id = $2)
          AND rp.permission_code = $3
      ) AS allowed`,
      [userId, shopId, input.permission],
    );
    if (!permissions.rows[0]?.allowed) throw new ForbiddenError('Action non autorisée.');
    return task(db, { userId, shopId });
  });
}

export interface AuditChange {
  readonly module: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityPublicId?: string;
  readonly before?: Record<string, unknown> | null;
  readonly after?: Record<string, unknown> | null;
  readonly requestId?: string;
}

/**
 * Mutation et écriture du journal atomiques : si l'audit échoue, la mutation est annulée.
 * Toute donnée sensible est supprimée AVANT l'INSERT en base, pas juste au rendu UI.
 */
export async function withAuditedShopMutation<T>(
  input: { token: string | undefined; shopId: ShopId; permission: string },
  change: AuditChange,
  task: (db: PoolClient, context: AuthorizedContext) => Promise<T>,
): Promise<T> {
  return withAuthorizedShopTransaction(input, async (db, context) => {
    const result = await task(db, context);
    await db.query(
      `INSERT INTO audit_log
       (actor_user_id, shop_id, module, action, entity_type, entity_public_id, before, after, request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)`,
      [context.userId, context.shopId, change.module, change.action, change.entityType,
        change.entityPublicId ?? null,
        JSON.stringify(redact(change.before ?? null)), JSON.stringify(redact(change.after ?? null)),
        change.requestId ?? null],
    );
    return result;
  });
}
