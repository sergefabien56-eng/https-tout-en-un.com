# Phase 1 — filtres des notifications personnelles

## 1. État de départ
v21 (commit `378c215`), CI `42972931497` : trois jobs réussis, dont 10 migrations et restauration PostgreSQL 16, 8 parcours Playwright bureau/mobile. Pas de déploiement de production.

## 2. Modification ciblée
Ajout des filtres « Toutes / Non lues / Lues » sur `/espace/notifications` et `GET /api/notifications?filter=all|unread|read`. La pagination conserve le filtre, le changement de filtre revient à la première page, et un état vide adapté est affiché. Le filtre est validé sur la page et l’API (400 pour l’API invalide ; 404 pour la page invalide). Aucune migration : le champ `read_at` existait déjà.

## 3. Vérifications locales
Lint, typage, build et **155/155 tests** réussis. Test PostgreSQL WASM : combinaison statut/identité RLS, séparation entre comptes et pagination. Le scénario Playwright a été étendu au changement d’état et à la lecture filtrée ; son exécution avec PostgreSQL 16 réel attend la CI.

## 4. Limites
Ce nouveau lot n’est pas encore publié ni validé par la CI. Les notifications d’incident et l’envoi SMTP restent absents ; aucune donnée Jumia réelle n’est produite. La Phase 1 reste ouverte.

## 5. Validation demandée
Publier l’archive descendante de `378c215` avec GitHub Desktop, sans force push ; vérifier les trois jobs CI et, en particulier, les deux tailles d’écran du parcours filtré.

## 6. Suite
Après résultat CI vert, poursuivre le centre de notifications et les autres critères Phase 1 sans simuler de notification critique ni de réception d’e-mail.
