DROP POLICY IF EXISTS system_events_isolation ON system_events;
ALTER TABLE system_events DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_log_isolation ON audit_log;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_shop_access_isolation ON user_shop_access;
ALTER TABLE user_shop_access DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shops_isolation ON shops;
ALTER TABLE shops DISABLE ROW LEVEL SECURITY;
