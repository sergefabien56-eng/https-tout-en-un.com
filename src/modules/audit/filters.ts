import { z } from 'zod';
import { ValidationError } from '@/core/errors/app-error';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(`${s}T`);
});
export const auditFiltersSchema = z.object({
  q: z.string().max(80).refine((s) => [...s].every((c) => c.charCodeAt(0) >= 32)).optional(),
  module: z.string().regex(/^[a-z][a-z0-9_-]{0,49}$/).optional(),
  actorId: z.string().regex(/^[1-9]\d{0,17}$/).optional(),
  from: date.optional(),
  to: date.optional(),
});
export type AuditFilters = z.infer<typeof auditFiltersSchema>;
export function parseAuditFilters(value: unknown): AuditFilters {
  const parsed = auditFiltersSchema.safeParse(value);
  if (!parsed.success) throw new ValidationError('Filtres invalides.');
  const { from, to } = parsed.data;
  if (from && to && from > to) throw new ValidationError('Période invalide.');
  return parsed.data;
}

export function auditQueryParams(shopId: string, filters: AuditFilters): (string | null)[] {
  const end = filters.to ? new Date(Date.parse(`${filters.to}T00:00:00Z`) + 86_400_000).toISOString() : null;
  return [shopId, filters.module ?? null, filters.actorId ?? null,
    filters.from ? `${filters.from}T00:00:00Z` : null, end, filters.q?.trim() || null];
}
export const auditWhere = `shop_id = $1 AND ($2::text IS NULL OR module = $2)
  AND ($3::bigint IS NULL OR actor_user_id = $3)
  AND ($4::timestamptz IS NULL OR occurred_at >= $4)
  AND ($5::timestamptz IS NULL OR occurred_at < $5)
  AND ($6::text IS NULL OR position(lower($6) in lower(action)) > 0
    OR position(lower($6) in lower(module)) > 0)`;
