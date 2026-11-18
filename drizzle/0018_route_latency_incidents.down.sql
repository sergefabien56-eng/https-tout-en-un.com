-- 0018 — retrait des policies et de la table ajoutées par la montée.
DROP POLICY IF EXISTS system_events_global_owner_ack ON system_events;
DROP POLICY IF EXISTS system_events_global_owner_read ON system_events;
DROP TABLE IF EXISTS route_latency;
