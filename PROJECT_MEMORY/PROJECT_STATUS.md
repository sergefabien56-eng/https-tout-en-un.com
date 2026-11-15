# Statut — Phase 1

- Base `98eaee86afaa82bf49de6a1a4ea2f02f6188633e` publiée ; [run 43744750704](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43744750704) quatre jobs verts, 12 tests navigateur et installation propre réussie ; artifact non restauré.
- Lot L10 local : PDF des utilisateurs, mêmes filtres et droits globaux que CSV/Excel ; bornes et limites documentées. 283 Vitest/lint/types/build/audit high OK (7 modérées), PDF fictifs vérifiés indépendamment ; navigateur et PostgreSQL 16 réels à vérifier en CI (12 E2E listés). Voir `docs/comptes-rendus/phase1-export-pdf-utilisateurs.md`.
- L10 et P1 incomplets : invitations SMTP, paramètres/devise/notifications, santé complémentaire, PDF des autres écrans, autres exports et validation ; ne pas figer la devise sans décision. Windows en pause, ZIP Arena, aucun secret ou trace en livraison.
