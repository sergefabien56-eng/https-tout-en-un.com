/** Recherche P1 bornée aux boutiques autorisées et, si permis globalement, aux comptes. */
import { AppError, ValidationError } from '@/core/errors/app-error';
import { listOwnShops, type ShopSummary } from '@/modules/identity/shop-catalog';
import { listAuthorizedUsers, type UserSummary } from '@/modules/identity/user-list';

export interface DirectorySearchResult {
  shops: ShopSummary[];
  users: UserSummary[];
}

export async function searchAuthorizedDirectory(token: string | undefined, query: string): Promise<DirectorySearchResult> {
  if (typeof query !== 'string' || query.length > 80 || [...query].some((char) => char.charCodeAt(0) < 32))
    throw new ValidationError('Recherche invalide.');
  const q = query.trim();
  if (q.length < 2) throw new ValidationError('Saisissez au moins deux caractères.');
  // Le catalogue applique permission + RLS ; la liste des comptes exige users:read GLOBAL.
  // Une absence de ce droit cache la catégorie utilisateurs, sans cacher les boutiques.
  const shops = (await listOwnShops(token, 1, { q })).shops.slice(0, 5);
  let users: UserSummary[] = [];
  try { users = (await listAuthorizedUsers(token, 1, q)).users.slice(0, 5); }
  catch (error) {
    if (!(error instanceof AppError && error.httpStatus === 403)) throw error;
  }
  return { shops, users };
}
