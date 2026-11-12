# Reprendre ici — Phase 1 L10, statut utilisateurs

## GitHub vérifié

`main=6ef965c5385d28e6daf60c8d0c69ef8775a1ef33`, [run `43314247752`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43314247752) **completed success**, quatre jobs verts : qualité/tests/build, migrations PG16, navigateur bureau/mobile, archive CI. Le lot Système et son correctif sont donc validés en CI ; l'ancien run rouge `43293637526` du SHA `62fe694` reste rouge. Archive CI non restaurée, aucune production/installation PC.

## Nouveau lot local L10 (CI en attente)

Gestion du statut d'un autre compte actif/suspendu sur la fiche utilisateur : droit `users:write` global, Origin+CSRF, refus soi/Propriétaire/invitation, sessions révoquées à la suspension dans la même transaction que mise à jour et audit. Aucun envoi SMTP ni activation d'invitation. Voir `docs/comptes-rendus/phase1-gestion-statut-utilisateurs.md`. Snapshot avant sur `6ef965c` vérifié hors dépôt. Types/lint ciblé, 7 tests unitaires ciblés, découverte 10 E2E, mémoire/diff OK ; intégration PG16 et E2E du futur SHA non exécutés localement. Suite : relire diff, commit descendant, snapshot après/ZIP GitHub Desktop vérifiés et transfert privé Drive ; propriétaire publie puis vérifier **quatre jobs du nouveau SHA avant autre lot**.

## Cadre

Le propriétaire veut le cycle code → archive envoyée → il publie → nous vérifions CI → lot suivant, sans empiler des lots non validés ou proposer un menu de micro-améliorations. L10/P1 incomplets (SMTP/invitations, devise à décider, autres exports, critères restants ; puis HTTPS/restauration chiffrée réelle, sécurité/démo). Windows/WSL/Docker en pause ; aucune installation PC, vraie donnée, sauvegarde PostgreSQL réelle restaurée ni production. Maquette autonome fictive distincte. Préserver ancien dépôt divergent `/home/user` sans reset/clean/force push.

**Reprise** : « Lis `RESUME_HERE.md`, `AI_HANDOVER.md` et `NEXT_ACTIONS.md`, compare Git/code/CI/docs. `6ef965c` est publié avec quatre jobs verts ; statut utilisateurs en travail local à committer/livrer, CI du futur SHA obligatoire. Windows en pause. »
