# Phase 1 — lot connexion : état vérifié

## Réalisé

- Écran de connexion en français (`/connexion`) : e-mail, mot de passe, code à six chiffres, états chargement/erreur, champs accessibles et adaptés au mobile.
- Espace privé (`/espace`) protégé par contrôle de session en base côté serveur ; il n'affiche aucun chiffre fictif.
- Endpoint `/api/auth/me` : session nécessaire ; réponse sans cache.
- Déconnexion via route serveur avec contrôle d'origine et CSRF.

## Vérifications exécutées (2026-11-10)

- `npm run lint` : succès ; `npm run typecheck` : succès ; `npm run build` : succès.
- `npm test` : **76 tests réussis sur 76** (9 fichiers).
- Serveur de développement démarré : `GET /connexion` → **HTTP 200** ; `GET /espace` sans cookie → **HTTP 307 vers /connexion** ; `GET /api/auth/me` sans cookie → **HTTP 401**.

## Non validé / non terminé

- Le formulaire n'a pas été testé avec un **vrai propriétaire** : aucun utilisateur n'est provisionné et aucune base PostgreSQL locale n'est disponible.
- Aucun enrôlement initial TOTP, invitation, récupération, matrice complète de permissions, audit applicatif, tests E2E ni test de navigation clavier n'est livré.
- La prévisualisation est une **maquette interactive du parcours**, pas un service de connexion prêt à l'emploi ; sans base et configuration, une tentative de connexion échoue normalement.
- La Phase 1 n'est pas finie. Aucun achat de VPS n'est requis pour continuer les lots locaux ; la mise en ligne attendra une décision d'hébergement.
