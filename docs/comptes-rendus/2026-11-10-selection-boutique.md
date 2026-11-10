# Phase 1 — recherche et préférence de boutique (L8, en cours)

## 1. Livré
- Recherche textuelle **côté PostgreSQL** dans les boutiques autorisées, filtre d’état et pagination de 50 ; paramètres validés et SQL paramétré. Le caractère `%` est traité comme un caractère littéral et ne peut élargir la recherche. Filtres conservés lors de la pagination.
- Bouton « Sélectionner » sur chaque boutique accessible : `POST /api/preferences/shop` exige Origin attendu, double-submit CSRF, session active, permission `shops:read`, accès boutique et boutique non supprimée, dans la transaction RLS. Un cookie HttpOnly/SameSite Strict/Secure en HTTPS mémorise l’identifiant ; le navigateur ne peut pas le fabriquer avec le bouton. Option « toutes » : retire la préférence après contrôle de session.
- À chaque chargement privé, le layout revalide côté serveur le cookie de préférence avant d’afficher son nom dans la barre supérieure. En cas de révocation, le libellé n’affiche plus cette boutique. Les pages métier restent tenues de vérifier leur propre périmètre ; la barre parle explicitement de « Préférence » et non d’une autorisation globale implicite.
- Le journal utilise cette préférence si aucun `?shop=` explicite n’est fourni. Un `?shop=` explicitement demandé passe toujours par son autorisation propre.

## 2. Tests exécutés
- Local : lint, typage, **137/137 tests** sur 18 fichiers, build. Test PGlite avec **107 boutiques fictives en test seulement** : pages 50/50/7 sans doublon et accès limité inchangé ; recherche, état et joker hostile ; sélection autorisée/refusée avec Origin/CSRF, cookie HttpOnly.
- Scénario Playwright ajouté en CI pour refuser une sélection inexistante et accepter « toutes » sur la base PostgreSQL jetable. **Pas encore exécuté pour ce lot.** Le dernier run publié `42922467941` (v11) est vert, sans ces changements.

## 3. Décisions
- Cette étape mémorise une **préférence vérifiée**, pas un droit réutilisable. Toute lecture et écriture métier devra revérifier boutique + permission côté serveur.
- Pas de connexion Jumia réelle. Les 107 boutiques n’existent que pendant un test PGlite, jamais en production.

## 4. Limites
- Pas encore de sélecteur déroulant directement dans la barre supérieure, de regroupement dynamique par plateforme/statut, ni de virtualisation côté navigateur ; la page boutiques comporte recherche, état et pagination. Le maintien de la préférence est assuré sur les pages privées, mais la propagation de `?shop=` sur six pages métier n’a pas de sens tant que ces pages n’existent pas.
- Pas de mesure navigateur démontrant `< 2 s` à 100 boutiques. Phase 1 non terminée ; aucune mise en ligne.

## 5. Vérification attendue
- Publier le prochain ZIP puis vérifier trois jobs, y compris sélection CSRF, migrations/RLS et navigateur connecté. Corriger tout échec avant validation.

## 6. Suite
- Dropdown accessible depuis la barre, recherche incrémentale, groupement et focus clavier ; couverture E2E avec vraies boutiques fictives uniquement en CI, puis export/journal et autres exigences Phase 1.
