# Phase 1 · Administration : filtre par rôle attribué

## Base vérifiée

`d1d40888c63100e2372c846f63b2e714ae839a53` est publié sur GitHub `main`, run `43018013858` terminé **success** : qualité, migrations PostgreSQL 16, navigateur bureau/mobile, archive du code. Un artifact `code-valide-d1d40888c63100e2372c846f63b2e714ae839a53` apparaît dans le run, expiration annoncée 2026-12-11 UTC. **La restauration du fichier téléchargé depuis GitHub n'a pas été réalisée** : la présence de l'artifact n'en fait pas un backup de données de production.

## Travail du présent lot

La page `/espace/utilisateurs` permet maintenant de filtrer les comptes par rôle système attribué (`owner`, `manager`, `stock_manager`, `accountant`, `assistant`) en plus du statut et de la recherche nom/e-mail. Les rôles globaux et limités à une boutique sont inclus ; aucun utilisateur sans rôle ne correspond au filtre. Les trois paramètres survivent à la pagination. L'API `/api/admin/users?role=...` valide le rôle ; la requête SQL paramétrée utilise `EXISTS`, donc les attributions multiples ne dupliquent pas les comptes. L'autorisation **globale** `users:read` demeure impérative, et aucune donnée sensible n'est renvoyée.

Fichiers : `src/modules/identity/user-list.ts`, `src/app/api/admin/users/route.ts`, `src/app/espace/utilisateurs/page.tsx`, `tests/integration/authorize-global.test.ts`, `tests/e2e/authenticated-admin.spec.ts`, `docs/guide-utilisateur.md`, `PROJECT_MEMORY/`. Aucune migration SQL ni connexion Jumia ajoutée.

## Tests et limite de validation

Contrôle des rôles (global/boutique), cas sans résultat, injection/refus, session absente, comptes multi-rôles non dupliqués et pagination combinée en intégration PGlite. Les scénarios Playwright API/UI bureau/mobile ont été **ajoutés mais pas encore exécutés sur le présent SHA**. Tests locaux : contrôle mémoire, lint, typage et **162/162 Vitest** verts (14 tests d’intégration globale). Build local **non validé** : un build avec dépendances symlinkées a échoué sur la résolution de modules Next.js présents sur disque ; une tentative de `npm ci` dans ce sandbox a expiré puis a été tuée (code 137) faute de ressources. Aucun échec TypeScript, lint ou Vitest attribué au lot. La CI sur le nouveau SHA devra valider le build réel et les E2E. La réussite GitHub des quatre jobs ne concerne que `d1d4088` avant cette modification ; vérifier une nouvelle CI après publication de ce lot.
