# Reprendre ici — correctif CI rôles globaux

## GitHub et CI

`3e41b85d19b99d12b613f726bc15287bb336bb45` est publié ; [run `43490763384`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43490763384) completed failure : qualité verte, job migrations échoué à l'étape sauvegarde/restauration, navigateur et archive skipped. La dernière base aux quatre jobs verts reste `2572013` run `43487610108`.

## Correctif préparé

`scripts/test-backup-restore.mjs` exigeait 10 migrations alors que 0011 porte le total à 11 ; cause **probable** de l'échec de restauration, logs détaillés refusés par GitHub (403). Le correctif compare au nombre réel des fichiers up versionnés et conserve la comparaison des données/policies restaurées. Voir `docs/comptes-rendus/phase1-correctif-restauration-ci-0011.md`. Tests locaux et publication de ce correctif ne prouvent pas la restauration PG16 : vérifier les **quatre jobs de son propre SHA** après publication.

Cycle : snapshot → ZIP Drive privé → publication propriétaire sans force → quatre jobs CI avant tout lot suivant. Lire `AI_HANDOVER.md`, `PROJECT_STATUS.md`, `NEXT_ACTIONS.md` et comparer code et plan. Ensuite seulement : accès des comptes à rôle global (409). Phase 1 non terminée, Windows en pause, aucun secret ni donnée réelle.

Maquette générale interactive fictive : `/home/user/maquette-generale-tout-en-un.html`, séparée du code applicatif ; elle n'implémente ni Jumia ni MIMI.
