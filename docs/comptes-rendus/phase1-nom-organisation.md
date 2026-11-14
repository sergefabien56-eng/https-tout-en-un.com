# L10 — nom de l’organisation

## Périmètre

La page Paramètres permet aux comptes disposant de `settings:read` global de consulter un nom d’organisation explicite ; il n’est pas configuré par défaut. Un compte autorisé par `settings:manage` global peut le modifier. Ce nom ne remplace pas le nom officiel de l’application, n’est pas encore repris dans les exports et n’implique aucune donnée métier ou intégration externe.

La clé `organization.name` est stockée dans `app_settings` sans migration ; le nom est une chaîne Unicode NFC, limitée à 100 unités UTF-16 après retrait des espaces aux extrémités, sans caractères de contrôle, format ou surrogate. Mutation PUT avec contrôle Origin + CSRF, corps strict, réponse `no-store`. Une transaction verrouille la clé, modifie la valeur et écrit un audit avant/après ; l’opération est idempotente. En cas d’échec de l’audit, la modification est annulée.

## Vérifications

- 229 tests Vitest OK en sériel : contrôles de validation, autorisation globale vs boutique, lecture, écriture, idempotence, audit et rollback PGlite ; route Origin/CSRF/corps strict ; rendu client succès/erreur.
- Lint, typage et build locaux OK. Avertissement non bloquant : plugin Next non détecté par ESLint pendant le build.
- 10 tests Playwright découverts ; scénario authentifié complété pour le formulaire et la protection CSRF. **Parcours navigateur non exécuté localement** ; navigateur et PostgreSQL 16 réels à confirmer par la CI après publication.
- Aucun secret, donnée réelle, changement de devise ou SMTP. Phase 1 et L10 incomplets ; Windows en pause.

## Référence précédente

La base `aa5bdabce585e5761a69c846f646357113de85d9` est publiée ; [run 43519659898](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43519659898) : les quatre jobs sont verts. Cette validation concerne la base, pas le présent lot. Artifact CI présent mais non téléchargé ni restauré. La cause exacte des anciens flakies reste inconnue.
