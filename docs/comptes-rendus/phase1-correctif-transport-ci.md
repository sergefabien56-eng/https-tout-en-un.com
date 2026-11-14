# Correctif de stabilité CI — transport API des tests navigateur

## Faits et limites

Le commit `14d046ec1c0d7b65c5c45ff1551a6841d942eb8f` est publié. [Run 43639821115](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43639821115) : qualité et PG16 verts, navigateur rouge (9 réussites, 1 flaky), archive du code sautée. La première tentative du test bureau a reçu `read ECONNRESET` sur un GET de notifications ; la seconde a passé, mais la CI refuse les tests instables. Les logs et traces contiennent des cookies de test ; ne pas les publier.

La trace montre environ 6,025 s entre la fin du GET API Playwright précédent et le début de celui en échec. Le client Playwright installé réutilise les connexions HTTP ; un [signalement amont](https://github.com/microsoft/playwright/issues/44007) décrit un problème similaire. C'est une **hypothèse plausible**, non une preuve de la cause réelle. Les logs contiennent aussi des erreurs d'accès sans session compatibles avec les tests publics exécutés en parallèle, sans preuve d'un lien avec le reset. Une tentative de reproduction avec serveur Node et blocage temporel n'a pas reproduit le reset ; elle ne tranche pas.

## Mesure ciblée et tests

Les appels API directs des scénarios Playwright envoient désormais `Connection: close` afin d'éviter la réutilisation d'un socket du client API. Le même contexte conserve cookies et paramètres (Origin/CSRF, corps, etc.) ; aucune requête n'est automatiquement rejouée, y compris les mutations. Les vrais appels du navigateur, le serveur, l'application et la base ne sont pas modifiés. Les assertions et `failOnFlakyTests` restent stricts ; cette mesure ne prétend pas résoudre toutes les causes possibles d'ECONNRESET et ne prouve pas la cause du run initial.

Trois tests locaux avec un serveur fictif reproduisent un reset **artificiellement déclenché sur socket réutilisé**, puis vérifient connexions distinctes, cookies, en-têtes, corps, statut 403, mutation exécutée une fois et absence de retry après reset. Ce test ciblé ne reproduit pas à lui seul les conditions CI réelles.

238 Vitest, lint, types et build OK ; audit npm `--audit-level=high` OK, 7 modérées signalées. 10 Playwright listés, navigateur réel et PostgreSQL 16 réel du nouveau SHA non exécutés localement ; vérifier les quatre jobs CI après publication et continuer l'investigation si l'erreur persiste. Phase 1 et L10 incomplets, installation Windows en pause.
