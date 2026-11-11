# Phase 1 · Recherche rapide enrichie, sous permissions

## Base validée

GitHub `main` `a64593b08e1dbd0adf22c5381565fe0916a5ce73`, run `43024089653` **completed success** : quatre jobs verts, artifact code présent mais **pas téléchargé/restauré depuis GitHub**. La page `/espace/recherche` avait déjà été testée sur PostgreSQL 16 en CI (boutiques autorisées et utilisateurs globaux). Ce nouveau lot ajoute ces mêmes catégories à la palette `Ctrl/Cmd+K` ; le résultat des précédents jobs ne prouve **pas** cette évolution.

## Code et sécurité

- `src/app/api/search/route.ts` : GET seulement, réponse `private, no-store` et `nosniff`, appelle `searchAuthorizedDirectory` avec le cookie de session ; sans session 401, requête invalide 400. Aucun identifiant utilisateur fourni par le navigateur ne définit les droits.
- `src/ui/directory-quick-search.tsx` remplace l'ancienne palette boutique (même ouverture clavier, recherche boutiques et lien « voir les résultats », fermeture Échap/focus), affiche **deux catégories** ; cinq résultats maximum par catégorie, aucun secret ni chiffre Jumia. `src/ui/app-shell.tsx` affiche la loupe à qui peut consulter des boutiques **ou** des utilisateurs globalement. Les autorisations réelles restent côté service (`listOwnShops`/RLS et `listAuthorizedUsers`/permission globale), pas dans les props UI.
- `tests/unit/app-shell.test.ts`, `tests/unit/auth-routes.test.ts`, `tests/e2e/authenticated-admin.spec.ts` couvrent commande clavier/focus, liens, recherche de compte, absence de loupe sans permission, refus API anonyme et accès API navigateur. Le scénario E2E du nouveau SHA n'est **pas exécuté localement**.
- `docs/guide-utilisateur.md` et `PROJECT_MEMORY/` actualisés. **Aucune migration**, aucune fonction métier supprimée, aucune IA/MIMI branchée.

## Tests du présent lot

Tests ciblés `app-shell` (10), `shop-catalog` (6), `auth-routes` (19) : **35/35** verts ; lint, typecheck et contrôle mémoire réussis. Le build local n'est pas validé car le clone dépend d'un lien vers les dépendances historiques et `npm ci` avait été tué par manque de ressources ; la suite complète Vitest et les E2E du **nouveau SHA** restent à confirmer en CI GitHub. Le run vert de `a64593b` concernait le lot précédent seulement.

## Suite

Publier le nouveau commit descendant sans force push ; vérifier la qualité/build, les migrations PG16, les E2E bureau/mobile (y compris la palette), et l'artifact du nouveau SHA. Télécharger/restaurer l'artifact si une conservation réellement vérifiée est souhaitée. Aucun backup chiffré hors serveur des données commerciales n'est configuré.
