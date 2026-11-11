# État de référence — jalon Phase 1 archive CI du code

| Élément | État constaté |
|---|---|
| Version GitHub confirmée avant ce jalon | `bf706f194241e4ff6a9a69aa4f4e2d538b6fa78c`, run `43013341355` **completed success**, trois jobs verts |
| Nouveau job `code_archive` | écrit dans `.github/workflows/ci.yml`, après 3 jobs réussis sur `main` ; **pas encore prouvé sur un runner GitHub** |
| Archive source et histoire | `scripts/project-memory.mjs snapshot`, bundle + ZIP + SHA256 ; locale testée au jalon précédent, invocation CI nouvelle à valider |
| Auth/UI | socle P1 connexion/TOTP, boutiques, rôles, utilisateurs, journal, notifications manuelles ; tests du précédent SHA validés ; aucun nouveau module métier livré |
| PostgreSQL | 10 migrations contrôlées ; restauration de fixtures en CI, pas un backup externe de données |
| Exploitation | hébergement/SMTP et destination externe non vérifiés ; aucune sauvegarde de production, pas de serveur métier déclaré en service |

**Validation locale de ce jalon :** YAML parsé (4 jobs et dépendances), check de mémoire OK, syntaxe Node OK, lint OK, typecheck OK, 159/159 Vitest. Nouvelle CI distante et téléchargement/restauration de l'artifact encore en attente ; ne jamais réutiliser le succès de `43013341355` comme celui d'un commit ultérieur.

**Problèmes** : Git local `/home/user` à ancien HEAD et histoire divergente, documents Phase 0 périmés, absence de sauvegarde de données commerciale. Voir `BUGS_AND_ISSUES.md`.
