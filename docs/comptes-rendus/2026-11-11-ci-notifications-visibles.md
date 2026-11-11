# Phase 1 — corriger le parcours CI des notifications visibles

## 1. Référence
v32 `1ad5a53`, run `43005587706` : code publié, lint/types/build/migrations PostgreSQL 16 verts, **job navigateur rouge comme souhaité** grâce à `failOnFlakyTests`. Annotation : « 1 flaky, 9 passed » ; première tentative bureau : le test cherchait la notification API n°6, absente des lignes alors visibles dans l’interface. Le retry a réussi. Lot accessibilité v31 non validé sans réserve.

## 2. Réalisation
Le test lit l’identifiant de la **première notification effectivement visible** dans le HTML, vérifie que cet identifiant figure dans la liste personnelle renvoyée par l’API, puis cible cette ligne par son identifiant stable pour cliquer, vérifier la réponse POST et constater la mutation côté serveur. Il ne suppose plus que le premier élément API et le premier élément de l’interface sont identiques à chaque instant. Le mécanisme CI `failOnFlakyTests` introduit en v32 est conservé ; aucun retry n’est masqué. Changement limité au parcours E2E, sans nouveau schéma ni modification de la logique métier.

## 3. Tests exécutés
Lint, TypeScript, **159/159 tests Vitest** réussis. Le build de production avait réussi sur v32 ; aucun composant de production n’a changé dans ce correctif. PostgreSQL 17 local jetable : migrations, rôle non BYPASSRLS, contrôle RLS, compte 2FA et boutique fictifs. Chromium réel sur ce build : **10/10 tests réussis sans retry**, bureau/mobile 375 px, audits clair/sombre et états interactifs inclus.

## 4. Limites
Le décalage ponctuel entre le premier élément API et la liste affichée est observé dans la CI, mais sa cause (navigation App Router/rafraîchissement ou timing) n’est pas formellement prouvée. Ce correctif garantit que l’action est faite sur une ligne visible et appartenant au compte, mais **ne prétend pas corriger un éventuel retard d’actualisation de l’interface**. La CI PostgreSQL 16 de ce correctif reste à exécuter après publication. Ni WCAG AA global ni déploiement réel ne sont revendiqués.

## 5. Validation attendue
Publier l’archive descendante de `1ad5a53` via GitHub Desktop sans force push ; vérifier les trois jobs et l’annotation **« 10 passed » sans « flaky »**. Si un retry se reproduit, la CI doit échouer et fournir les traces à examiner, non être déclarée conforme.

## 6. Suite
Après validation nette du navigateur, poursuivre les petits lots Phase 1 et étudier séparément la fraîcheur des notifications lors des navigations, avec un test dédié si elle pose problème à l’utilisateur.
