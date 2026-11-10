/**
 * Périmètre de boutiques — primitive d'autorisation utilisée par TOUS les repositories.
 * Référence : docs/architecture.md ADR-007 (trois lignes de défense).
 *
 * Aucune fonction de lecture ne peut être appelée sans un ShopScope : c'est le type
 * qui rend l'oubli du filtre boutique impossible à compiler.
 */
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';

/** Identifiant interne de boutique, transporté en chaîne décimale (BIGINT PostgreSQL). */
export type ShopId = string;

export interface ShopScope {
  readonly userId: string;
  readonly roleCodes: readonly string[];
  readonly allowedShopIds: readonly ShopId[];
  /** Vrai si l'utilisateur voit toutes les boutiques existantes (Propriétaire). */
  readonly unrestricted: boolean;
}

export type ShopSelection =
  | { readonly mode: 'all'; readonly shopIds: readonly ShopId[] }
  | { readonly mode: 'single'; readonly shopId: ShopId };

const SHOP_ID_PATTERN = /^\d{1,19}$/;

export function parseShopId(value: string): ShopId {
  if (!SHOP_ID_PATTERN.test(value)) {
    throw new ValidationError(
      'Boutique invalide.',
      `identifiant de boutique mal formé : "${value.slice(0, 32)}"`,
    );
  }
  return value;
}

export function createShopScope(input: {
  userId: string;
  roleCodes: readonly string[];
  allowedShopIds: readonly ShopId[];
  unrestricted?: boolean;
}): ShopScope {
  const allowed = [...new Set(input.allowedShopIds.map(parseShopId))];
  const unrestricted = input.unrestricted ?? false;
  if (!unrestricted && allowed.length === 0) {
    throw new ForbiddenError(
      "Votre compte n'est rattaché à aucune boutique. Contactez le propriétaire du compte.",
      `utilisateur ${input.userId} sans accès boutique`,
    );
  }
  return {
    userId: input.userId,
    roleCodes: Object.freeze([...input.roleCodes]),
    allowedShopIds: Object.freeze(allowed),
    unrestricted,
  };
}

export function canAccessShop(scope: ShopScope, shopId: ShopId): boolean {
  return scope.unrestricted || scope.allowedShopIds.includes(parseShopId(shopId));
}

export function assertShopAccess(scope: ShopScope, shopId: ShopId): ShopId {
  const id = parseShopId(shopId);
  if (!canAccessShop(scope, id)) {
    // Message volontairement identique à un cas « inexistant » : ne pas révéler l'existence
    // d'une boutique à un utilisateur qui n'y a pas droit.
    throw new ForbiddenError('Boutique introuvable ou non autorisée.', `shopId ${id} hors périmètre de ${scope.userId}`);
  }
  return id;
}

/**
 * Transforme la sélection d'interface (?shop=…) en sélection vérifiée.
 * Sans sélection : « toutes les boutiques autorisées » (jamais « toutes les boutiques »).
 */
export function resolveShopSelection(scope: ShopScope, requested?: string | null): ShopSelection {
  if (requested === undefined || requested === null || requested === '' || requested === 'all') {
    return { mode: 'all', shopIds: scope.allowedShopIds };
  }
  return { mode: 'single', shopId: assertShopAccess(scope, requested) };
}

/** Garde-fou pour les agrégats : interdit de sommer des boutiques hors périmètre. */
export function restrictToScope(scope: ShopScope, shopIds: readonly ShopId[]): ShopId[] {
  const filtered = shopIds.map(parseShopId).filter((id) => canAccessShop(scope, id));
  if (filtered.length === 0) {
    throw new ForbiddenError('Aucune boutique autorisée dans le périmètre demandé.');
  }
  return filtered;
}
