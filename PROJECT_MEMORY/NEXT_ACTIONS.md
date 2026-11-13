# Actions suivantes — correctif CI

1. Base GitHub `3e41b85` publiée, run `43490763384` échec migrations à l'étape restauration, qualité verte, navigateur et archive skipped. Dernier SHA quatre jobs verts `2572013` (run `43487610108`).
2. Livrer le correctif de `scripts/test-backup-restore.mjs` via ZIP Drive et publication par le propriétaire sans force ; vérifier **les quatre jobs du nouveau SHA** avant de continuer. Diagnostic probable : 10 migrations figées alors que 11 existent ; logs détaillés GitHub refusés 403, confirmation attendue en CI. Voir `docs/comptes-rendus/phase1-correctif-restauration-ci-0011.md`.
3. Après validation seulement : gérer les accès des comptes à rôle global (lever le 409), puis autres critères L10 : invitations SMTP, paramètres/devise/notifications, santé réelle, Excel/PDF et validation. MIMI après L10 souhaitée ; ordre avec L11/L12 à préciser. Phase 1 non terminée, Windows en pause, aucun secret.
