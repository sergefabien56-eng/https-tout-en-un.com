# Actions suivantes — correctif navigateur CI

1. `6a3ab80` est publié ; run `43506484096` échec : qualité et migrations PG16 vertes, navigateur rouge (10 migrations attendues contre 11, et flaky navigation notifications), archive skipped. Dernier SHA quatre jobs verts `2572013` (run `43487610108`).
2. Livrer le correctif E2E via ZIP Drive et publication sans force ; donner le lien CI au propriétaire dès qu'il dit « j'ai publié », puis vérifier **les quatre jobs du nouveau SHA**. E2E réels non exécutés localement ; la cause du flaky reste une hypothèse. Voir `docs/comptes-rendus/phase1-correctif-ci-navigateur-0011.md`.
3. Après validation seulement : gérer les accès des comptes à rôle global (lever le 409), puis autres critères L10 : invitations SMTP, paramètres/devise/notifications, santé réelle, Excel/PDF et validation. MIMI après L10 souhaitée ; ordre avec L11/L12 à préciser. Phase 1 non terminée, Windows en pause, aucun secret.
