-- 0012 : audit des deux réglages globaux hors contexte boutique.
-- Cette policy INSERT ne donne aucun droit de lecture et n'autorise ni autres
-- modules/actions ni un acteur différent du contexte local posé après autorisation.
CREATE POLICY audit_global_settings_insert ON audit_log FOR INSERT
  WITH CHECK (
    shop_id IS NULL AND module = 'settings' AND entity_type = 'app_setting'
    AND action IN ('update_timezone', 'update_organization_name')
    AND actor_user_id = NULLIF(current_setting('app.audit_actor_id', true), '')::bigint
  );
