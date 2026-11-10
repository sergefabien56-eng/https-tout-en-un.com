# Phase 1 — lecture du journal par boutique (L6, étape serveur)

## 1. Livré
- `GET /api/shops/[shopId]/audit` : 20 événements maximum par page, filtres validés sur module et identifiant d'acteur, pagination bornée. Requêtes SQL paramétrées.
- L'accès exige dans **la même transaction** : session active, accès à la boutique, permission `audit:read`, `SET LOCAL app.shop_id`, puis `WHERE shop_id = $1` explicite. Les événements globaux ne sont pas divulgués par la route boutique.
- Résultats non mis en cache ; seuls date, acteur (identifiant), module, action, entité et résultat sont exposés. Les objets `before`/`after` ne sont pas envoyés : ils nécessitent une revue avant toute exposition.

## 2. Tests exécutés
- `npm run lint`, `npm run typecheck`, `npm test` → **129/129**, sur 17 fichiers.
- Tests PGlite avec politiques RLS réelles : le Propriétaire distingue boutique A/B, le Gestionnaire limité à A ne voit pas B, l'Assistant sans `audit:read` reçoit 403, l'absence de session 401 ; événements globaux et données potentiellement sensibles exclus de la réponse. Filtre hostile rejeté (400).
- Le contrôle RLS PostgreSQL 16 de la CI publiée v10 (`3c32f0d`) est vert, mais la **nouvelle route** n'a pas encore été exécutée en CI.

## 3. Décisions
- L'entrée du menu Journal d'activité reste « Bientôt » tant qu'un sélecteur de boutique autorisé et la page de consultation ne sont pas prêts ; pas de fausse vue « toutes les boutiques » ni de contournement RLS global.
- L'audit global exige un modèle d'autorisation distinct : il n'est pas exposé par l'API boutique.

## 4. Limites
- Pas encore de page consultable, de filtres de période, d'export neutralisé ou de comparaison avant/après. La vérification PostgreSQL de la nouvelle route et le scénario E2E sont à compléter. Phase 1 non terminée.

## 5. Vérification attendue
- Publier le prochain lot, vérifier qualité/migrations/E2E ; étendre l'intégration navigateur après raccordement au sélecteur de boutique réel.

## 6. Suite
- Choix de boutique filtré serveur et écran d'audit lisible, puis filtres supplémentaires et export sécurisé.
