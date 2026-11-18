-- 0018 — Mesure de latence par route, journal des incidents applicatifs, acquittement.
--
-- Deux tables, deux usages distincts et jamais confondus :
--   * `route_latency` : agrégats par route et par tranche de 5 minutes. Aucune requête,
--     aucun en-tête, aucun identifiant de session n'y entre — uniquement un chemin
--     normalisé (`[id]` à la place des identifiants), une méthode, un statut et des durées.
--   * `system_events` (0004) : incidents réels. Ce lot n'en crée pas de nouvelle, il la lit.
--
-- Le plafond de rétention est explicite : 24 h de latence, 30 jours d'incidents. Sans purge,
-- une table de mesure devient une fuite de disque et, à terme, une fuite de vie privée.

CREATE TABLE route_latency (
  route_key    text NOT NULL CHECK (length(route_key) BETWEEN 1 AND 200),
  method       text NOT NULL CHECK (method IN ('GET','POST','PUT','PATCH','DELETE')),
  status_class smallint NOT NULL CHECK (status_class IN (2, 3, 4, 5)),
  bucket_start timestamptz NOT NULL,
  -- Instant réel de la mesure. `bucket_start` est aligné sur 5 minutes : une tranche en cours
  -- n'est complète qu'après coup, et lire « la dernière heure » sur des tranches alignées
  -- rate la mesure la plus récente. Défaut trouvé en vérifiant l'écran sur un serveur réel.
  started_at   timestamptz NOT NULL DEFAULT now(),
  samples      integer NOT NULL DEFAULT 1 CHECK (samples > 0),
  total_ms     bigint NOT NULL CHECK (total_ms >= 0),
  max_ms       integer NOT NULL CHECK (max_ms >= 0),
  slow_samples integer NOT NULL DEFAULT 0 CHECK (slow_samples >= 0 AND slow_samples <= samples),
  PRIMARY KEY (route_key, method, status_class, bucket_start),
  CONSTRAINT route_latency_bucket_align_ck CHECK (
    extract(epoch FROM bucket_start)::bigint % 300 = 0
  )
);
CREATE INDEX route_latency_bucket_ix ON route_latency (bucket_start DESC);
CREATE INDEX route_latency_started_ix ON route_latency (started_at DESC);

-- Incidents : lecture globale réservée au Propriétaire, écriture système uniquement.
-- La colonne d'acquittement existe déjà en 0004 ; cette policy autorise la SEULE mutation
-- d'acquittement, et rien d'autre. Aucun incident ne peut être réécrit ni supprimé
-- (triggers 0004), et l'acquittement d'un incident boutique reste impossible ici.
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events FORCE ROW LEVEL SECURITY;

CREATE POLICY system_events_global_owner_read ON system_events FOR SELECT
  USING (
    shop_id IS NULL
    AND EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = 'owner' AND ur.shop_id IS NULL
      JOIN role_permissions rp ON rp.role_code = ur.role_code AND rp.permission_code = 'system:manage'
      WHERE u.id = NULLIF(current_setting('app.system_events_user_id', true), '')::bigint
        AND u.status = 'active'
    )
  );

CREATE POLICY system_events_global_owner_ack ON system_events FOR UPDATE
  USING (
    shop_id IS NULL AND acknowledged_at IS NULL
    AND EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = 'owner' AND ur.shop_id IS NULL
      JOIN role_permissions rp ON rp.role_code = ur.role_code AND rp.permission_code = 'system:manage'
      WHERE u.id = NULLIF(current_setting('app.system_events_user_id', true), '')::bigint
        AND u.status = 'active'
    )
  )
  WITH CHECK (
    shop_id IS NULL AND acknowledged_at IS NOT NULL AND acknowledged_by IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code = 'owner' AND ur.shop_id IS NULL
      JOIN role_permissions rp ON rp.role_code = ur.role_code AND rp.permission_code = 'system:manage'
      WHERE u.id = NULLIF(current_setting('app.system_events_user_id', true), '')::bigint
        AND u.status = 'active'
    )
  );

-- La RLS de 0005 continue de masquer les incidents boutique au contexte global : `shop_id IS NULL`
-- est exigé ci-dessus. Aucune policy globale ne remplace `system_events_isolation` pour les
-- contextes boutique, qui restent bornés à leur boutique.
