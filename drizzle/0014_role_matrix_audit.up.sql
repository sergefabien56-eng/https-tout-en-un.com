-- Autorise uniquement l'écriture de l'audit des changements de matrice globale.
CREATE POLICY audit_global_role_matrix_insert ON audit_log FOR INSERT
  WITH CHECK (
    shop_id IS NULL AND module = 'roles' AND entity_type = 'role_permission'
    AND action = 'update_role_permission'
    AND actor_user_id = NULLIF(current_setting('app.audit_actor_id', true), '')::bigint
  );
