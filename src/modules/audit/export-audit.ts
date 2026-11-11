/** Export borné, autorisé et neutralisé contre les formules de tableur. */
import { withAuthorizedShopTransaction } from '@/core/auth/authorize-shop';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';
import { auditQueryParams, auditWhere, parseAuditFilters, type AuditFilters } from '@/modules/audit/filters';

export function safeCsvCell(value: string | null): string {
  const text = value ?? '';
  // L'apostrophe est posée AVANT tout espace/control : aucun préfixe dangereux après trim.
  const safe = /^[\s\uFEFF]*[=+@-]/u.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export async function exportShopAudit(input: { token: string | undefined; shopId: string } & AuditFilters): Promise<string> {
  const filters = parseAuditFilters(input);
  return withAuthorizedShopTransaction({ token: input.token, shopId: input.shopId, permission: 'audit:read' },
    async (db, ctx) => {
      const grant = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
        SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_code = rp.role_code
        WHERE ur.user_id = $1 AND (ur.shop_id IS NULL OR ur.shop_id = $2)
          AND rp.permission_code = 'reports:export'
      ) AS allowed`, [ctx.userId, ctx.shopId]);
      if (!grant.rows[0]?.allowed) throw new ForbiddenError('Export non autorisé.');
      const rows = await db.query<{
        id: string; occurred_at: Date | string; actor_user_id: string | null;
        module: string; action: string; entity_type: string | null; result: string;
      }>(`SELECT id::text, occurred_at, actor_user_id::text, module, action, entity_type, result
        FROM audit_log WHERE ${auditWhere} ORDER BY occurred_at DESC, id DESC LIMIT 10001`,
      auditQueryParams(ctx.shopId, filters));
      if (rows.rows.length > 10_000) throw new ValidationError('Export trop volumineux. Réduisez la période.');
      const header = ['Boutique', 'Période début UTC', 'Période fin UTC', 'Exporté le UTC', 'Recherche action/module', 'Résultat filtré'];
      const meta = [ctx.shopId, filters.from ?? 'Non filtrée', filters.to ?? 'Non filtrée',
        new Date().toISOString(), filters.q?.trim() || 'Non filtrée', filters.result ?? 'Tous'];
      const columns = ['Identifiant', 'Date UTC', 'Acteur', 'Module', 'Action', 'Entité', 'Résultat'];
      const lines = [header.map(safeCsvCell).join(','), meta.map(safeCsvCell).join(','), '', columns.map(safeCsvCell).join(',')];
      for (const r of rows.rows) lines.push([r.id, new Date(r.occurred_at).toISOString(),
        r.actor_user_id, r.module, r.action, r.entity_type, r.result].map(safeCsvCell).join(','));
      return `\uFEFF${lines.join('\r\n')}\r\n`;
    });
}
