-- 0007 — Empêcher la fuite des événements globaux sans contexte et le rejeu TOTP.
-- Un rôle applicatif n'accède JAMAIS à audit_log/system_events sans boutique sélectionnée.
-- Les événements globaux (shop_id NULL) restent accessibles dans un contexte boutique,
-- mais leur lecture applicative exige en plus une permission système côté serveur.
ALTER TABLE users ADD COLUMN totp_last_counter bigint NOT NULL DEFAULT -1
  CHECK (totp_last_counter >= -1);

DROP POLICY audit_log_isolation ON audit_log;
CREATE POLICY audit_log_isolation ON audit_log
  USING (
    NULLIF(current_setting('app.shop_id', true), '') IS NOT NULL
    AND (shop_id IS NULL OR shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint)
  )
  WITH CHECK (
    NULLIF(current_setting('app.shop_id', true), '') IS NOT NULL
    AND (shop_id IS NULL OR shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint)
  );

DROP POLICY system_events_isolation ON system_events;
CREATE POLICY system_events_isolation ON system_events
  USING (
    NULLIF(current_setting('app.shop_id', true), '') IS NOT NULL
    AND (shop_id IS NULL OR shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint)
  )
  WITH CHECK (
    NULLIF(current_setting('app.shop_id', true), '') IS NOT NULL
    AND (shop_id IS NULL OR shop_id = NULLIF(current_setting('app.shop_id', true), '')::bigint)
  );
