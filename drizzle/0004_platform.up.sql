-- 0004 — paramètres, journal d'audit (ajout seul), incidents système, limitation de débit

CREATE TABLE app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_by bigint REFERENCES users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at       timestamptz NOT NULL DEFAULT now(),
  actor_user_id     bigint REFERENCES users (id) ON DELETE SET NULL, -- NULL = système
  actor_ip_hash     bytea,
  shop_id           bigint REFERENCES shops (id) ON DELETE SET NULL,
  module            text NOT NULL,
  action            text NOT NULL,
  entity_type       text,
  entity_public_id  uuid,
  before            jsonb,
  after             jsonb,
  result            text NOT NULL DEFAULT 'success' CHECK (result IN ('success','failure')),
  error_code        text,
  request_id        text,
  CONSTRAINT audit_log_action_nonvide_ck CHECK (length(trim(action)) > 0)
);
CREATE INDEX audit_log_shop_time_ix ON audit_log (shop_id, occurred_at DESC);
CREATE INDEX audit_log_actor_time_ix ON audit_log (actor_user_id, occurred_at DESC);
CREATE INDEX audit_log_entity_ix ON audit_log (entity_type, entity_public_id);
-- Aucune donnée financière dans les journaux : les montants sont en unités mineures dans
-- les modules métier, jamais recopiés ici.

CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION core_forbid_mutation();
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION core_forbid_mutation();

CREATE TABLE system_events (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  severity        text NOT NULL CHECK (severity IN ('info','warning','critical')),
  category        text NOT NULL,
  shop_id         bigint REFERENCES shops (id) ON DELETE SET NULL,
  code            text NOT NULL,
  message         text NOT NULL,
  context         jsonb,
  acknowledged_at timestamptz,
  acknowledged_by bigint REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX system_events_severity_time_ix ON system_events (severity, occurred_at DESC);

CREATE TABLE rate_limits (
  bucket       text NOT NULL,
  key_hash     text NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer NOT NULL DEFAULT 1 CHECK (count >= 0),
  PRIMARY KEY (bucket, key_hash, window_start)
);
