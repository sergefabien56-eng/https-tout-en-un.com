# Phase 1 — expiration glissante des sessions (L5, en cours)

## 1. Livré
- Endpoint `POST /api/auth/refresh` : origine attendue + double-submit CSRF, cookie opaque HttpOnly, SameSite Strict et Secure en HTTPS. La base vérifie et verrouille la session avant de prolonger de 12 h **uniquement si elle est toujours active, non révoquée, non expirée et rattachée à un utilisateur actif**.
- Une écriture au plus toutes les cinq minutes par session ; le cookie reprend exactement la date `expires_at` stockée, même si une requête trop rapprochée ne déclenche pas de prolongation. Aucune reconnexion silencieuse si la session a expiré.
- Une page privée visible appelle le renouvellement toutes les cinq minutes. En cas d'erreur réseau, elle ne simule pas de renouvellement ; la session expirera normalement. Le secret de session n'est jamais accessible à JavaScript.

## 2. Tests exécutés
- `npm run lint`, `npm run typecheck`, `npm test` : **127/127** ; `npm run build` : succès local.
- PGlite : session active prolongée, second appel rapproché sans nouvelle extension, sessions expirée/révoquée refusées. Route sans Origin/CSRF : 403 ; sans session : 401.
- Scénario navigateur CI préparé pour exercer la route avec CSRF et confirmer que l'accès reste actif ensuite ; **non exécuté à ce stade**.
- Dernière CI du code publié v9 (`52471e3`) : qualité, migrations/RLS et E2E bureau/mobile verts ; ce résultat ne couvre pas le présent changement.

## 3. Décisions
- Pas de renouvellement par requête GET (évite de prolonger une session au simple chargement d'une ressource). Seul le POST protégé peut muter la durée.
- Le client ignore les échecs de renouvellement : un utilisateur expiré sera redirigé vers la connexion lors de sa prochaine navigation privée, sans inventer un état connecté.

## 4. Limites
- Pas encore de révocation globale ou distante, ni de notification des appareils ; cette extension ne remplace pas le contrôle contre le vol de cookie. Pas de déploiement serveur. Phase 1 non terminée.

## 5. Vérification attendue
- Publier un paquet descendant du dernier commit distant et constater les trois jobs verts, particulièrement l'authentification et le POST de renouvellement sur PostgreSQL 16.

## 6. Suite
- Revocation distante sous CSRF + audit atomique, tests d'attaque, puis autres écrans et exigences de mise en ligne.
