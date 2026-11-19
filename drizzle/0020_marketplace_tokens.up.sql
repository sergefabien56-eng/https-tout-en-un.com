-- 0020 — Fondations Jumia : journal des renouvellements, verrou d'application, garde anti-rotation.
--
-- Aucune table métier Jumia (produits, commandes, stocks) n'est créée ici : elles le seront
-- avec leurs écrans, quand l'accès API réel sera disponible. Cette migration ne contient que
-- ce qui peut être écrit ET testé sans aucun accès Jumia.
--
-- Le point le plus dangereux de l'intégration (docs/jumia-integration.md §2.4) : chaque appel
-- `POST /token` INVALIDE le refresh token utilisé et en renvoie un nouveau. Deux renouvellements
-- concurrents déconnectent définitivement la boutique. D'où trois mécanismes : un journal, un
-- verrou, et un garde-fou de cohérence.

-- 1. Journal des renouvellements — diagnostic sans jamais stocker de valeur de jeton.
--    On enregistre l'issue, la durée et les durées de vie annoncées par l'API, jamais le jeton.
CREATE TABLE marketplace_token_refresh_log (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  app_id                bigint NOT NULL REFERENCES marketplace_apps (id) ON DELETE CASCADE,
  attempted_at          timestamptz NOT NULL DEFAULT now(),
  outcome               text NOT NULL
                        CHECK (outcome IN ('refreshed','reused_cached','invalid_grant','invalid_client',
                                           'network_error','rate_limited','unexpected_response')),
  duration_ms           integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  http_status           smallint CHECK (http_status IS NULL OR (http_status >= 100 AND http_status <= 599)),
  -- Durées ANNONCÉES par Jumia : le document officiel précise qu'elles sont configurables et
  -- qu'aucune durée ne doit être codée en dur. On les enregistre donc telles quelles.
  expires_in_seconds    integer CHECK (expires_in_seconds IS NULL OR expires_in_seconds > 0),
  refresh_expires_seconds integer CHECK (refresh_expires_seconds IS NULL OR refresh_expires_seconds > 0),
  error_code            text CHECK (error_code IS NULL OR length(error_code) <= 100),
  actor_user_id         bigint REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX marketplace_token_refresh_log_app_time_ix
  ON marketplace_token_refresh_log (app_id, attempted_at DESC);

-- Le journal est en AJOUT SEUL : un journal de sécurité que l'application peut réécrire ne
-- prouve rien. Même fonction que le journal d'audit (0001/0004).
CREATE TRIGGER marketplace_token_refresh_log_no_update
  BEFORE UPDATE ON marketplace_token_refresh_log
  FOR EACH ROW EXECUTE FUNCTION core_forbid_mutation();
CREATE TRIGGER marketplace_token_refresh_log_no_delete
  BEFORE DELETE ON marketplace_token_refresh_log
  FOR EACH ROW EXECUTE FUNCTION core_forbid_mutation();

-- 2. Garde anti-rotation perdue.
--    Si un renouvellement a réussi mais que l'écriture du nouveau jeton a échoué, le refresh
--    token en base est périmé. Cette colonne rend cet état EXPLICITE plutôt que de laisser
--    l'application boucler sur `invalid_grant`.
ALTER TABLE marketplace_apps
  ADD COLUMN rotation_guard_at timestamptz,
  ADD COLUMN rotation_guard_outcome text
    CHECK (rotation_guard_outcome IS NULL OR rotation_guard_outcome IN ('write_failed','ambiguous'));

COMMENT ON COLUMN marketplace_apps.rotation_guard_at IS
  'Posé quand un renouvellement a pu réussir sans que le nouveau jeton soit écrit. '
  'Tant que ce champ est rempli, l''application exige une reconnexion manuelle : '
  'réessayer consommerait un jeton peut-être déjà invalidé.';

-- 3. RLS : marketplace_apps n'en avait aucune, elle contenait déjà des jetons chiffrés.
--    On l'active, avec une seule porte : la lecture/écriture réservée au Propriétaire via son
--    identifiant de session, comme pour `system_events` (0018). Aucun rôle applicatif ne lit
--    les jetons d'une application Jumia en dehors de ce contexte explicite.
ALTER TABLE marketplace_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_apps FORCE ROW LEVEL SECURITY;

CREATE POLICY marketplace_apps_owner_all ON marketplace_apps
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = 'owner' AND ur.shop_id IS NULL
      JOIN role_permissions rp ON rp.role_code = ur.role_code AND rp.permission_code = 'shops:write'
      WHERE u.id = NULLIF(current_setting('app.marketplace_user_id', true), '')::bigint
        AND u.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = 'owner' AND ur.shop_id IS NULL
      JOIN role_permissions rp ON rp.role_code = ur.role_code AND rp.permission_code = 'shops:write'
      WHERE u.id = NULLIF(current_setting('app.marketplace_user_id', true), '')::bigint
        AND u.status = 'active'
    )
  );

-- La table des jetons de rafraîchissement ne doit être lisible par AUCUNE policy boutique :
-- son accès passe uniquement par la policy propriétaire ci-dessus.
ALTER TABLE marketplace_token_refresh_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_token_refresh_log FORCE ROW LEVEL SECURITY;

-- Lecture du journal : réservée au Propriétaire (même porte que ci-dessus).
CREATE POLICY marketplace_token_refresh_log_owner_read ON marketplace_token_refresh_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = 'owner' AND ur.shop_id IS NULL
      JOIN role_permissions rp ON rp.role_code = ur.role_code AND rp.permission_code = 'system:manage'
      WHERE u.id = NULLIF(current_setting('app.marketplace_user_id', true), '')::bigint
        AND u.status = 'active'
    )
  );

-- Écriture du journal : le renouvellement est fait par l'application elle-même, sous le rôle
-- applicatif, sans utilisateur connecté. Cette porte est aussi étroite que celle des incidents
-- (0019) : insertion seule, issues connues, jamais de valeur de jeton.
CREATE POLICY marketplace_token_refresh_log_app_insert ON marketplace_token_refresh_log FOR INSERT
  WITH CHECK (
    outcome IN ('refreshed','reused_cached','invalid_grant','invalid_client',
                'network_error','rate_limited','unexpected_response')
  );
