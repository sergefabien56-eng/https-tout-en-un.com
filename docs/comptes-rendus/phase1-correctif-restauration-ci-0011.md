# Correctif CI — nombre de migrations dans la restauration

Le commit `3e41b85d19b99d12b613f726bc15287bb336bb45` est publié ; son [run 43490763384](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43490763384) est en échec : qualité verte ; migrations échouées à l'étape « Sauvegarder et restaurer dans une seconde base PostgreSQL CI » ; navigateur et archive non exécutés. L'application, la vérification des extensions, puis le rollback et la réapplication des migrations ont réussi dans ce job.

Cause probable : `scripts/test-backup-restore.mjs` exigeait un total figé de 10 migrations alors que la migration 0011 porte le total à 11. Les logs détaillés GitHub sont refusés par l'API (403), donc la cause précise n'est pas prouvée par ces logs. Le correctif compare le compte en base au nombre réel de fichiers versionnés `drizzle/*.up.sql` (et exige un compte non nul) ; les contrôles de restauration avant/après sont conservés. Aucun SQL de production ni donnée réelle manipulé.

Validation locale : syntaxe Node et lint ciblé, cohérence documentaire et comparaison des 11 paires SQL. La restauration sur PostgreSQL 16 réel n'a pas été exécutée localement ; la nouvelle CI est indispensable pour confirmer le diagnostic et la correction, puis exécuter le navigateur et l'archive. Ne pas passer au lot suivant tant que les quatre jobs ne sont pas verts.
