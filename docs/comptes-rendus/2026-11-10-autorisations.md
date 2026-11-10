# Phase 1 — contrôle d’accès boutique (L6, en cours)

## 1. Livré

- Porte serveur `withAuthorizedShopTransaction` : contrôle **dans une seule transaction** de la session non révoquée, du statut actif, de l’existence de la boutique, de l’accès attribué à l’utilisateur et de sa permission précise ; `SET LOCAL app.shop_id` fournit une seconde barrière RLS.
- Seul un **propriétaire global** peut voir une boutique sans ligne explicite dans `user_shop_access`. Un gestionnaire global conserve l’obligation d’être autorisé sur chaque boutique.
- `withAuditedShopMutation` exécute la mutation et l’`INSERT` du journal **dans la même transaction** ; les champs sensibles sont expurgés avant l’écriture en base. Une erreur d’audit annule la mutation.
- Première route métier réellement protégée : `GET /api/shops/[shopId]` — session, `shops:read`, boutique demandée, RLS et filtre `WHERE id = $1` côté serveur. Résultat issu de la base et étiqueté « Réelle » ; aucune boutique fictive en production.
- Matrice indépendante des 31 permissions et des 5 rôles, comparée à la migration SQL.

## 2. Tests exécutés

- `npm test` : **99 tests réussis sur 99**, 13 fichiers ; 8 nouveaux scénarios d’isolation/Audit + 5 tests de matrice (155 combinaisons rôle × permission) + 1 test de refus HTTP 401 sans cookie.
- Scénarios d’intégration sur PostgreSQL WASM (PGlite) : propriétaire A+B ; gestionnaire autorisé sur A mais pas B ; gestionnaire sans accès système ; assistant cantonné à B ; session absente/révoquée ; boutique inexistante ; secret expurgé dans l’audit ; rollback de la mutation si le journal échoue.
- `npm run lint`, `npm run typecheck`, `npm run build` : **succès**. Nouvelle route compilée.

## 3. Décisions et écarts

- L’accès d’un rôle global **non propriétaire** nécessite également `user_shop_access`. Cela évite de donner au gestionnaire l’accès à toutes les boutiques par simple erreur d’affectation.
- L’entrée « boutique inexistante » et « boutique non autorisée » produit le même message neutre afin de ne pas exposer l’existence d’une boutique.
- Une mutation n’est considérée réussie que si l’écriture du journal réussit également.

## 4. Limites connues

- Les tests d’intégration utilisent PGlite ; cette nouvelle porte n’a **pas encore** été testée sur PostgreSQL 16 natif ni en E2E navigateur.
- Une seule route métier utilise pour le moment le garde-fou ; L6 n’est pas terminé : écrans admin, gestion des rôles et couverture de toutes les actions restent à livrer.
- Le callback transactionnel expose encore un `PoolClient` brut : le double filtre SQL `shop_id` doit être revu dans chaque repository. La RLS protège même en cas d’oubli, mais le garde-fou de compilation « impossible d’oublier le filtre » n’est pas encore prouvé.
- La lecture de données globales (audit système, paramètres) nécessitera une porte d’autorisation dédiée, distincte du contexte boutique. La page privée actuelle est une coquille sans données.
- Aucun accès Jumia ni hébergement n’est nécessaire à ces tests ; ni déploiement ni vraie boutique connectée n’ont été testés.

## 5. Points à vérifier

- Exécuter les nouveaux tests sur PostgreSQL 16 en CI **après publication du nouveau code**. Le dernier workflow vert connu porte sur un commit antérieur ; ne pas lui attribuer ces tests.
- Valider les droits de la matrice affichée avant d’ouvrir les écrans d’administration aux utilisateurs réels.

## 6. Suite

- Terminer L5/L6 : codes de secours 2FA, session glissante, invitations/réinitialisation, autorisation des pages et actions, journal d’audit consultable et tests d’attaque.
- Puis L7/L8 : design system et navigation fonctionnelle ; terminer les autres lots et seulement ensuite décider de l’hébergement. **Phase 1 non terminée.**
