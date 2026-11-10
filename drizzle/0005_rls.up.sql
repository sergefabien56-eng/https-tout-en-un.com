-- 0005 — isolation multi-boutiques par RLS (défense en profondeur, ADR-007)
-- Le contexte est positionné par transaction : SELECT set_config('app.shop_id', '12', true);
-- Le rôle applicatif ne doit PAS être superutilisateur ni BYPASSRLS (voir scripts/db-roles.sql).

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops FORCE ROW LEVEL SECURITY;
CREATE POLICY shops_isolation ON shops
  USING (id = NULLIF(current_setting('app.shop_id', true), '')::bigint)
  WITH CHECK (id = NULLIF(current_setting('app.shop_id', true), '')::bigint);

ALTER TABLE user_shop_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shop_access FORCE ROW LEVEL SECURITY;
CREATE POLICY user_shop_access_isolation ON user_shop_access
  USING (shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint)
  WITH CHECK (shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
-- Les entrées système (shop_id NULL) restent visibles : elles n'appartiennent à aucune boutique.
CREATE POLICY audit_log_isolation ON audit_log
  USING (shop_id IS NULL OR shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint)
  WITH CHECK (shop_id IS NULL OR shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint);

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events FORCE ROW LEVEL SECURITY;
CREATE POLICY system_events_isolation ON system_events
  USING (shop_id IS NULL OR shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint)
  WITH CHECK (shop_id IS NULL OR shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint);
