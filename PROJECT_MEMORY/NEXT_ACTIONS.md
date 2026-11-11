# Actions suivantes — corriger le tri boutiques (L10)

1. Contrôler diff/mémoire et validation `status=''` dans page/API, garder états inconnus 400/404, isolation RLS, filtres/pagination/tri sans perte. Snapshot avant correction `3fd31f8` vérifié hors dépôt. Types/lint, 27 tests unitaires ciblés et découverte 10 E2E OK ; PGlite/E2E non exécutés localement.
2. Commit descendant du SHA rouge `3fd31f8`, snapshot après exporté/vérifié hors sandbox et archive Desktop restaurable SHA/`git fsck`/arbre propre. Publication propriétaire normale sans force push. Vérifier **quatre jobs CI sur le nouveau SHA** ; si navigateur reste rouge, lire annotations et corriger sans supprimer tests. L'ancien run `43120844550` reste failure.
3. Après validation seulement, poursuivre L10 (administration réelle, boutiques, invitations seulement avec SMTP fiable, paramètres généraux à confirmer). L11 HTTPS/backup et L12 sécurité/démo requis avant fin P1.
4. Windows en pause explicite ; aucune vraie donnée avant sécurité, backup chiffré externe et restauration testée. GitHub/Drive/Arena ne sont pas production ni backup PostgreSQL.
