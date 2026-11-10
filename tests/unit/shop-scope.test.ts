import { describe, expect, it } from 'vitest';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';
import {
  assertShopAccess,
  canAccessShop,
  createShopScope,
  resolveShopSelection,
  restrictToScope,
} from '@/core/db/shop-scope';

const scope = createShopScope({
  userId: 'user-1',
  roleCodes: ['manager'],
  allowedShopIds: ['1', '2'],
});

describe('périmètre de boutiques — isolation côté serveur', () => {
  it('autorise une boutique du périmètre et refuse une autre', () => {
    expect(canAccessShop(scope, '1')).toBe(true);
    expect(canAccessShop(scope, '3')).toBe(false);
    expect(() => assertShopAccess(scope, '3')).toThrow(ForbiddenError);
  });

  it('renvoie le même message pour une boutique interdite (ne révèle pas son existence)', () => {
    expect(() => assertShopAccess(scope, '3')).toThrow('Boutique introuvable ou non autorisée.');
  });

  it('sans sélection, « toutes les boutiques » signiﬁe toutes les boutiques AUTORISÉES', () => {
    expect(resolveShopSelection(scope, null)).toEqual({ mode: 'all', shopIds: ['1', '2'] });
    expect(resolveShopSelection(scope, 'all')).toEqual({ mode: 'all', shopIds: ['1', '2'] });
  });

  it('résout une sélection explicite et la valide', () => {
    expect(resolveShopSelection(scope, '2')).toEqual({ mode: 'single', shopId: '2' });
    expect(() => resolveShopSelection(scope, '9')).toThrow(ForbiddenError);
  });

  it('un propriétaire non restreint accède à toute boutique', () => {
    const owner = createShopScope({ userId: 'owner', roleCodes: ['owner'], allowedShopIds: [], unrestricted: true });
    expect(canAccessShop(owner, '42')).toBe(true);
  });

  it('refuse la création d’un périmètre vide (compte non rattaché)', () => {
    expect(() => createShopScope({ userId: 'x', roleCodes: ['assistant'], allowedShopIds: [] })).toThrow(ForbiddenError);
  });

  it('rejette un identifiant de boutique mal formé au lieu de l’interpréter', () => {
    expect(() => assertShopAccess(scope, '1;drop table shops')).toThrow(ValidationError);
    expect(() => assertShopAccess(scope, '1.5')).toThrow(ValidationError);
  });

  it('dédoublonne les accès et interdit d’élargir un périmètre par une liste', () => {
    const dup = createShopScope({ userId: 'u', roleCodes: ['manager'], allowedShopIds: ['1', '1', '2'] });
    expect(dup.allowedShopIds).toEqual(['1', '2']);
    expect(restrictToScope(scope, ['1', '3', '2'])).toEqual(['1', '2']);
    expect(() => restrictToScope(scope, ['3'])).toThrow(ForbiddenError);
  });
});
