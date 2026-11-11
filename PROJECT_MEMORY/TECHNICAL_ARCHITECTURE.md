# Architecture constatée dans le code v34

Next.js 15 App Router + React 19 + TS ; API dans `src/app/api/` ; pages `src/app/{page.tsx,connexion,espace}/` ; UI `src/ui/`. Services : `src/core/{auth,db,crypto,config,errors,logger,money}/` et `src/modules/{identity,audit,notifications,monitoring}/`. Base PostgreSQL via `pg`, migrations SQL versionnées (`drizzle/`, exécuteur `scripts/migrate.mjs`), contextes transactionnels de boutique et policies RLS ; rôles applicatifs non privilégiés à configurer, cf. `docs/deploiement.md`.

Auth : `src/core/auth/service.ts`, `bootstrap.ts`, `authorize-global.ts`, `authorize-shop.ts`, sessions/2FA et permissions ; vérifier chaque route serveur, ne jamais se fier au menu seul. Notifications : `src/modules/notifications/{list-own,set-read,unread-badge}.ts`, routes `/api/notifications/` et `/api/notifications/[id]/read`, actualisation de page **manuelle**. Journal : `src/modules/audit/` et routes `/api/shops/[shopId]/audit/`. Surveillance : health/deep-health, worker métier non livré.

Tests : `tests/unit`, `tests/integration`, `tests/e2e`, workflow `.github/workflows/ci.yml` avec PostgreSQL 16 pour migrations/restauration CI. `deploy/compose.production.yml`, `deploy/Caddyfile`, `Dockerfile` sont des **modèles non validés sur VPS**. Secrets hors Git et hors documents ; schéma uniquement par migration up/down et tests réels.
