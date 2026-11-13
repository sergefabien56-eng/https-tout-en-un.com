-- 0011 — Autoriser l'audit des rôles globaux hors contexte boutique, exclusivement.
-- Depuis 0007, le rôle applicatif n'écrit jamais dans audit_log sans app.shop_id ;
-- un changement de rôle global n'appartient à aucune boutique (shop_id NULL).
-- Même schéma que 0010 (notifications) : INSERT étroit, module/action/entity imposés,
-- acteur vérifié par le réglage LOCAL de transaction app.audit_actor_id, positionné
-- par le service d'identité après vérification de la session. Les policies SELECT
-- restent inchangées : aucune lecture d'audit_log sans contexte boutique.
CREATE POLICY audit_global_role_insert ON audit_log FOR INSERT
  WITH CHECK (
    shop_id IS NULL AND module = 'users' AND entity_type = 'user_role'
    AND action = 'manage_global_role'
    AND actor_user_id = NULLIF(current_setting('app.audit_actor_id', true), '')::bigint
  );
