/** Journal d'administration global, séparé des boutiques et réservé au propriétaire. */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';
import { auditQueryParams, parseAuditFilters, type AuditFilters } from '@/modules/audit/filters';

export interface GlobalAuditEntry {
  id: string; occurredAt: string; actorUserId: string | null;
  module: string; action: string; entityType: string | null; result: 'success' | 'failure';
}

/** Aucun before/after, message libre, code d'erreur ou request_id en sortie. */
export async function listGlobalAudit(input: { token: string | undefined; page: number } & AuditFilters): Promise<{
  events: GlobalAuditEntry[]; nextPage: number | null;
}> {
  if (!Number.isSafeInteger(input.page) || input.page < 1 || input.page > 10_000) throw new ValidationError('Page invalide.');
  const filters = parseAuditFilters(input);
  return withAuthorizedGlobalTransaction({ token: input.token, permission: 'audit:read' }, async (db, { userId }) => {
    const owner = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id=$1 AND role_code='owner' AND shop_id IS NULL
    ) AS allowed`, [userId]);
    if (!owner.rows[0]?.allowed) throw new ForbiddenError('Journal global réservé au Propriétaire.');
    // Ne jamais présenter une liste vide trompeuse si la policy est absente ou si
    // le rôle applicatif contourne RLS. La migration doit être appliquée d'abord.
    const security = await db.query<{ active: boolean; policy: boolean }>(`SELECT
      row_security_active('public.audit_log'::regclass) AS active,
      EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_log'
        AND policyname='audit_global_owner_read' AND cmd='SELECT' AND permissive='PERMISSIVE') AS policy`);
    if (!security.rows[0]?.active || !security.rows[0]?.policy) throw new Error('Journal global indisponible.');
    await db.query("SELECT set_config('app.audit_global_user_id', $1, true)", [userId]);
    const [, module, actorId, from, to, q, result] = auditQueryParams('0', filters);
    const rows = await db.query<{
      id: string; occurred_at: Date | string; actor_user_id: string | null;
      module: string; action: string; entity_type: string | null; result: GlobalAuditEntry['result'];
    }>(`SELECT id::text, occurred_at, actor_user_id::text, module, action, entity_type, result
      FROM audit_log WHERE shop_id IS NULL
      AND ($1::text IS NULL OR module=$1)
      AND ($2::bigint IS NULL OR actor_user_id=$2)
      AND ($3::timestamptz IS NULL OR occurred_at >= $3)
      AND ($4::timestamptz IS NULL OR occurred_at < $4)
      AND ($5::text IS NULL OR position(lower($5) in lower(action)) > 0 OR position(lower($5) in lower(module)) > 0)
      AND ($6::text IS NULL OR result=$6)
      ORDER BY occurred_at DESC, id DESC LIMIT $7 OFFSET $8`,
    [module, actorId, from, to, q, result, 21, (input.page - 1) * 20]);
    return { events: rows.rows.slice(0, 20).map((row) => ({
      id: String(row.id), occurredAt: new Date(row.occurred_at).toISOString(),
      actorUserId: row.actor_user_id === null ? null : String(row.actor_user_id),
      module: row.module, action: row.action, entityType: row.entity_type, result: row.result,
    })), nextPage: rows.rows.length > 20 ? input.page + 1 : null };
  });
}
