# Correctif CI — parcours boutiques, journal et sessions

## Constat vérifié
La base `1005473a1e990d5c88fef4b0d1e24db5ff1c0a6e` est publiée mais [run 43757504110](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43757504110) rouge : qualité et migrations PostgreSQL 16 vertes, navigateur rouge (11 passés, un échec bureau), archive de code sautée.

L'artifact `e2e-traces` fourni par le propriétaire correspond à l'empreinte SHA-256 affichée par GitHub. Les deux traces montrent l'accumulation de navigations, appels et assertions d'un scénario de 120 s. Première tentative : la navigation sur l'accueil des sessions intervient à environ 118 s et le clic vers les sessions autour de 120 s. Retry : le plafond est également atteint en fin de parcours, autour de 120 s. Cela explique les erreurs finales, sans prouver que le clic ou une requête individuelle ont pris deux minutes ni exclure d'autres instabilités. Les traces et captures potentiellement sensibles ne sont pas incluses dans le dépôt ou le ZIP.

## Correctif
Le parcours est scindé en deux tests indépendants : boutiques/apparence/recherche, puis journal/sessions. Le second crée sa session, sélectionne la boutique de test et configure le thème requis, sans dépendre de l'ordre ni d'une session partagée. Les assertions préexistantes, les clics réels et les contrôles de sécurité demeurent. Aucun changement du code métier, aucun nouveau retry caché : limite de 120 s par scénario, délais individuels et `failOnFlakyTests` conservés.

Quatre scénarios authentifiés × deux formats × deux essais possibles requièrent 16 codes fictifs uniques. Le bootstrap normal conserve ses dix codes ; le script limité à CI/staging/base locale jetable ajoute maintenant six codes, sans les journaliser, et la CI nettoie toujours le fichier. Seize indices sont testés ; la requête SQL d'ajout et le refus du deuxième passage sont vérifiés sur PGlite. La limite de dix tentatives de connexion par adresse et par fenêtre n'est pas affaiblie : avec plusieurs retries rapprochés elle peut bloquer des connexions et provoquer un échec CI, qui doit être diagnostiqué.

## Vérifications et livraison
291 Vitest, lint, types, build, cohérence et audit high réussis ; 7 vulnérabilités modérées, audit production sans vulnérabilité. 14 scénarios Playwright listés ; le navigateur authentifié, le script et PostgreSQL 16 réels de ce nouveau commit n'ont pas été exécutés localement. Le découpage est étayé par les traces, mais son efficacité et l'absence d'autres causes doivent être confirmées par les quatre jobs CI.

ZIP Arena → publication sans force → lien CI immédiatement à « publié » → vérifier les quatre jobs avant tout autre lot. La validation du PDF boutiques et du correctif attend ce nouveau run ; L10 et Phase 1 restent incomplets, Windows en pause.
