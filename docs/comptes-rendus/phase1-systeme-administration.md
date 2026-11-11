# Phase 1 — interface et administration : état Système

## Objectif dans le chantier L10

Compléter la partie vérifiable de l'écran Système existant, accessible uniquement au rôle global `system:manage`, sans promettre de worker, de sauvegarde ou de production. Même source autorisée `getDeepHealth()` pour la page et `/api/health/deep` : version définie par la configuration du code, environnement déclaré, nombre réel de migrations et durée mesurée de la requête de contrôle. La latence n'est ni une mesure réseau utilisateur ni une garantie de disponibilité. La file reste explicitement indisponible.

## Sécurité et limites

Aucun secret, adresse de base, configuration SMTP, nom d'hôte ou état de sauvegarde n'est exposé. API `no-store`, refus 401 sans session et 403 sans permission globale ; page redirige connexion ou masque 403. Pas de nouvelle migration, pas de changement de droits. Tests d'intégration existants renforcés (owner / manager / absence de session, projection sans secret) ; test navigateur bureau/mobile compare affichage et API.

Ce sous-lot **ne termine pas L10** : invitations par e-mail, paramètres administratifs généraux, file/worker, exports et autres écrans restent à cadrer et réaliser ; aucun service factice déclaré fonctionnel. Windows en pause. Aucun hébergement ni vraie donnée.

## Contrôles locaux

TypeScript, lint, 24/24 tests unitaires ciblés (routes d'accès, navigation), découverte des 10 E2E et cohérence mémoire/diff : OK. Test d'intégration PGlite renforcé et E2E effectifs **non exécutés localement** (sandbox sujet à OOM) : la CI du **nouveau SHA** devra les valider avant de déclarer ce sous-lot terminé.
