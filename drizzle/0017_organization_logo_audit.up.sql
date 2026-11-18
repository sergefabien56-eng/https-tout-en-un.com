-- 0017 — Autoriser l'audit du logo commun, et lui seul.
-- Le logo est un réglage global : aucun contexte boutique, comme 0012 pour le fuseau et
-- le nom. La policy 0012 énumérait deux actions ; le logo en ajoute une troisième, sans
-- élargir les droits existants ni autoriser la lecture du journal.
-- L'image elle-même n'est jamais écrite ici : uniquement le fait, les dimensions et l'auteur.
CREATE POLICY audit_organization_logo_insert ON audit_log FOR INSERT
  WITH CHECK (
    shop_id IS NULL AND module = 'settings' AND entity_type = 'app_setting'
    AND action IN ('update_organization_logo', 'remove_organization_logo')
    AND actor_user_id = NULLIF(current_setting('app.audit_actor_id', true), '')::bigint
  );
