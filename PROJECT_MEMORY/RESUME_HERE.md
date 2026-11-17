# Reprendre ici — export du journal global propriétaire

Base publiée `84db68b5a90803e37968151a981d18942a05cfa8`, [CI 44102180390](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/44102180390) : quatre jobs verts (qualité, PostgreSQL 16 réel, navigateurs bureau/mobile, archive). Artéfact visible, non restauré.

**Nouveau lot local, non publié et non couvert par cette CI** : export du journal global (`docs/comptes-rendus/phase1-export-journal-global.md`). Trois routes `GET /api/admin/audit/global/export/{csv,xlsx,pdf}` + liens filtrés sur `/espace/journal/global`. Conditions cumulées : session active, `owner` global, `reports:export` global, RLS active et policy `audit_global_owner_read` présente (sinon 503, jamais de fichier vide trompeur), `shop_id IS NULL` uniquement, sans before/after/request_id. 378 Vitest verts, lint/types/build verts, PostgreSQL 17 réel sous rôle non-BYPASSRLS avec téléchargements réels 200.

Cycle en cours : snapshot avant déjà pris (`.project-backups/…-avant-journal-global-export-84db68b5a908`) → commit + snapshot après → ZIP Arena → publication par le propriétaire sans force → lien CI immédiat → quatre jobs verts avant tout autre lot. PostgreSQL 16 et la suite navigateur du nouveau SHA restent à valider par la CI.

Lire aussi `NEXT_ACTIONS.md` et `AI_HANDOVER.md`. L10 et phase 1 incomplets : invitations et SMTP réels, surveillance et alertes critiques propriétaire, règles XOF, recette, déploiement et sauvegarde PostgreSQL testée. Windows en pause. Aucun secret ; archive code ≠ sauvegarde DB.
