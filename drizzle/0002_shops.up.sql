-- 0002 — comptes Jumia (une application Vendor Center) et boutiques (boutique Jumia × pays)

CREATE TABLE marketplace_apps (
  id                        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  platform                  text NOT NULL DEFAULT 'jumia' CHECK (platform IN ('jumia')),
  label                     text NOT NULL CHECK (length(trim(label)) > 0),
  client_id                 text NOT NULL,
  refresh_token_ciphertext  bytea,
  refresh_token_iv          bytea,
  refresh_token_tag         bytea,
  access_token_ciphertext   bytea,
  access_token_iv           bytea,
  access_token_tag          bytea,
  access_token_expires_at   timestamptz,
  refresh_token_expires_at  timestamptz,
  key_version               smallint NOT NULL DEFAULT 1 CHECK (key_version > 0),
  status                    text NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','reauth_required','error','disabled')),
  last_refresh_at           timestamptz,
  last_error_at             timestamptz,
  last_error_code           text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_apps_public_id_uq UNIQUE (public_id),
  CONSTRAINT marketplace_apps_platform_client_uq UNIQUE (platform, client_id),
  -- un jeton chiffré complet ou aucun (jamais un demi-secret)
  CONSTRAINT marketplace_apps_refresh_tuple_ck CHECK (
    (refresh_token_ciphertext IS NULL AND refresh_token_iv IS NULL AND refresh_token_tag IS NULL)
    OR (refresh_token_ciphertext IS NOT NULL AND refresh_token_iv IS NOT NULL AND refresh_token_tag IS NOT NULL)
  )
);
CREATE INDEX marketplace_apps_status_ix ON marketplace_apps (status);
CREATE TRIGGER marketplace_apps_updated_at BEFORE UPDATE ON marketplace_apps
  FOR EACH ROW EXECUTE FUNCTION core_set_updated_at();

CREATE TABLE shops (
  id                     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id              uuid NOT NULL DEFAULT gen_random_uuid(),
  app_id                 bigint NOT NULL REFERENCES marketplace_apps (id) ON DELETE RESTRICT,
  jumia_shop_sid         uuid NOT NULL,
  business_client_code   text NOT NULL,
  business_client_name   text,
  country_code           char(2) NOT NULL
                         CHECK (country_code IN ('CI','DZ','EG','GH','KE','MA','NG','SN','TN','UG','ZA')),
  currency               char(3) NOT NULL
                         CHECK (currency IN ('XOF','XAF','UGX','NGN','KES','GHS','ZAR','MAD','DZD','EGP','TND','USD','EUR')),
  jumia_shop_name        text,
  display_name           text NOT NULL CHECK (length(trim(display_name)) > 0),
  short_code             text,
  status                 text NOT NULL DEFAULT 'connected'
                         CHECK (status IN ('connected','syncing','synced','partial','error','reauth_required','disabled')),
  sync_enabled           boolean NOT NULL DEFAULT true,
  sync_interval_minutes  integer NOT NULL DEFAULT 15
                         CHECK (sync_interval_minutes BETWEEN 5 AND 1440),
  timezone               text NOT NULL DEFAULT 'Africa/Abidjan',
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz,
  CONSTRAINT shops_public_id_uq UNIQUE (public_id),
  -- une même boutique réelle ne peut pas être ajoutée deux fois
  CONSTRAINT shops_identity_uq UNIQUE (jumia_shop_sid, business_client_code),
  -- Un pays Jumia n'a qu'une devise : une incohérence rendrait tout calcul faux (R3).
  CONSTRAINT shops_country_currency_ck CHECK (
    (country_code = 'CI' AND currency = 'XOF') OR
    (country_code = 'SN' AND currency = 'XOF') OR
    (country_code = 'DZ' AND currency = 'DZD') OR
    (country_code = 'EG' AND currency = 'EGP') OR
    (country_code = 'GH' AND currency = 'GHS') OR
    (country_code = 'KE' AND currency = 'KES') OR
    (country_code = 'MA' AND currency = 'MAD') OR
    (country_code = 'NG' AND currency = 'NGN') OR
    (country_code = 'TN' AND currency = 'TND') OR
    (country_code = 'UG' AND currency = 'UGX') OR
    (country_code = 'ZA' AND currency = 'ZAR')
  ),
  CONSTRAINT shops_display_name_nonvide_ck CHECK (length(trim(display_name)) > 0)
);
CREATE INDEX shops_app_ix ON shops (app_id);
CREATE INDEX shops_status_ix ON shops (status);
CREATE INDEX shops_country_ix ON shops (country_code);
CREATE TRIGGER shops_updated_at BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION core_set_updated_at();
