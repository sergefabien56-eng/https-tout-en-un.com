# Phase 1 · Recherche limitée aux boutiques et comptes autorisés

## Référence et objectif

Base publiée `061a368b08333ce8a0f0b88f5504aa26c0f19d6a`, run `43021881652` **completed success** : quatre jobs verts (qualité/build, PostgreSQL 16, Playwright bureau/mobile, archive code). Artifact code présent dans Actions mais **pas téléchargé/restauré depuis GitHub**. L'objectif du présent lot est une page de recherche transversale **limitée** ; pas de données Jumia ni de recherche de commandes/produits.

## Changements

- `src/modules/identity/directory-search.ts` : requête de 2 à 80 caractères sans contrôle, boutiques via `listOwnShops` (RLS + permission + accès boutique), comptes via `listAuthorizedUsers` (permission **globale** `users:read`) ; aucune catégorie de comptes n'est exposée si 403 ; erreurs 401/500 non cachées ; 5 résultats maximum par catégorie ; aucun mot de passe, secret ou jeton renvoyé.
- `src/app/espace/recherche/page.tsx` : formulaire GET avec résultats groupés, liens de détail et accès aux listes complètes ; messages explicites pour état vide et modules absents. `src/ui/navigation.config.ts` : une entrée prête dans le groupe Tableau de bord, permission `dashboard:read`. La palette `Ctrl/Cmd+K` reste, volontairement, dédiée aux boutiques.
- `tests/integration/shop-catalog.test.ts` : tests RLS et permission sur rôles propriétaire/gestionnaire global/gestionnaire boutique, validation de saisie, absence de fuite. `tests/unit/navigation-config.test.ts` : menu sans doublon et route réelle. `tests/e2e/authenticated-admin.spec.ts` : parcours propriétaire UI et accessibilité **ajouté mais non exécuté localement** sur le nouveau SHA.
- `docs/guide-utilisateur.md` et `PROJECT_MEMORY/` mis à jour. Aucune migration SQL, aucun appel LLM/MIMI, aucune donnée commerciale.

## Tests et limites du sandbox

Contrôle mémoire, lint et typecheck OK ; tests ciblés (6 tests catalogue + 3 navigation) OK. Un lancement complet Vitest a obtenu **18 fichiers/20 verts, 153 tests passés/163**, mais deux workers (`auth-service` et un autre) ont été **tués par OOM** (confirmé dans `dmesg`) ; même avec `--maxWorkers=1`, la suite totale n'est pas verte localement. `auth-service` isolé a aussi été tué OOM ; `bootstrap-owner` isolé (3 tests) a réussi. Ces échecs ne prouvent pas un bug de la fonctionnalité, mais interdisent d'annoncer les 163 tests verts. Build local non réexécuté après l'incident npm/Next de ce sandbox. **La CI du nouveau SHA doit valider suite complète, build et E2E** avant de déclarer le lot validé.

La page n'est pas une recherche universelle : les utilisateurs sans droit global ne voient aucun résultat de compte, les résultats boutique restent limités par la RLS, et la palette rapide conserve son périmètre historique.
