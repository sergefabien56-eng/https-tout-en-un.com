/** Export du journal GLOBAL du propriétaire (CSV/Excel/PDF).
 * Périmètre strictement identique à la lecture : lignes `shop_id IS NULL` uniquement,
 * propriétaire global + audit:read global + reports:export global, RLS vérifiée.
 * Aucun before/after, message libre, code d'erreur, request_id ni donnée de boutique.
 */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';
import { auditQueryParams, parseAuditFilters, type AuditFilters } from '@/modules/audit/filters';

export type GlobalAuditExport = {
  filters: AuditFilters;
  exportedAt: string;
  rows: { id: string; occurredAt: string; actorUserId: string | null; module: string;
    action: string; entityType: string | null; result: 'success' | 'failure' }[];
};

/** Une ligne de détail au maximum 254 caractères affichables ; aucun caractère de contrôle. */
const safeText = (value: string | null): string => {
  if (value === null) return '';
  if (Array.from(value).length > 254 || /[\p{Cc}\p{Cf}\p{Cs}]/u.test(value))
    throw new ValidationError('Une valeur du journal global ne peut pas être exportée.');
  return value;
};

export async function loadGlobalAuditExport(input: { token: string | undefined } & AuditFilters): Promise<GlobalAuditExport> {
  const filters = parseAuditFilters(input);
  return withAuthorizedGlobalTransaction({ token: input.token, permission: 'audit:read' }, async (db, { userId }) => {
    const owner = await db.query<{ allowed: boolean }>(`SELECT
      EXISTS (SELECT 1 FROM user_roles WHERE user_id=$1 AND role_code='owner' AND shop_id IS NULL)
      AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_code=ur.role_code
        WHERE ur.user_id=$1 AND ur.shop_id IS NULL AND rp.permission_code='reports:export') AS allowed`, [userId]);
    if (!owner.rows[0]?.allowed) throw new ForbiddenError('Export global réservé au Propriétaire.');
    // Jamais d'export « vide » trompeur si la RLS ou la policy attendue manque.
    const security = await db.query<{ active: boolean; policy: boolean }>(`SELECT
      row_security_active('public.audit_log'::regclass) AS active,
      EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_log'
        AND policyname='audit_global_owner_read' AND cmd='SELECT' AND permissive='PERMISSIVE') AS policy`);
    if (!security.rows[0]?.active || !security.rows[0]?.policy) throw new Error('Export global indisponible.');
    await db.query("SELECT set_config('app.audit_global_user_id', $1, true)", [userId]);
    const [, module, actorId, from, to, q, result] = auditQueryParams('0', filters);
    const rows = await db.query<{ id: string; occurred_at: Date | string; actor_user_id: string | null;
      module: string; action: string; entity_type: string | null; result: 'success' | 'failure' }>(
      `SELECT id::text, occurred_at, actor_user_id::text, module, action, entity_type, result
       FROM audit_log WHERE shop_id IS NULL
       AND ($1::text IS NULL OR module=$1)
       AND ($2::bigint IS NULL OR actor_user_id=$2)
       AND ($3::timestamptz IS NULL OR occurred_at >= $3)
       AND ($4::timestamptz IS NULL OR occurred_at < $4)
       AND ($5::text IS NULL OR position(lower($5) in lower(action)) > 0 OR position(lower($5) in lower(module)) > 0)
       AND ($6::text IS NULL OR result=$6)
       ORDER BY occurred_at DESC, id DESC LIMIT 10001`,
      [module, actorId, from, to, q, result]);
    if (rows.rows.length > 10_000) throw new ValidationError('Export trop volumineux. Réduisez la période.');
    return {
      filters,
      exportedAt: new Date().toISOString(),
      rows: rows.rows.map((row) => ({
        id: String(row.id),
        occurredAt: new Date(row.occurred_at).toISOString(),
        actorUserId: row.actor_user_id === null ? null : String(row.actor_user_id),
        module: safeText(row.module),
        action: safeText(row.action),
        entityType: row.entity_type === null ? null : safeText(row.entity_type),
        result: row.result,
      })),
    };
  });
}

/** Métadonnées communes aux trois formats : périmètre, version, environnement, date UTC. */
export function globalExportMeta(data: GlobalAuditExport): [string, string][] {
  return [
    ['Périmètre', 'Journal global du propriétaire (hors boutiques)'],
    ['Version application', process.env.APP_VERSION?.trim() || '0.1.0'],
    ['Environnement déclaré', process.env.APP_ENV?.trim() || 'non déclaré'],
    ['Exporté le UTC', data.exportedAt],
    ['Période début UTC', data.filters.from ?? 'Non filtrée'],
    ['Période fin UTC (incluse)', data.filters.to ?? 'Non filtrée'],
    ['Recherche action/module', data.filters.q?.trim() || 'Non filtrée'],
    ['Module filtré', data.filters.module ?? 'Tous'],
    ['Acteur filtré', data.filters.actorId ?? 'Tous'],
    ['Résultat filtré', data.filters.result ?? 'Tous'],
    ['Colonnes exclues', 'before, after, request_id, code d’erreur, données de boutique'],
    ['Nombre d’événements', String(data.rows.length)],
  ];
}

export const GLOBAL_EXPORT_COLUMNS: readonly string[] = ['Identifiant', 'Date UTC', 'Acteur (ID)', 'Module', 'Action', 'Entité', 'Résultat'];
