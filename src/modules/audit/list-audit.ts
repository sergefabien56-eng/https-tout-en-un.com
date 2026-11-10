/** Journal boutique : permission serveur, filtre explicite et RLS dans UNE transaction. */
import { z } from 'zod';
import { withAuthorizedShopTransaction } from '@/core/auth/authorize-shop';
import { ValidationError } from '@/core/errors/app-error';

const filtersSchema = z.object({
  page: z.number().int().min(1).max(10_000),
  module: z.string().regex(/^[a-z][a-z0-9_-]{0,49}$/).optional(),
  actorId: z.string().regex(/^[1-9]\d{0,17}$/).optional(),
});
export interface AuditEntry {
  id: string; shopId: string; occurredAt: string;
  actorUserId: string | null; module: string; action: string;
  entityType: string | null; result: 'success' | 'failure';
}

/** `before`/`after` sont volontairement exclus : leur contenu doit être revu avant exposition. */
export async function listShopAudit(input: {
  token: string | undefined; shopId: string;
  page: number; module?: string; actorId?: string;
}): Promise<{ events: AuditEntry[]; nextPage: number | null }> {
  const parsed = filtersSchema.safeParse({ page: input.page, module: input.module, actorId: input.actorId });
  if (!parsed.success) throw new ValidationError('Filtres invalides.');
  return withAuthorizedShopTransaction({ token: input.token, shopId: input.shopId, permission: 'audit:read' },
    async (db, ctx) => {
      const { page, module, actorId } = parsed.data;
      const size = 20;
      const rows = await db.query<{
        id: string; shop_id: string; occurred_at: Date | string;
        actor_user_id: string | null; module: string; action: string;
        entity_type: string | null; result: AuditEntry['result'];
      }>(`SELECT id::text, shop_id::text, occurred_at, actor_user_id::text,
           module, action, entity_type, result FROM audit_log
           WHERE shop_id = $1 AND ($2::text IS NULL OR module = $2)
             AND ($3::bigint IS NULL OR actor_user_id = $3)
           ORDER BY occurred_at DESC, id DESC LIMIT $4 OFFSET $5`,
      [ctx.shopId, module ?? null, actorId ?? null, size + 1, (page - 1) * size]);
      return { events: rows.rows.slice(0, size).map((r) => ({
        id: String(r.id), shopId: String(r.shop_id), occurredAt: new Date(r.occurred_at).toISOString(),
        actorUserId: r.actor_user_id === null ? null : String(r.actor_user_id),
        module: r.module, action: r.action, entityType: r.entity_type, result: r.result,
      })), nextPage: rows.rows.length > size ? page + 1 : null };
    });
}
