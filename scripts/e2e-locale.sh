#!/usr/bin/env bash
# Recette locale jetable : base neuve + propriétaire CI + fixtures, puis test navigateur.
# Équivalent local de l'ordre des étapes du job CI « e2e ».
set -euo pipefail
cd "$(dirname "$0")/.."

export LD_LIBRARY_PATH=/tmp/pgdeb/root/usr/lib/x86_64-linux-gnu:/tmp/libs/root/usr/lib/x86_64-linux-gnu
export PATH=/tmp/pgdeb/root/usr/lib/postgresql/17/bin:$PATH
export APP_ENV=staging CI=true
export SESSION_SECRET=dGVzdC1zZXNzaW9uLXNlY3JldC0zMi1vY3RldHMtZmFrZQ==
export APP_ENC_KEYS=1:Q0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0M=
export APP_ENC_ACTIVE=1
export DATABASE_URL_ADMIN=postgres://postgres:postgres@localhost:55432/tout_en_un_test
export E2E_RECOVERY_FILE=/tmp/ci-recovery-codes
export E2E_DELEGATION_FILE=/tmp/ci-delegation-fixtures

psql postgres://postgres:postgres@localhost:55432/postgres -Atc \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='tout_en_un_test'" >/dev/null
dropdb -h 127.0.0.1 -p 55432 -U postgres --if-exists tout_en_un_test
createdb -h 127.0.0.1 -p 55432 -U postgres tout_en_un_test
DATABASE_URL=$DATABASE_URL_ADMIN npm run db:migrate >/dev/null
psql "$DATABASE_URL_ADMIN" -q -v ON_ERROR_STOP=1 -v app_password='ci-app-password' -f scripts/db-roles.sql >/dev/null

rm -f /tmp/ci-owner-qr.png /tmp/ci-recovery-codes
printf 'MotDePasseCI!2026\n' > /tmp/ci-owner-password
chmod 600 /tmp/ci-owner-password
OWNER_EMAIL=proprietaire@ci.invalid OWNER_NAME='Propriétaire CI' \
  OWNER_PASSWORD_FILE=/tmp/ci-owner-password TOTP_QR_FILE=/tmp/ci-owner-qr.png \
  TOTP_RECOVERY_FILE=/tmp/ci-recovery-codes npm run auth:bootstrap >/dev/null
node scripts/extend-e2e-recovery.mjs >/dev/null
node scripts/seed-e2e-shop.mjs >/dev/null
node scripts/seed-e2e-delegation.mjs >/dev/null
rm -f /tmp/ci-owner-password /tmp/ci-owner-qr.png

export DATABASE_URL=postgres://toutenun_app:ci-app-password@localhost:55432/tout_en_un_test
export PW_START_CMD='npx next start --hostname 127.0.0.1 --port 3100'
npx playwright test "$@" --workers=1
