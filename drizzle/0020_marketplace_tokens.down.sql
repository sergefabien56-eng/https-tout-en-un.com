-- Retour en arrière : le journal des renouvellements disparaît, la garde anti-rotation aussi.
-- Aucune donnée métier n'est touchée (cette migration n'en crée pas).
DROP POLICY IF EXISTS marketplace_token_refresh_log_app_insert ON marketplace_token_refresh_log;
DROP POLICY IF EXISTS marketplace_token_refresh_log_owner_read ON marketplace_token_refresh_log;
DROP POLICY IF EXISTS marketplace_apps_owner_all ON marketplace_apps;
ALTER TABLE marketplace_token_refresh_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_apps DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS marketplace_token_refresh_log;
ALTER TABLE marketplace_apps
  DROP COLUMN IF EXISTS rotation_guard_at,
  DROP COLUMN IF EXISTS rotation_guard_outcome;
