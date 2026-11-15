# Statut — Phase 1

- Base `d80d1955d9c1c1d3ca56edaf582f034fd67739bb` publiée ; [run 43755748145](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43755748145) quatre jobs verts, dont navigateur et PostgreSQL 16 ; artifact non restauré.
- Lot L10 local : PDF des boutiques, mêmes filtres/tri, RLS et droits que CSV/Excel ; bornes et limites documentées. 290 Vitest/lint/types/build/audit high OK (7 modérées), PDF fictifs vérifiés ; navigateur et PostgreSQL 16 réels à vérifier en CI (12 E2E listés). Voir `docs/comptes-rendus/phase1-export-pdf-boutiques.md`.
- L10 et P1 incomplets : invitations SMTP, paramètres/devise/notifications, santé complémentaire, PDF des autres écrans, autres exports et validation ; ne pas figer la devise sans décision. Windows en pause, ZIP Arena, aucun secret ou trace en livraison.
