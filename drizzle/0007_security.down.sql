DROP POLICY system_events_isolation ON system_events;
CREATE POLICY system_events_isolation ON system_events
  USING (shop_id IS NULL OR shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint)
  WITH CHECK (shop_id IS NULL OR shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint);
DROP POLICY audit_log_isolation ON audit_log;
CREATE POLICY audit_log_isolation ON audit_log
  USING (shop_id IS NULL OR shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint)
  WITH CHECK (shop_id IS NULL OR shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint);
ALTER TABLE users DROP COLUMN totp_last_counter;
