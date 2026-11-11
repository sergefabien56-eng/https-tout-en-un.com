# Phase 1 — correction du test navigateur des filtres de notifications

## 1. Constat
Run v22 `42974028787`, commit `0e78db4` : **échec**. Qualité et PostgreSQL 16 (migrations, rollback et restauration) réussis. Navigateur : 2 tests échoués sur bureau et mobile, 6 autres réussis. Playwright ciblait « Lues » en correspondance partielle et trouvait deux liens : « Non lues » et « Lues ».

## 2. Correction
Le scénario Playwright exige la correspondance **exacte** pour le lien filtré. Aucun changement au service de notifications, à l’API, à l’interface, aux droits, à la RLS ou aux migrations.

## 3. Tests exécutés
Local : lint, TypeScript, build et **155/155 tests** verts. Le parcours navigateur PostgreSQL 16 doit être rejoué en CI après publication.

## 4. Limites
Le lot filtres n’est pas validé en CI tant que les trois jobs du nouveau commit ne sont pas verts. Phase 1 non terminée, application non déployée.

## 5. Validation attendue
Publier une archive descendante de `0e78db4` sans force push ; contrôler le parcours navigateur dans les deux tailles ainsi que les deux autres jobs.

## 6. Suite
Reprendre les autres critères de Phase 1 après validation ; ne pas simuler l’e-mail SMTP, une connexion Jumia ou des sauvegardes de production.
