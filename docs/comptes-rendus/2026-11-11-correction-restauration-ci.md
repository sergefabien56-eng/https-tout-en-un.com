# Phase 1 — correction du test de restauration CI

## 1. Constat
- Run v16 `42930875865` : **échec**. Qualité réussie ; migrations appliquées puis étape de restauration échouée ; navigateur ignoré.
- Journal fourni par l’utilisateur : `pg_restore: ERROR: unrecognized configuration parameter "transaction_timeout"`, émis par `SET transaction_timeout = 0`. L'archive générée par une version de client plus récente n'est pas compatible avec le serveur **PostgreSQL 16** de la CI.

## 2. Correction
- Le script utilise désormais `pg_dump` et `pg_restore` **depuis l'image officielle `postgres:16`**, via Docker sur le runner, avec accès réseau local au service PostgreSQL 16. Il monte seulement le dossier temporaire du dump, exécute les outils sous l'UID/GID du runner et transmet le mot de passe via variable d'environnement non incluse dans la ligne de commande.
- Le restore continue avec `--exit-on-error`, sur une **seconde base indépendante**. Aucun `SET` n'est supprimé et aucune erreur n'est ignorée. Les messages d'échec du script n'impriment ni dump ni SQL du restore. Timeout du job augmenté à 15 minutes pour un éventuel chargement de l'image.

## 3. Vérifications locales
- `node --check` : succès. Exécution sans `CI` : refus avant accès DB (exit 1).
- La base PostgreSQL native et Docker ne sont pas disponibles ici : **la correction n'a pas encore exécuté une restauration**. Le test devra tourner après publication en CI.

## 4. Limites
- La restauration CI reste effectuée sur une base jetable fictive et une archive temporaire non chiffrée ; pas une sauvegarde de production chiffrée et hors serveur. Phase 1 non terminée.

## 5. Vérification attendue
- Publier le prochain paquet ; contrôler les trois jobs et spécifiquement l'étape « Sauvegarder et restaurer dans une seconde base PostgreSQL CI ». Corriger tout nouvel échec sans contourner l'intégrité.

## 6. Suite
- Après succès constaté, concevoir le mécanisme de production chiffré et externalisé, puis valider une vraie restauration sur staging distinct.
