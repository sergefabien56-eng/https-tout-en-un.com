# Phase 1 · Administration : filtrer les utilisateurs par statut

## Base et portée

Suite au jalon v34 `0226bd0` (notifications actualisables manuellement), puis au jalon mémoire `bf706f1` (CI GitHub `43013341355` : success), et au commit local `8833d4c` (archive CI du code **non encore publiée**). Le présent lot poursuit L10 du plan Phase 1 ; aucun accès Jumia, aucune donnée réelle ni modification de schéma.

## Réalisation

- `src/modules/identity/user-list.ts` : filtre de statut `all` / `active` / `suspended` / `invited` validé et paramétré dans la requête SQL, combiné à la recherche existante. Toujours conditionné à la permission **globale** `users:read` ; pas de mot de passe, jeton ni secret dans le résultat.
- `src/app/api/admin/users/route.ts` : API accepte `status`, rejette les valeurs invalides avec 400 via service.
- `src/app/espace/utilisateurs/page.tsx` : sélecteur de statut accessible, filtres combinés ; liens de pagination conservant nom/e-mail et statut ; état vide honnête.
- `tests/integration/authorize-global.test.ts` : fixtures fictives des trois statuts, combinaison recherche/statut, refus invalides et accès non autorisé ; `tests/e2e/authenticated-admin.spec.ts` : scénarios API et navigateur bureau/mobile ajoutés mais **non exécutés localement** ; doivent passer en CI du prochain commit.
- `docs/guide-utilisateur.md` et `PROJECT_MEMORY/` : guide et reprise actualisés.

## Vérification locale

`node scripts/project-memory.mjs check`, `npm run lint`, `npm run typecheck`, `npm test` (**161/161**, dont 13 tests du fichier d'intégration globale), et `npm run build` ont réussi dans le clone descendant. Pas d'E2E authentifié local sur PostgreSQL réel pour ce lot. CI GitHub du nouveau commit et artifact du job d'archive **non encore vérifiés** ; ne pas présenter ce lot comme validé en production.

## À faire

Publier le descendant de `bf706f1` sans force push, vérifier les **quatre jobs CI** sur le nouveau SHA, les E2E dont le filtre UI, et télécharger/restaurer l'artifact code. Les sauvegardes chiffrées hors serveur des données commerciales restent à installer et tester séparément.
