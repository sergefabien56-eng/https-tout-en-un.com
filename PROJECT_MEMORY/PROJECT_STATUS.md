# Statut — Phase 1

- Base `6cf8be786d03440e75328d5b6395047009c8bd0d` publiée ; [run 43761332925](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43761332925) quatre jobs verts et 14 tests navigateur ; artifact non restauré.
- Lot L10 local : PDF des seuls nom et fuseau de l’organisation, droits globaux `settings:read` et `reports:export` ; 312 Vitest, lint/types/build/audit high OK (7 modérées), PDF fictifs relus. Navigateur et PostgreSQL 16 réels du nouveau SHA à vérifier en CI (14 E2E listés). Voir `docs/comptes-rendus/phase1-export-pdf-parametres.md`.
- L10 et P1 incomplets : invitations SMTP, paramètres/devise/notifications, santé complémentaire, autres exports et validation ; ne pas figer la devise sans décision. Windows en pause, ZIP Arena, aucun secret ou trace en livraison.
