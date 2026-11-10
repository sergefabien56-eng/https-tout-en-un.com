DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS system_events;
DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS app_settings;
