-- Rôle applicatif : jamais superutilisateur, jamais BYPASSRLS (sinon la RLS est contournée).
-- À exécuter une fois par environnement, avec un compte administrateur PostgreSQL.
--   psql "$DATABASE_URL_ADMIN" -v app_password="$APP_DB_PASSWORD" -f scripts/db-roles.sql
-- psql ne substitue PAS ses variables à l'intérieur de DO $$...$$. `\gexec` exécute
-- le CREATE ROLE uniquement si nécessaire ; format(%L) protège le mot de passe.
-- Exemple : psql "$DATABASE_URL_ADMIN" -v app_password="$APP_DB_PASSWORD" -f scripts/db-roles.sql
SELECT format('CREATE ROLE toutenun_app LOGIN PASSWORD %L NOSUPERUSER NOBYPASSRLS NOCREATEDB', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'toutenun_app')
\gexec

GRANT CONNECT ON DATABASE tout_en_un TO toutenun_app;
GRANT USAGE ON SCHEMA public TO toutenun_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO toutenun_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO toutenun_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO toutenun_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO toutenun_app;
