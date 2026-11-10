# Phase 1 — consultation des sessions actives (L5, en cours)

## 1. Livré
- `/espace/sessions` et `GET /api/auth/sessions` : liste réelle, bornée à 100 sessions du compte connecté, excluant les sessions révoquées/expirées, avec distinction de la session courante. Accès disponible depuis l'espace privé sur bureau et mobile.
- Vérification transactionnelle du jeton opaque haché et du statut actif du compte avant toute liste ; requête filtrée par `user_id` issu de la base, jamais par un identifiant transmis par le client. Réponses non mises en cache.
- Aucune empreinte de jeton, IP ou chaîne User-Agent brute n'est transmise ; l'appareil est seulement catégorisé « Navigateur » / « Appareil non identifié ». Dates en UTC.

## 2. Tests exécutés
- `npm run lint`, `npm run typecheck`, `npm test` → **125/125**, `npm run build` → succès.
- Tests PGlite : deux sessions du Propriétaire, une du Gestionnaire sans fuite entre comptes ; absence et jeton inventé refusés ; aucun secret ou User-Agent hostile renvoyé. Route sans cookie : 401.
- Parcours Playwright connecté bureau/mobile écrit pour consulter l'écran et l'API, **non encore exécuté dans la CI**.
- Dernière CI publiée v7 (`562e25b`) : trois jobs verts, **8/8 Playwright**, contrôle RLS PostgreSQL 16 passé ; ce résultat ne couvre pas la nouvelle page.

## 3. Décisions
- Lecture seule. La révocation des *autres* appareils exigera CSRF, audit atomique et tests de concurrence avant de proposer un bouton. La déconnexion courante utilise déjà la route protégée existante.
- Pas de valeur User-Agent brute : donnée d'entrée non fiable et susceptible de contenir des informations sensibles.

## 4. Limites
- Pas d'expiration glissante ni de révocation globale dans ce lot. Le champ `last_seen_at` reflète seulement sa valeur enregistrée ; il n'est pas rafraîchi par la lecture de la liste.
- Aucune session d'une autre organisation n'est exposée, mais le produit multi-organisations n'est pas encore livré. Phase 1 non terminée.

## 5. Vérification attendue
- Publier le prochain lot et vérifier qualité, migrations, RLS, ainsi que le scénario navigateur connecté sur les deux formats. Ne pas supposer la CI verte avant le résultat.

## 6. Suite
- Révocation d'une session distante avec CSRF et audit, expiration glissante, puis gestion des invitations et autres fonctions administratives.
