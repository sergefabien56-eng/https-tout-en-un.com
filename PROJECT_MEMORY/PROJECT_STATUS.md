# Statut — Phase 1

- Base GitHub `14d046ec1c0d7b65c5c45ff1551a6841d942eb8f` publiée ; [run 43639821115](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43639821115) qualité/PG16 verts, navigateur rouge (ECONNRESET, flaky), archive sautée. L'export Excel rôles ne peut pas encore être considéré validé par les quatre jobs.
- Correctif CI local ciblant une hypothèse de socket réutilisé : voir `docs/comptes-rendus/phase1-correctif-transport-ci.md`. 238 Vitest, lint/types/build/audit high locaux OK ; 7 modérées ; navigateur et PG16 réels du nouveau SHA non exécutés localement.
- L10 et P1 incomplets : invitations SMTP, paramètres/devise/notifications, santé complémentaire, Excel des autres écrans, PDF et validation ; ne pas figer la devise sans décision. Windows en pause, ZIP par Arena, pas de données ou secrets en livraison.
