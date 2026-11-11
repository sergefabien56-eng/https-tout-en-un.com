-- Autorise UNIQUEMENT l'audit d'un changement personnel lu/non lu hors contexte boutique.
-- La lecture du journal reste fermée sans contexte boutique (policy 0007 inchangée).
CREATE POLICY audit_notification_read_insert ON audit_log FOR INSERT
  WITH CHECK (
    shop_id IS NULL AND module = 'notifications' AND entity_type = 'user_notification'
    AND action IN ('mark_read', 'mark_unread')
    AND actor_user_id = NULLIF(current_setting('app.notification_user_id', true), '')::bigint
  );
