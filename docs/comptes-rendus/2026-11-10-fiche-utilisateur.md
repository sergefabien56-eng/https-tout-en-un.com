# Phase 1 — fiche utilisateur et publication du lot (en cours)

## 1. Livré
- Fiche `/espace/utilisateurs/[id]` et API `GET /api/admin/users/[id]` : données réelles du compte et attributions de rôles réelles, avec distinction explicite rôle global / rôle limité à une boutique. Les noms de boutiques ne sont pas interrogés sans contexte RLS : affichage de leur identifiant, pas de nom inventé.
- Accès vérifié côté serveur par session active et `users:read` sur un rôle **global** ; les identifiants malformés sont refusés ; requêtes paramétrées ; aucune colonne de secret, mot de passe ou jeton dans la réponse ; `Cache-Control: no-store`.
- Nouveau parcours Playwright CI prévu pour consulter la fiche du propriétaire après connexion 2FA. Le même lot comprend la matrice des rôles et l’état Système décrits dans `2026-11-10-roles-systeme.md`.

## 2. Tests exécutés
- `npm run lint`, `npm run typecheck`, `npm run build` : succès, nouvelles routes compilées.
- `npm test` : **123/123 tests** sur 17 fichiers ; tests d’intégration PGlite pour la portée des rôles, les 401/403 et les données non sensibles ; tests de route pour identifiant malformé et absence de session.
- Le **nouveau** parcours Playwright connecté des pages Rôles, Système et fiche utilisateur **n’a pas encore été exécuté** sur PostgreSQL 16. La dernière CI verte vérifiée porte sur le lot antérieur `0a37245c` uniquement.

## 3. Décisions
- Lecture seule : pas de mutation de rôle, de statut ou d’invitation avant journalisation, CSRF, politiques métier et tests de concurrence.
- Aucune donnée fictive en production ; données CI fictives dans PostgreSQL jetable uniquement.

## 4. Limites
- Pas de PostgreSQL natif disponible dans l’environnement de développement ; PGlite pour les tests locaux et PostgreSQL 16 dans la CI après publication.
- Pas de connexion Jumia réelle, worker, sauvegarde/restauration ni déploiement. Phase 1 non terminée.

## 5. Vérification attendue
- Publier le prochain ZIP avec GitHub Desktop, puis vérifier que les jobs qualité, migrations PostgreSQL 16 et navigateur connecté bureau/mobile sont tous verts ; corriger tout échec avant de poursuivre.

## 6. Suite
- Sélecteur et accès boutiques réels, audit consultable sous RLS, administration transactionnelle, puis sécurité/déploiement/guide et validation finale de Phase 1.
