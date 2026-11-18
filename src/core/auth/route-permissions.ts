/** Source unique des permissions attendues par route API protégée.
 * Une route absente de cette table est publique (santé, connexion, CSRF) ou vérifiée
 * seulement par session (sessions, notifications personnelles, préférences).
 * Les tests de recette comparent cette table au contrôle réellement appliqué par chaque
 * route : toute divergence casse la CI plutôt que de passer inaperçue.
 */
export type RoutePermission = { method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; permission: string | null };

/** `null` = pas de permission métier : session valide exigée, ou route publique. */
export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  'admin/audit/global': { method: 'GET', permission: 'audit:read' },
  'admin/audit/global/export/csv': { method: 'GET', permission: 'audit:read' },
  'admin/audit/global/export/xlsx': { method: 'GET', permission: 'audit:read' },
  'admin/audit/global/export/pdf': { method: 'GET', permission: 'audit:read' },
  'admin/roles': { method: 'GET', permission: 'roles:manage' },
  'admin/roles/permission': { method: 'PUT', permission: 'roles:manage' },
  'admin/roles/export': { method: 'GET', permission: 'roles:manage' },
  'admin/roles/export/xlsx': { method: 'GET', permission: 'roles:manage' },
  'admin/roles/export/pdf': { method: 'GET', permission: 'roles:manage' },
  'admin/settings': { method: 'GET', permission: 'settings:read' },
  'admin/settings/organization-name': { method: 'PUT', permission: 'settings:manage' },
  // POST importe, DELETE retire. Les deux sont réservés au Propriétaire par le module,
  // qui contrôle le rôle au-delà de `settings:manage` (le Gestionnaire le possède aussi).
  'admin/settings/organization-logo': { method: 'POST', permission: 'settings:manage' },
  'admin/settings/reference-currency': { method: 'PUT', permission: 'settings:manage' },
  'admin/settings/export': { method: 'GET', permission: 'settings:read' },
  'admin/settings/export/xlsx': { method: 'GET', permission: 'settings:read' },
  'admin/settings/export/pdf': { method: 'GET', permission: 'settings:read' },
  'admin/system/export': { method: 'GET', permission: 'system:manage' },
  // Incidents : lecture paginée et acquittement. Le module exige EN PLUS le rôle global
  // `owner` : `system:manage` seul ne suffit pas à lire ni à acquitter un incident.
  'admin/system/incidents': { method: 'GET', permission: 'system:manage' },
  'admin/system/incidents/[id]/acknowledge': { method: 'POST', permission: 'system:manage' },
  'admin/system/export/xlsx': { method: 'GET', permission: 'system:manage' },
  'admin/system/export/pdf': { method: 'GET', permission: 'system:manage' },
  'admin/users': { method: 'GET', permission: 'users:read' },
  'admin/users/[id]': { method: 'GET', permission: 'users:read' },
  'admin/users/[id]/status': { method: 'PATCH', permission: 'users:write' },
  'admin/users/[id]/global-roles': { method: 'POST', permission: 'roles:manage' },
  'admin/users/[id]/shop-roles': { method: 'POST', permission: 'roles:manage' },
  // POST autorise une boutique à un rôle global ; DELETE révoque un accès indépendant.
  // La table ne retient qu'une méthode : c'est POST qui est déclaré, DELETE est vérifié
  // par le test de cohérence des exports (voir route-coverage.test.ts).
  'admin/users/[id]/shop-access': { method: 'POST', permission: 'roles:manage' },
  'admin/users/[id]/directory-access': { method: 'PUT', permission: 'roles:manage' },
  'admin/users/export': { method: 'GET', permission: 'users:read' },
  'admin/users/export/xlsx': { method: 'GET', permission: 'users:read' },
  'admin/users/export/pdf': { method: 'GET', permission: 'users:read' },
  'shops': { method: 'GET', permission: 'shops:read' },
  'shops/[shopId]': { method: 'GET', permission: 'shops:read' },
  'shops/[shopId]/members': { method: 'GET', permission: 'roles:manage' },
  'shops/[shopId]/audit': { method: 'GET', permission: 'audit:read' },
  'shops/[shopId]/audit/export': { method: 'GET', permission: 'audit:read' },
  'shops/[shopId]/audit/export/xlsx': { method: 'GET', permission: 'audit:read' },
  'shops/[shopId]/audit/export/pdf': { method: 'GET', permission: 'audit:read' },
  'shops/export': { method: 'GET', permission: 'shops:read' },
  'shops/export/xlsx': { method: 'GET', permission: 'shops:read' },
  'shops/export/pdf': { method: 'GET', permission: 'shops:read' },
  'search': { method: 'GET', permission: 'dashboard:read' },
  'preferences/shop': { method: 'POST', permission: 'shops:read' },
  // Image du logo commun : tout utilisateur connecté peut la voir. La modification passe
  // uniquement par admin/settings/organization-logo, réservé au Propriétaire.
  // Session seule : un membre limité à une boutique doit voir le logo commun.
  'organization/logo': { method: 'GET', permission: null },
  'notifications': { method: 'GET', permission: null },
  'notifications/[id]/read': { method: 'POST', permission: null },
  'auth/sessions': { method: 'GET', permission: null },
  'auth/sessions/[id]/revoke': { method: 'POST', permission: null },
  'auth/sessions/revoke-others': { method: 'POST', permission: null },
  'auth/me': { method: 'GET', permission: null },
  'auth/logout': { method: 'POST', permission: null },
  'auth/refresh': { method: 'POST', permission: null },
  'health': { method: 'GET', permission: null },
  'health/deep': { method: 'GET', permission: 'system:manage' },
  'auth/login': { method: 'POST', permission: null },
  'auth/csrf': { method: 'GET', permission: null },
};

/** Routes volontairement publiques : aucune session requise. */
export const PUBLIC_ROUTES: readonly string[] = ['auth/login', 'auth/csrf'];

/**
 * Pages hors API atteignables sans session. Toute autre page protégée redirige vers
 * `/connexion` via le layout `src/app/espace/layout.tsx` ; ces deux listes sont comparées
 * par la recette pour qu'une nouvelle page publique soit toujours un choix explicite.
 */
export const PUBLIC_PAGES: readonly string[] = ['/', '/connexion'];
