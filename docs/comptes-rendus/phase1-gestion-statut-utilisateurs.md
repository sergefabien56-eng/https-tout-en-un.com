# L10 — suspendre et réactiver un utilisateur existant

## Base vérifiée

GitHub `main=6ef965c5385d28e6daf60c8d0c69ef8775a1ef33` : [run `43314247752`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43314247752) completed success, quatre jobs verts (qualité/build, migrations PostgreSQL 16, navigateur bureau/mobile, archive CI). Ce run valide le lot compteurs Système et son correctif E2E ; le run rouge `43293637526` sur l'ancêtre `62fe694` reste rouge. Archive CI non téléchargée/restaurée ; aucune production.

## Portée du nouveau sous-lot

La fiche utilisateur permet à un titulaire de `users:write` **global** de suspendre/réactiver un autre compte actif ou suspendu ; l'API PATCH `/api/admin/users/[id]/status` vérifie Origin et double-submit CSRF avant mutation. Validation serveur de l'ID et du statut, refus de se modifier soi-même, de modifier un compte ayant un rôle Propriétaire, ou de transformer une invitation. Pas d'activation implicite par e-mail : SMTP/invitations restent hors lot. La suspension révoque toutes les sessions du compte dans la **même transaction** que la mise à jour de statut et la ligne d'audit avant/après ; réactivation ne restaure aucune session. Une opération idempotente n'écrit pas de faux audit. La liste/API de lecture existantes restent inchangées. Aucune migration, droit, RLS ou donnée commerciale ajoutée.

## Contrôles et limites

Snapshot du code avant `6ef965c` copié sous `/home/user/continuity-backups/`, SHA et bundle vérifiés. Local : TypeScript, lint ciblé, 7 tests unitaires ciblés et découverte 10 E2E OK ; test d'intégration de la suspension, de l'atomicité, des refus et de l'audit ajouté mais **non exécuté localement** (sandbox mémoire limitée) ; E2E du refus sans CSRF ajouté mais non exécuté localement. Build et CI du futur SHA non exécutés. Le statut de ce nouveau lot ne devient « validé » qu'après quatre jobs verts sur son propre SHA. Windows en pause ; pas de production ni sauvegarde PostgreSQL réelle restaurée.
