# Phase 1 — rendre visibles les retries Playwright du lot accessibilité

## 1. Référence
v31 `cf83ae0`, run `43003798639` : commit sur `main`, trois jobs techniquement verts. **Mais** le navigateur indique « 1 flaky » et « 9 passed (1.7m) » : le parcours notifications bureau a expiré après 90 s à `page.waitForResponse` lors de sa première tentative, puis a réussi en retry. Ce résultat ne répond pas au critère « 10 passed sans flaky ».

## 2. Réalisation
Chaque notification rend désormais son identifiant déjà autorisé comme attribut `data-notification-id` afin que le test actionne la même notification que celle lue par l’API, plutôt que le premier élément visuel susceptible de différer. Le test attend une réponse POST de notification en **15 s**, vérifie l’URL et le statut 200 puis confirme le nouvel état en base. Si le POST n’a pas lieu, l’échec est plus rapide et les traces conservent le contexte. La configuration Playwright définit `failOnFlakyTests` en CI : un test qui passe seulement au retry **fait échouer le job**, ce qui déclenche le téléversement des traces existant dans le workflow. Aucun mécanisme de sécurité ou règle Axe n’est désactivé.

## 3. Tests exécutés
Lint, TypeScript, build et **159/159 tests Vitest** réussis. Base PostgreSQL 17 locale jetable, rôle sans BYPASSRLS et contrôle RLS. Sur le build de production en Chromium réel : **10/10 tests réussis sans retry**, bureau et mobile 375 px, avec le thème sombre et les dialogues du lot v31.

## 4. Limites
La cause exacte du retry intermittent observé dans la CI v31 n’a pas été prouvée faute de trace d’échec : le job était vert après retry et le workflow ne téléverse les traces que si le job échoue. Le ciblage par ID élimine l’ambiguïté entre les résultats API et le premier élément UI, mais seule la prochaine exécution CI PostgreSQL 16 permettra de juger sa stabilité. Un nouvel échec doit être analysé à partir des traces, **pas contourné**. Le reste de l’accessibilité n’est pas certifié WCAG AA ; pas de déploiement réel.

## 5. Validation attendue
Publier l’archive descendante de `cf83ae0` sans force push ; vérifier trois jobs verts et l’annotation **« 10 passed » sans « flaky »**. Si Playwright échoue, télécharger les traces du job navigateur et diagnostiquer la requête/notification avant toute nouvelle publication.

## 6. Suite
Reprendre les autres petits lots de Phase 1 après un run net ; maintenir un signal CI bloquant pour les tests flaky et une couverture progressive des interactions clavier et contrastes.
