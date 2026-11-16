-- Accès individuel explicite à l'annuaire global ; n'accorde aucune autre permission.
CREATE TABLE user_directory_access (
  user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  granted_by bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE POLICY audit_global_directory_access_insert ON audit_log FOR INSERT
  WITH CHECK (
    shop_id IS NULL AND module = 'users' AND entity_type = 'directory_access'
    AND action = 'manage_directory_access'
    AND actor_user_id = NULLIF(current_setting('app.audit_actor_id', true), '')::bigint
  );
