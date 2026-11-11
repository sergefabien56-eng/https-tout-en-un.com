-- 0009 — notifications de compte, séparées des données métier des boutiques.
-- shop_id NULL signifie un événement propre au compte (ex. connexion 2FA).
CREATE TABLE user_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  shop_id bigint REFERENCES shops (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('security_login')),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  message text NOT NULL CHECK (length(trim(message)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT user_notifications_read_ck CHECK (read_at IS NULL OR read_at >= created_at)
);
CREATE INDEX user_notifications_user_time_ix ON user_notifications (user_id, created_at DESC, id DESC);
CREATE INDEX user_notifications_shop_ix ON user_notifications (shop_id) WHERE shop_id IS NOT NULL;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications FORCE ROW LEVEL SECURITY;
-- Contexte LOCAL, défini après authentification et jamais depuis le navigateur.
CREATE POLICY user_notifications_own ON user_notifications
  USING (user_id = NULLIF(current_setting('app.notification_user_id', true), '')::bigint)
  WITH CHECK (user_id = NULLIF(current_setting('app.notification_user_id', true), '')::bigint);
