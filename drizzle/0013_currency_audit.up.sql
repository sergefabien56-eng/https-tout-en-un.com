-- Audit du seul choix de devise globale, sans lecture supplémentaire du journal.
CREATE POLICY audit_global_currency_insert ON audit_log FOR INSERT
  WITH CHECK (
    shop_id IS NULL AND module = 'settings' AND entity_type = 'app_setting'
    AND action = 'update_reference_currency'
    AND actor_user_id = NULLIF(current_setting('app.audit_actor_id', true), '')::bigint
  );
