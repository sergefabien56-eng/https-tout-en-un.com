/** Recette L10 : aucune route API ni page protégée ne doit exister sans être déclarée.
 * Ce test lit le système de fichiers, pas une liste recopiée à la main : ajouter une route
 * sans l'inscrire dans `route-permissions.ts` fait échouer la CI.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLIC_PAGES, PUBLIC_ROUTES, ROUTE_PERMISSIONS } from '@/core/auth/route-permissions';

const ROOT = process.cwd();
const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? walk(full) : [full];
});

const apiRoutes = walk(join(ROOT, 'src/app/api'))
  .filter((file) => file.endsWith('/route.ts'))
  .map((file) => file.slice(join(ROOT, 'src/app/api').length + 1).replace(/\/route\.ts$/, ''))
  .sort();

const pages = walk(join(ROOT, 'src/app'))
  .filter((file) => file.endsWith('/page.tsx') && !file.includes('/api/'))
  .map((file) => file.slice(join(ROOT, 'src/app').length + 1).replace(/\/?page\.tsx$/, ''))
  .map((path) => (path === '' ? '/' : `/${path}`))
  .sort();

describe('recette L10 — couverture déclarée des routes', () => {
  it('déclare exactement les routes API présentes dans le code', () => {
    expect(Object.keys(ROUTE_PERMISSIONS).sort()).toEqual(apiRoutes);
  });

  it('donne à chaque route une méthode en majuscules et une permission connue ou nulle', () => {
    for (const [route, entry] of Object.entries(ROUTE_PERMISSIONS)) {
      expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], route).toContain(entry.method);
      if (entry.permission !== null) expect(entry.permission, route).toMatch(/^[a-z]+:[a-z_]+$/);
    }
  });

  it('déclare une méthode réellement exportée par le fichier de route', () => {
    // Le test précédent compare les chemins. Il ne voyait pas qu'une route déclarée PUT
    // exportait en réalité POST ou PATCH : quatre routes vivaient avec une méthode fausse.
    // Ici on lit les exports du fichier et on exige que la méthode déclarée en fasse partie.
    for (const route of apiRoutes) {
      const source = readFileSync(join(ROOT, 'src/app/api', `${route}/route.ts`), 'utf8');
      const exported = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)/g)]
        .map((match) => match[1]!);
      // `auth/csrf` et `health` réexportent leur handler sous un autre nom : hors périmètre.
      if (exported.length === 0) continue;
      const declared = ROUTE_PERMISSIONS[route]?.method;
      expect(declared, route).toBeDefined();
      expect(exported, `${route} déclare ${declared} mais exporte ${exported.join(', ')}`)
        .toContain(declared);
    }
  });

  it('ne considère comme publiques que les routes explicitement listées', () => {
    const declaredPublic = Object.entries(ROUTE_PERMISSIONS)
      .filter(([, entry]) => entry.permission === null).map(([route]) => route).sort();
    // Les routes à permission nulle exigent une session : elles sont recensées ici
    // pour que toute nouvelle exception « sans permission » soit relue.
    expect(declaredPublic).toEqual([
      'auth/csrf', 'auth/login', 'auth/logout', 'auth/me', 'auth/refresh',
      'auth/sessions', 'auth/sessions/[id]/revoke', 'auth/sessions/revoke-others',
      'health', 'notifications', 'notifications/[id]/read',
    ]);
    expect(PUBLIC_ROUTES).toEqual(['auth/login', 'auth/csrf']);
    for (const route of PUBLIC_ROUTES) expect(ROUTE_PERMISSIONS[route]).toBeDefined();
  });

  it('n’expose comme pages publiques que celles listées', () => {
    expect(PUBLIC_PAGES).toEqual(['/', '/connexion']);
    for (const page of PUBLIC_PAGES) expect(pages, page).toContain(page);
  });

  it('protège toutes les pages de l’espace par le layout serveur', () => {
    const protectedPages = pages.filter((page) => page.startsWith('/espace'));
    expect(protectedPages.length).toBeGreaterThan(8);
    const layout = readFileSync(join(ROOT, 'src/app/espace/layout.tsx'), 'utf8');
    expect(layout).toMatch(/redirect\('\/connexion'\)/);
    expect(layout).toMatch(/toutenun_session/);
  });

  it('exige session + permission pour chaque route d’administration', () => {
    for (const route of apiRoutes.filter((name) => name.startsWith('admin/'))) {
      const source = readFileSync(join(ROOT, 'src/app/api', `${route}/route.ts`), 'utf8');
      // Chaque route d'administration délègue à un module serveur ; ce module, ou le
      // module dont il dépend directement, doit vérifier session et permission.
      const imported = [...source.matchAll(/from '(@\/(?:modules|core)\/[^']+)'/g)].map((m) => m[1]!);
      expect(imported.length, route).toBeGreaterThan(0);
      const guarded = imported.some((specifier) => {
        const modulePath = join(ROOT, 'src', `${specifier.replace('@/', '')}.ts`);
        const moduleSource = readFileSync(modulePath, 'utf8');
        if (/withAuthorizedGlobalTransaction|withAuthorizedShopTransaction|withIdentityTransaction/.test(moduleSource)) return true;
        // Dépendance directe (ex. PDF réutilisant le chargement autorisé du CSV).
        return [...moduleSource.matchAll(/from '(@\/[^']+)'/g)].some(([, dependency]) => {
          if (!dependency) return false;
          const depPath = join(ROOT, 'src', `${dependency.replace('@/', '')}.ts`);
          try {
            return /withAuthorizedGlobalTransaction|withAuthorizedShopTransaction|withIdentityTransaction/
              .test(readFileSync(depPath, 'utf8'));
          } catch { return false; }
        });
      });
      expect(guarded, route).toBe(true);
      expect(ROUTE_PERMISSIONS[route]?.permission, route).not.toBeNull();
    }
  });

  it('n’accepte aucune route d’écriture sans contrôle d’origine/CSRF', () => {
    const writes = apiRoutes.filter((route) => {
      const source = readFileSync(join(ROOT, 'src/app/api', `${route}/route.ts`), 'utf8');
      return /export async function (POST|PUT|PATCH|DELETE)/.test(source) && !route.startsWith('auth/');
    });
    expect(writes.length).toBeGreaterThan(8);
    for (const route of writes) {
      const source = readFileSync(join(ROOT, 'src/app/api', `${route}/route.ts`), 'utf8');
      expect(source, route).toMatch(/isAllowedOrigin|verifyCsrf|assertSameOrigin|checkOrigin/);
    }
  });
});
