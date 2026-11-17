-- Lecture des seuls audits globaux, sans sélectionner de boutique.
-- Le contexte LOCAL est posé côté serveur après vérification de la session ;
-- la policy vérifie à nouveau que ce compte actif est propriétaire global
-- et détient audit:read global. Elle ne donne aucun accès aux lignes boutique.
-- 0007 permettait aussi aux contextes boutique de voir les lignes globales.
-- Réduire cette policy au seul shop_id courant, pour que le journal global
-- ne soit pas accessible accidentellement par une requête boutique.
DROP POLICY audit_log_isolation ON audit_log;
CREATE POLICY audit_log_isolation ON audit_log
  USING (shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint)
  WITH CHECK (shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint);
CREATE POLICY audit_global_owner_read ON audit_log FOR SELECT
  USING (
    shop_id IS NULL
    AND EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id=u.id AND ur.role_code='owner' AND ur.shop_id IS NULL
      JOIN role_permissions rp ON rp.role_code=ur.role_code AND rp.permission_code='audit:read'
      WHERE u.id=NULLIF(current_setting('app.audit_global_user_id', true), '')::bigint
        AND u.status='active'
    )
  );
CREATE INDEX audit_log_global_time_id_ix ON audit_log (occurred_at DESC, id DESC) WHERE shop_id IS NULL;
