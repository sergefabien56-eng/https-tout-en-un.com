-- 0019 — Le collecteur d'incidents peut ÉCRIRE, et rien de plus.
--
-- Problème résolu : `recordIncident()` échouait en silence. La policy 0007 exige un contexte
-- boutique (`app.shop_id`) pour écrire, or un incident système survient précisément quand ce
-- contexte n'existe pas : panne de base, export qui casse, erreur de route avant toute
-- identification. Résultat : l'écran Système affichait un tableau d'incidents vide, sans que
-- rien n'indique que la collecte ne fonctionnait pas.
--
-- Décision retenue (option B) : une règle d'écriture CIBLÉE plutôt qu'un second compte base.
-- Elle n'accorde QUE l'insertion d'un incident global, avec un code du catalogue figé
-- ci-dessous. Aucune lecture, aucune modification, aucune suppression n'est accordée par cette
-- policy : ce qu'elle autorise est exactement ce qui manquait.
--
-- Pourquoi une liste de codes en dur plutôt qu'un simple `shop_id IS NULL` : sans elle, le
-- rôle applicatif pourrait écrire n'importe quel message dans le journal système — donc y
-- injecter du texte arbitraire, voire y noyer un vrai incident sous des lignes fabriquées.
-- La liste est dupliquée depuis `INCIDENT_CODES` (src/modules/monitoring/collect-errors.ts) ;
-- un test d'intégration vérifie que les deux listes ne divergent pas.

-- Pas de BEGIN/COMMIT ici : scripts/migrate.mjs enveloppe déjà chaque fichier dans une
-- transaction et enregistre la version dans `schema_migrations` dans la même transaction.
-- Un BEGIN imbriqué ferait échouer le COMMIT externe (aucune autre migration ne l'écrit).
CREATE POLICY system_events_collector_insert ON system_events FOR INSERT
  WITH CHECK (
    -- 1. Incident global : le collecteur n'écrit jamais un incident de boutique. Un incident
    --    rattaché à une boutique reste du ressort exclusif des parcours métier.
    shop_id IS NULL
    -- 2. Code appartenant au catalogue connu. Un code inventé est refusé par la base, pas
    --    seulement par l'application.
    AND code IN ('export_failure', 'database_failure', 'route_failure', 'application_failure')
    -- 3. Sévérité et catégorie cohérentes avec ce catalogue : une ligne « info » ou une
    --    catégorie libre n'a aucune raison d'entrer par cette porte.
    AND severity IN ('warning', 'critical')
    AND category IN ('export', 'database', 'route', 'application')
    -- 4. Un incident ne naît jamais acquitté : l'acquittement est un acte humain, tracé par la
    --    policy 0018 (UPDATE), jamais posé à la création.
    AND acknowledged_at IS NULL
    AND acknowledged_by IS NULL
    -- 5. Le contexte boutique doit rester ABSENT. S'il était présent, l'insertion relèverait
    --    de la policy 0007 et cette porte serait une échappatoire inutile.
    AND NULLIF(current_setting('app.shop_id', true), '') IS NULL
  );

-- Ce qui n'est PAS accordé ici, volontairement :
--   * SELECT : déjà couvert par la seule policy 0018, réservée au Propriétaire ;
--   * UPDATE : réservé à l'acquittement propriétaire (0018) ;
--   * DELETE : aucune policy, donc aucun rôle applicatif ne supprime un incident. Un journal
--     système que l'application peut effacer ne surveille plus rien.
