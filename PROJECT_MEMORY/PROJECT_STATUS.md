# Statut — Phase 1

- GitHub `3e41b85d19b99d12b613f726bc15287bb336bb45` publié, run `43490763384` échec : qualité verte, migrations échouées à la restauration, navigateur et archive non lancés. Dernier SHA quatre jobs verts : `2572013`, run `43487610108`.
- Correctif préparé : nombre attendu de migrations dérivé des fichiers au lieu du nombre figé 10. Cause probable mais logs CI détaillés refusés (403), confirmation en attente de la CI du correctif. Voir `docs/comptes-rendus/phase1-correctif-restauration-ci-0011.md`.
- L10/P1 incomplets : accès des comptes à rôle global (409), invitations SMTP, paramètres/devise/notifications, santé réelle, Excel/PDF et validation restent à livrer. MIMI souhaitée après L10, ordre avec L11/L12 à confirmer. Windows en pause ; aucune production/backup réel/donnée réelle.
