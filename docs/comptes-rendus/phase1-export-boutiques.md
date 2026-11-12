# L10 — export CSV des boutiques autorisées

## Base vérifiée

GitHub `main=1dd5c4fa974dacf701b67c4ef18583877b0331e4`, [run `43316483281`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43316483281) **completed success**, quatre jobs verts (qualité/build, migrations PostgreSQL 16, navigateur bureau/mobile, archive CI). Ceci valide la gestion du statut utilisateurs **en CI**, sans prouver une production. Archive CI non restaurée.

## Portée du nouveau sous-lot

Sur « Toutes les boutiques », export CSV des boutiques **visibles via la même RLS** que la liste et **exportables selon `reports:export` global ou lié à cette boutique**. Un rôle boutique ne donne aucun droit d'export sur une autre boutique. Filtres recherche/statut et tri whitelist identiques à la liste, toutes les pages jusqu'à 10 000 lignes ; au-delà, erreur explicite. CSV BOM, cellule neutralisée contre les formules, en-tête périmètre/date UTC/filtres/tri, colonnes ID/nom/pays/devise/état et agrégats « — » (aucune donnée Jumia). Aucun identifiant Jumia ni secret exporté. Le lien n'est proposé qu'aux détenteurs d'un droit d'export ; la route revérifie serveur/RLS. Aucune migration, RLS ou permission modifiée, tableau/cartes et pagination préservés.

## Vérifications et limites

Snapshot avant `1dd5c4f` exporté hors dépôt sous `/home/user/continuity-backups/`, empreintes et bundle vérifiés. Local : TypeScript, lint ciblé, 7 tests unitaires ciblés et découverte 10 E2E OK. Test d'intégration RLS/droits/CSV hostile et E2E export bureau/mobile ajoutés mais **non exécutés localement** ; build et CI du futur SHA attendus. Le CSV est le format livré ici, pas Excel/PDF. Windows reste en pause ; aucune production ni donnée commerciale réelle.
