/** Journal boutique : permission serveur, filtre explicite et RLS dans UNE transaction. */
import { auditQueryParams, auditWhere, parseAuditFilters, type AuditFilters } from '@/modules/audit/filters';
import { withAuthorizedShopTransaction } from '@/core/auth/authorize-shop';
import { ValidationError } from '@/core/errors/app-error';

export interface AuditEntry {
  id: string; shopId: string; occurredAt: string;
  actorUserId: string | null; module: string; action: string;
  entityType: string | null; result: 'success' | 'failure';
}

/** `before`/`after` sont volontairement exclus : leur contenu doit être revu avant exposition. */
export async function listShopAudit(input: {
  token: string | undefined; shopId: string;
  page: number; } & AuditFilters
): Promise<{ events: AuditEntry[]; nextPage: number | null }> {
  if (!Number.isSafeInteger(input.page) || input.page < 1 || input.page > 10_000) throw new ValidationError('Page invalide.');
  const filters = parseAuditFilters(input);
  return withAuthorizedShopTransaction({ token: input.token, shopId: input.shopId, permission: 'audit:read' },
    async (db, ctx) => {
      const { page } = input;
      const size = 20;
      const rows = await db.query<{
        id: string; shop_id: string; occurred_at: Date | string;
        actor_user_id: string | null; module: string; action: string;
        entity_type: string | null; result: AuditEntry['result'];
      }>(`SELECT id::text, shop_id::text, occurred_at, actor_user_id::text,
           module, action, entity_type, result FROM audit_log
           WHERE ${auditWhere}
           ORDER BY occurred_at DESC, id DESC LIMIT $8 OFFSET $9`,
      [...auditQueryParams(ctx.shopId, filters), size + 1, (page - 1) * size]);
      return { events: rows.rows.slice(0, size).map((r) => ({
        id: String(r.id), shopId: String(r.shop_id), occurredAt: new Date(r.occurred_at).toISOString(),
        actorUserId: r.actor_user_id === null ? null : String(r.actor_user_id),
        module: r.module, action: r.action, entityType: r.entity_type, result: r.result,
      })), nextPage: rows.rows.length > size ? page + 1 : null };
    });
}
