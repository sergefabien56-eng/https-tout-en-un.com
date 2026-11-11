# État de référence — 2026-11-11

| Élément | Constat vérifiable | Statut |
|---|---|---|
| GitHub publié | `main` v34 `0226bd0890a20dd73bdcf09679003f0077085319` ; nouveau jalon mémoire à publier/contrôler séparément | v34 vérifié |
| CI v34 | run `43009896449`, 3 jobs success, 10 Playwright passés sans flaky | testé sur v34 |
| Stack | Next 15, React 19, TypeScript 5.9, PostgreSQL (`pg`), npm, Vitest/Playwright | code lu |
| DB | 10 migrations up/down, RLS forcée sur certaines tables, test de restauration CI fictive | v34 CI ; pas production |
| UI / auth | accueil, connexion, espace, boutiques, utilisateurs/rôles/sessions, journal, notifications, système partiel | implémenté/test CI v34 ; portée limitée |
| Jumia / financier | étude et conception seulement ; pas de données Jumia réelles ni chiffre financier de production | non livré |
| Exploitation | templates Caddy/Docker, prévisualisation temporaire ; pas de VPS, domaine ni backup chiffré hors site validés | non testé en prod |
| Mémoire | 13 documents + script de check/snapshot, sans modification du code applicatif | check OK, lint OK, typecheck OK, 159 Vitest passés localement ; CI du nouveau commit non testée |

**Bloquants** : domaine/VPS/SMTP, sauvegarde de production chiffrée + restauration indépendante, accès Jumia, validation des règles financières ; anciens documents de planification obsolètes par endroits. Voir `BUGS_AND_ISSUES.md`. Ne pas réutiliser le résultat de CI v34 comme résultat du nouveau SHA.
