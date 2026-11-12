# L10 — premiers paramètres d'organisation

## Portée

Nouvelle page `/espace/parametres` dans le menu Administration (droit **global** `settings:read`) et API `/api/admin/settings` en lecture/écriture. Sous-lot volontairement borné au **fuseau de référence de l'organisation** : valeurs fermées Africa/Abidjan, UTC et Europe/Paris ; `null` signifie non configuré. Pas de valeur provisoire enregistrée à l'insu du propriétaire. Modifier exige `settings:manage` **global**, session active, Origin conforme et CSRF ; la mise à jour de `app_settings` et l'événement d'audit `settings.update_timezone` partagent une transaction. Pas de migration : table et permissions existantes. Aucun secret de la table n'est énuméré : lecture par clé unique et réponse projetée, sans métadonnées sensibles.

Le fuseau est **seulement enregistré** à ce stade : les dates affichées dans les écrans existants restent UTC et aucun calcul métier ne l'utilise. Devise non configurée tant que le pays/devise ne sont pas décidés ; notifications e-mail indisponibles sans SMTP fiable ; apparence personnelle déjà disponible sur son écran. La page le dit explicitement, sans faire croire que ces services fonctionnent. Aucun droit/RLS ou écran existant supprimé.

## Contrôles et limites

Snapshot du code avant lot sur `e4d3705` copié et contrôlé sous `/home/user/continuity-backups/`. Local : TypeScript, ESLint des fichiers touchés, 3 tests unitaires de navigation, découverte de 10 scénarios E2E et contrôle de mémoire/diff passés. Test d'intégration PGlite renforcé (lecture globale, refus scoped/anonyme, validation, audit/idempotence), mais **non exécuté avec succès localement** : worker Vitest tué dans le sandbox à mémoire limitée, même en exécution isolée. Parcours Playwright PostgreSQL 16 et build de ce nouveau code **non exécutés localement** ; CI du futur SHA obligatoire avant validation. Pas d'installation PC, de données réelles ni de production.
