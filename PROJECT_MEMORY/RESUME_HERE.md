# Reprendre ici — Phase 1, interface et administration L10

## État GitHub vérifié

GitHub `main` = `cc0335dae85935fba4bb2358a26d8a79ce29f56e` au dernier contrôle. [Run `43290713784`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43290713784) **completed success** : qualité/tests/build, migrations PostgreSQL 16, navigateur bureau/mobile, archive CI, quatre jobs verts. Les sous-lots Paramètres `68bac8b` et export rôles `cc0335d` sont donc publiés et validés en CI. Dernier SHA vert `cc0335d`. Archive CI présente mais non téléchargée/restaurée ; aucune production ni installation PC.

## Nouveau sous-lot local L10 — Système

Compteurs d'événements globaux enregistrés, critiques et avertissements non acquittés ; API deep et écran propriétaire alignés, requête `shop_id IS NULL` et RLS, aucun message ni événement boutique exposé. Aucun collecteur d'erreurs/tâches livré : zéro n'est pas présenté comme santé OK. Voir `docs/comptes-rendus/phase1-compteurs-systeme.md`. TypeScript, lint ciblé, 6 tests unitaires ciblés, découverte 10 E2E, mémoire/diff OK ; test d'intégration ajouté mais non exécuté localement (mémoire sandbox), build/E2E/CI du futur SHA en attente. Snapshot avant sur `cc0335d` vérifié hors dépôt. Suivre le protocole code → archive → publication propriétaire → quatre jobs du futur SHA avant prochain lot.

## Suite du chantier

Le propriétaire souhaite finir les **vrais critères Interface et administration L10** sans menu de micro-améliorations. Lire `docs/phase-1-plan.md`, `NEXT_ACTIONS.md`, comparer Git/code/docs et avancer sur le prochain critère faisable sans secrets. La vue cartes réduites/dépliées est publiée et validée en CI, avec tableau/filtres/tri/pagination conservés, boutiques autorisées uniquement, agrégats indisponibles signalés par « — ». Le plan global L10/Phase 1 reste incomplet (notamment invitations liées à SMTP fiable, paramètres administratifs et autres critères ; puis HTTPS, restauration chiffrée réelle, sécurité/démo). Ne pas confondre CI et production.

La maquette `/home/user/maquette-interactive-phase1.html` est fictive ; l’ancien aperçu réel sur données fictives a été arrêté et détruit. Windows/WSL/Docker **en pause à la demande du propriétaire** ; aucune installation PC, donnée réelle, sauvegarde PostgreSQL réelle restaurée ni production. Préserver l’ancien dépôt divergent `/home/user` sans reset/clean/force push.

**Reprise** : « Lis `RESUME_HERE.md` et `AI_HANDOVER.md`, vérifie `main=cc0335d` / run `43290713784` quatre jobs verts. Termine le lot Système local : commit, archive privée au propriétaire, puis attends sa publication et la CI du nouveau SHA avant tout autre lot L10. Windows en pause ; pas de production. »
