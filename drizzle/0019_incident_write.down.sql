-- Retour en arrière : la collecte cesse d'écrire, sans toucher aux incidents déjà enregistrés.
-- L'écran Système retrouve son état antérieur (tableau vide, annoncé comme tel).
DROP POLICY IF EXISTS system_events_collector_insert ON system_events;
