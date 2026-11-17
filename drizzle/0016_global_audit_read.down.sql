DROP INDEX IF EXISTS audit_log_global_time_id_ix;
DROP POLICY IF EXISTS audit_global_owner_read ON audit_log;
-- Restaure exactement la policy de 0007 ; ne supprime aucun événement.
DROP POLICY IF EXISTS audit_log_isolation ON audit_log;
CREATE POLICY audit_log_isolation ON audit_log
  USING (
    NULLIF(current_setting('app.shop_id', true), '') IS NOT NULL
    AND (shop_id IS NULL OR shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint)
  )
  WITH CHECK (
    NULLIF(current_setting('app.shop_id', true), '') IS NOT NULL
    AND (shop_id IS NULL OR shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint)
  );
