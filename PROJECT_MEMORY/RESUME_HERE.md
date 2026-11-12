# Reprendre ici — Phase 1, interface et administration L10

## État GitHub vérifié

GitHub `main` = `e6f087dac64683c56ee56f352f4f2039b62349a7`. [Run `43274481957`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43274481957) **completed success** sur ce SHA : quatre jobs réussis (lint/types/tests/build ; migrations PostgreSQL 16 ; navigateur bureau et mobile 375 px ; archive du code validé). Le correctif E2E du refus du mode boutiques invalide est donc validé en CI. Run précédent `43272897889` de `4be5473` reste **failure** ; ne pas le requalifier. L’archive CI n’a pas été téléchargée/restaurée ; archive Desktop et snapshot du SHA `e6f087d` vérifiés sous `/home/user/` (ne sauvegardent pas de données réelles).

## Nouveau sous-lot L10 en travail local (non publié / non validé CI)

Page Paramètres de l’organisation et API bornée au fuseau de référence, lecture `settings:read` globale, écriture `settings:manage` globale avec Origin/CSRF et audit transactionnel. Devise, SMTP et intégration du fuseau aux traitements restent indisponibles explicitement. Voir `docs/comptes-rendus/phase1-parametres-organisation.md`. Base publiée/validée = `e6f087d` ; commit documentaire `e4d3705` est local uniquement. TypeScript, lint ciblé, 3 tests nav et découverte 10 E2E OK ; intégration PGlite ajoutée mais son worker a été tué localement (mémoire), build/E2E PG16 et CI du futur SHA non effectués. Snapshot avant `e4d3705` vérifié hors dépôt. Suite : revoir le diff, valider avec CI du nouveau SHA avant de déclarer ce lot validé.

## Suite du chantier

Le propriétaire souhaite finir les **vrais critères Interface et administration L10** sans menu de micro-améliorations. Lire `docs/phase-1-plan.md`, `NEXT_ACTIONS.md`, comparer Git/code/docs et avancer sur le prochain critère faisable sans secrets. La vue cartes réduites/dépliées est publiée et validée en CI, avec tableau/filtres/tri/pagination conservés, boutiques autorisées uniquement, agrégats indisponibles signalés par « — ». Le plan global L10/Phase 1 reste incomplet (notamment invitations liées à SMTP fiable, paramètres administratifs et autres critères ; puis HTTPS, restauration chiffrée réelle, sécurité/démo). Ne pas confondre CI et production.

La maquette `/home/user/maquette-interactive-phase1.html` est fictive ; l’ancien aperçu réel sur données fictives a été arrêté et détruit. Windows/WSL/Docker **en pause à la demande du propriétaire** ; aucune installation PC, donnée réelle, sauvegarde PostgreSQL réelle restaurée ni production. Préserver l’ancien dépôt divergent `/home/user` sans reset/clean/force push.

**Reprise** : « Lis `RESUME_HERE.md` et `AI_HANDOVER.md`, vérifie GitHub/main et les quatre jobs du run `43274481957` sur `e6f087d`, puis poursuis les critères L10 du plan sans menus de micro-améliorations. Windows en pause ; pas de production. »
