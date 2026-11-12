# Reprendre ici — Phase 1 L10, export boutiques

## GitHub vérifié

`main=1dd5c4fa974dacf701b67c4ef18583877b0331e4`, [run `43316483281`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43316483281) **completed success**, quatre jobs verts : qualité/tests/build, migrations PostgreSQL 16, navigateur bureau/mobile, archive CI. Gestion du statut utilisateurs validée en CI ; archive CI non restaurée, aucune production ni installation PC.

## Nouveau lot local L10

Export CSV de toutes les pages « boutiques » filtrées/triées, limité aux boutiques visibles sous RLS et possédant `reports:export` global/boutique ; 10 000 lignes max, métadonnées périmètre/date/filtre/tri et cellules neutralisées, agrégats indisponibles « — ». Aucun code Jumia ni schéma/RLS modifié. Voir `docs/comptes-rendus/phase1-export-boutiques.md`. Snapshot avant sur `1dd5c4f` vérifié sous `/home/user/continuity-backups/`. TypeScript/lint ciblé/7 tests unitaires ciblés/découverte 10 E2E/mémoire/diff OK ; tests d'intégration RLS et E2E du nouveau SHA ajoutés mais non exécutés localement. Suite : commit, snapshot après, archive GitHub Desktop vérifiée et livrée via Drive privé au propriétaire ; il publie, nous contrôlons **les quatre jobs CI avant le lot suivant**.

## Cadre

Le propriétaire veut finir L10 puis lancer MIMI. Le moment exact de MIMI relativement à L11/L12 reste à clarifier avant ce changement de phase : MIMI est hors P1 et finir L10 ne termine pas P1. Cycle voulu : code → archive au propriétaire → il publie → CI contrôlée → lot suivant. Ne pas empiler de lots non validés ni proposer de menu de micro-améliorations. Windows/WSL/Docker en pause ; aucune vraie donnée/production, installation PC ni sauvegarde PostgreSQL réelle restaurée. Maquette fictive distincte. Préserver ancien dépôt divergent `/home/user`.

**Reprise** : « Lis `RESUME_HERE.md`, `AI_HANDOVER.md`, `NEXT_ACTIONS.md`, compare Git/code/CI/docs. `1dd5c4f` validé en CI ; export boutiques local à committer/livrer, puis attendre CI du nouveau SHA. Windows en pause. »
