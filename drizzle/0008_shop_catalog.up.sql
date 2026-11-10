-- 0008 : lecture du catalogue limité à l'utilisateur authentifié, sans ouvrir les
-- requêtes métier non scopées. app.list_user_id est LOCAL à la transaction vérifiée.
-- Les autres tables métier restent exclusivement sous app.shop_id.
CREATE POLICY user_shop_access_catalog ON user_shop_access FOR SELECT
  USING (user_id = NULLIF(current_setting('app.list_user_id', true), '')::bigint);

CREATE POLICY shops_catalog ON shops FOR SELECT
  USING (
    NULLIF(current_setting('app.list_user_id', true), '') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_code = ur.role_code
      WHERE ur.user_id = NULLIF(current_setting('app.list_user_id', true), '')::bigint
        AND rp.permission_code = 'shops:read'
        AND (ur.shop_id IS NULL OR ur.shop_id = shops.id)
        AND (
          (ur.role_code = 'owner' AND ur.shop_id IS NULL)
          OR EXISTS (
            SELECT 1 FROM user_shop_access usa WHERE usa.user_id = ur.user_id
              AND usa.shop_id = shops.id AND usa.can_view
          )
        )
    )
  );
