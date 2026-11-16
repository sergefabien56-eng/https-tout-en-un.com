# Correctif CI — tests d'accès sans session

## Constat

Le lot XOF `ccf391239e953b39aca0a2e4a623ee882413e63b` a été publié. Le [run 43933906412](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43933906412) a réussi qualité et migrations PostgreSQL 16, mais le navigateur a échoué pour un test flaky ; l'archive a été sautée. La CI n'est donc pas validée.

L'empreinte SHA-256 de l'archive de trace fournie par le propriétaire correspond à l'empreinte de l'artifact du run. Lors de la première tentative du test bureau, la navigation initiale puis les onze requêtes d'API successives ont consommé l'essentiel du budget global de 30 secondes. La dernière navigation, vers l'apparence, était encore en cours lorsque le test a expiré. Les requêtes précédentes et leurs assertions avaient réussi ; la seconde tentative a réussi. La trace ne démontre pas la cause de ces latences ni une défaillance fonctionnelle de l'application. Ne pas partager la trace, qui peut contenir des données sensibles.

## Correction

Le scénario initial est découpé en trois tests indépendants : accès privé et apparence, exports système et paramètres, autres exports. Tous les chemins et toutes les assertions de refus 401, de redirection et d'absence de contenu privé sont conservés. Les limites de temps, retries et `failOnFlakyTests` ne sont pas modifiés. Le code applicatif et le schéma de données sont inchangés. Cette correction réduit le cumul des temps dans un même test sans garantir l'absence future de lenteurs ou de flakiness.

## Vérifications

Local : lint, TypeScript, build, contrôle de cohérence mémoire et 334 tests Vitest réussis ; audit bloquant high réussi (7 vulnérabilités modérées de développement, zéro en production). Playwright liste 18 tests sur les deux projets ; les parcours navigateur et PostgreSQL 16 ne sont pas exécutés localement et doivent être validés par les quatre jobs CI après publication. Aucun nouveau lot fonctionnel avant validation.
