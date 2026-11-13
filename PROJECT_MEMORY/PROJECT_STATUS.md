# Statut — Phase 1

- GitHub `6a3ab80ef61ba4680c4a2b53a6963f5e28111d51` publié, run `43506484096` échec : qualité et migrations PG16 (dont backup/restore) vertes, navigateur rouge, archive skipped. Annotations : attente de 10 migrations au lieu de 11 sur bureau/mobile et flaky notifications bureau au premier essai. Dernier SHA quatre jobs verts `2572013`, run `43487610108`.
- Correctif E2E préparé : total des migrations dérivé des fichiers et synchronisation navigation filtre notifications. Cause exacte du flaky non prouvée ; navigateur du présent commit à valider en CI. Voir `docs/comptes-rendus/phase1-correctif-ci-navigateur-0011.md`.
- L10/P1 incomplets : accès des comptes à rôle global (409), invitations SMTP, paramètres/devise/notifications, santé réelle, Excel/PDF et validation. MIMI souhaitée après L10, ordre avec L11/L12 à confirmer. Windows en pause ; aucune production/backup réel/donnée réelle.
