/** Recherche rapide des événements dans UNE boutique sélectionnée et autorisée. */
import { AppError } from '@/core/errors/app-error';
import { listShopAudit, type AuditEntry } from '@/modules/audit/list-audit';

export interface AuthorizedAuditHits { audit: AuditEntry[]; auditShopId: string | null }

export async function searchAuthorizedAudit(token: string | undefined, q: string,
  selectedShop: string | undefined): Promise<AuthorizedAuditHits> {
  // « Toutes les boutiques » et cookie manipulé n'accordent jamais un périmètre multi-boutiques.
  if (!selectedShop || !/^[1-9]\d{0,18}$/.test(selectedShop) || BigInt(selectedShop) > 9_223_372_036_854_775_807n)
    return { audit: [], auditShopId: null };
  try {
    const { events } = await listShopAudit({ token, shopId: selectedShop, page: 1, q });
    return { audit: events.slice(0, 5), auditShopId: selectedShop };
  } catch (error) {
    // Droit d'audit retiré ou boutique plus autorisée : ne pas exposer le périmètre.
    if (error instanceof AppError && error.httpStatus === 403) return { audit: [], auditShopId: null };
    throw error;
  }
}
