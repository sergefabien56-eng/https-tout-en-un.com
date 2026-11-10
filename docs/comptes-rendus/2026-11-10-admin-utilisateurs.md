# Phase 1 — première page d’administration réelle (L6/L10, en cours)

## 1. Livré

- `withAuthorizedGlobalTransaction` : autorise une opération globale seulement si la session est active **et** une permission existe via un rôle `shop_id IS NULL`. Un Gestionnaire limité à une boutique ne reçoit pas « users:read » globalement, même si son rôle l’a pour sa boutique.
- Liste réelle des utilisateurs, paginée par 20, requêtes SQL paramétrées, sans colonne de mot de passe, secret TOTP ni jeton. Pages `/espace/utilisateurs` et `GET /api/admin/users` protégées côté serveur. Une requête directe sans permission reste refusée ; cacher le lien ne constitue pas la sécurité.
- Coquille déplacée dans le layout serveur de `/espace` : toutes ses sous-pages héritent du contrôle de session. Le menu affiche Utilisateurs uniquement avec une permission **globale**.
- CI E2E préparée pour PostgreSQL 16 : base jetable, rôle applicatif `NOBYPASSRLS`, propriétaire **fictif seulement en CI**, bootstrap TOTP et codes de secours, puis scénario Playwright de connexion et d’accès à la liste sur bureau et mobile. Le script de rôle utilise maintenant `current_database()` et non un nom de base codé en dur.

## 2. Tests exécutés

- `npm test` : **117/117**, 17 fichiers. Cinq scénarios d’intégration supplémentaires sous PGlite : propriétaire global autorisé ; gestionnaire limité à une boutique refusé ; gestionnaire global autorisé mais non administrateur système ; session absente refusée ; pagination bornée. Test API 401 sans cookie et test de filtrage du menu.
- `npm run lint`, `npm run typecheck`, `npm run build` : **succès** ; route API et page administrateur compilées.
- `npm audit --audit-level=high` : 7 avis modérés d’outillage, aucun high/critical.
- Le workflow GitHub **précédent** (commit `7460c3d`) a été vérifié **vert sur les trois jobs** : qualité, migrations PostgreSQL 16 et six parcours Chromium publics.

## 3. Décisions et écarts

- `users:read` global et `users:read` boutique sont volontairement distincts dans l’application. La matrice SQL de rôles reste identique ; le champ `user_roles.shop_id` détermine l’étendue.
- Le premier écran administratif est **en lecture seule** : invitation, changement de rôle et réinitialisation demandent encore SMTP, audit transactionnel, CSRF et tests d’attaque.
- Le jeu de test CI est explicitement fictif et reste dans un service PostgreSQL éphémère ; jamais de seed en production.

## 4. Limites connues

- Le **nouveau** parcours Playwright authentifié sur PostgreSQL 16 n’a pas encore été exécuté : il devra être publié puis constaté vert en CI. Pas de serveur PostgreSQL local dans cet environnement.
- La page utilisateurs n’a pas encore de tests d’accessibilité/contraste dans un vrai navigateur connecté, ni les actions d’invitation/réinitialisation. Ne pas déclarer L6/L10 terminés.
- Aucun VPS, domaine ou SMTP identifié ; aucun service n’est en production. La Phase 1 n’est pas terminée.

## 5. Points à vérifier

- Après publication, surveiller le job E2E complet : création du rôle RLS sur PostgreSQL 16, bootstrap admin et connexion sur bureau/mobile. En cas d’échec, corriger sans contourner la RLS ni forcer un secret réel en CI.
- Confirmer la politique d’accès des Gestionnaires globaux à la liste des comptes avant d’activer des mutations.

## 6. Suite

- Compléter l’administration (invitations, rôles, audit), tests E2E authentifiés et accessibilité ; puis les autres pages réellement exploitables et la stratégie d’hébergement à valider avec l’utilisateur avant achat.
