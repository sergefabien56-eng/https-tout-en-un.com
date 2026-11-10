-- 0003 — identité, sessions, rôles, permissions, accès boutique
-- Note : citext n'est pas utilisé (extension non garantie) ; l'unicité insensible à la casse
-- est obtenue par un index fonctionnel sur lower(email).

CREATE TABLE users (
  id                       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id                uuid NOT NULL DEFAULT gen_random_uuid(),
  email                    text NOT NULL CHECK (position('@' IN email) > 1),
  password_hash            text NOT NULL,
  display_name             text NOT NULL CHECK (length(trim(display_name)) > 0),
  status                   text NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','suspended','invited')),
  totp_secret_ciphertext   bytea,
  totp_secret_iv           bytea,
  totp_secret_tag          bytea,
  totp_key_version         smallint,
  totp_enabled_at          timestamptz,
  totp_recovery_codes_hash text[] NOT NULL DEFAULT '{}',
  failed_login_count       integer NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  locked_until             timestamptz,
  last_login_at            timestamptz,
  timezone                 text NOT NULL DEFAULT 'Africa/Abidjan',
  theme_preference         text NOT NULL DEFAULT 'system'
                           CHECK (theme_preference IN ('system','light','dark')),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_public_id_uq UNIQUE (public_id)
);
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));
CREATE INDEX users_status_ix ON users (status);

CREATE TABLE sessions (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash    bytea NOT NULL,
  ip_hash       bytea,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz,
  CONSTRAINT sessions_token_hash_uq UNIQUE (token_hash),
  CONSTRAINT sessions_expiration_ck CHECK (expires_at > created_at)
);
CREATE INDEX sessions_user_ix ON sessions (user_id, expires_at DESC);

CREATE TABLE roles (
  code       text PRIMARY KEY,
  label      text NOT NULL,
  is_system  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  code   text PRIMARY KEY,
  module text NOT NULL,
  action text NOT NULL,
  label  text NOT NULL,
  CONSTRAINT permissions_code_format_ck CHECK (position(':' IN code) > 1)
);

CREATE TABLE role_permissions (
  role_code       text NOT NULL REFERENCES roles (code) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permissions (code) ON DELETE CASCADE,
  PRIMARY KEY (role_code, permission_code)
);

CREATE TABLE user_roles (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id   bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role_code text NOT NULL REFERENCES roles (code) ON DELETE RESTRICT,
  -- NULL = rôle global ; sinon rôle limité à une boutique
  shop_id   bigint REFERENCES shops (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_unique UNIQUE NULLS NOT DISTINCT (user_id, role_code, shop_id)
);

CREATE TABLE user_shop_access (
  user_id    bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  shop_id    bigint NOT NULL REFERENCES shops (id) ON DELETE CASCADE,
  can_view   boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, shop_id)
);
CREATE INDEX user_shop_access_shop_ix ON user_shop_access (shop_id);

-- Rôles système (5) — référence figée, modifiable uniquement par migration
INSERT INTO roles (code, label, is_system) VALUES
  ('owner',         'Propriétaire',          true),
  ('manager',       'Gestionnaire',          true),
  ('stock_manager', 'Responsable des stocks', true),
  ('accountant',    'Comptable',             true),
  ('assistant',     'Assistant',             true);
