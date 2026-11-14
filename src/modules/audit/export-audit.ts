/** Export borné, autorisé et neutralisé contre les formules de tableur. */
import { withAuthorizedShopTransaction } from '@/core/auth/authorize-shop';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';
import { safeCsvCell } from '@/core/export/safe-csv';
import { auditQueryParams, auditWhere, parseAuditFilters, type AuditFilters } from '@/modules/audit/filters';

export { safeCsvCell } from '@/core/export/safe-csv';
export type AuditExportInput = { token: string | undefined; shopId: string } & AuditFilters;
export interface AuditExportRow { id: string; occurred_at: Date | string; actor_user_id: string | null; module: string; action: string; entity_type: string | null; result: string }
export interface AuditExport { shopId: string; filters: AuditFilters; exportedAt: string; rows: AuditExportRow[] }

export async function loadAuthorizedAuditExport(input: AuditExportInput): Promise<AuditExport> {
  const filters = parseAuditFilters(input);
  return withAuthorizedShopTransaction({ token: input.token, shopId: input.shopId, permission: 'audit:read' },
    async (db, ctx) => {
      const grant = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
        SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_code = rp.role_code
        WHERE ur.user_id = $1 AND (ur.shop_id IS NULL OR ur.shop_id = $2)
          AND rp.permission_code = 'reports:export'
      ) AS allowed`, [ctx.userId, ctx.shopId]);
      if (!grant.rows[0]?.allowed) throw new ForbiddenError('Export non autorisé.');
      const rows = await db.query<AuditExportRow>(`SELECT id::text, occurred_at, actor_user_id::text, module, action, entity_type, result
        FROM audit_log WHERE ${auditWhere} ORDER BY occurred_at DESC, id DESC LIMIT 10001`,
      auditQueryParams(ctx.shopId, filters));
      if (rows.rows.length > 10_000) throw new ValidationError('Export trop volumineux. Réduisez la période.');
      return { shopId: ctx.shopId, filters, exportedAt: new Date().toISOString(), rows: rows.rows };
    });
}

export function formatAuditExportCsv(data: AuditExport): string {
  const header = ['Boutique', 'Période début UTC', 'Période fin UTC', 'Exporté le UTC', 'Recherche action/module', 'Résultat filtré'];
  const meta = [data.shopId, data.filters.from ?? 'Non filtrée', data.filters.to ?? 'Non filtrée',
    data.exportedAt, data.filters.q?.trim() || 'Non filtrée', data.filters.result ?? 'Tous'];
  const columns = ['Identifiant', 'Date UTC', 'Acteur', 'Module', 'Action', 'Entité', 'Résultat'];
  const lines = [header.map(safeCsvCell).join(','), meta.map(safeCsvCell).join(','), '', columns.map(safeCsvCell).join(',')];
  for (const r of data.rows) lines.push([r.id, new Date(r.occurred_at).toISOString(),
    r.actor_user_id, r.module, r.action, r.entity_type, r.result].map(safeCsvCell).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export async function exportShopAudit(input: AuditExportInput): Promise<string> {
  return formatAuditExportCsv(await loadAuthorizedAuditExport(input));
}
