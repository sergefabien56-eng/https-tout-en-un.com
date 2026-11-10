# Phase 1 — catalogue autorisé et journal par boutique (L3/L6/L8/L10, en cours)

## 1. Livré
- Migration réversible `0008_shop_catalog` : autorise la lecture du catalogue des boutiques pour un utilisateur **authentifié côté serveur** dans une transaction avec `app.list_user_id` local. La policy vérifie rôle, permission `shops:read`, périmètre de rôle et `user_shop_access.can_view`. Sans contexte, les boutiques et accès restent invisibles ; les autres tables métier ne sont pas ouvertes.
- Catalogue réel paginé (50/page) : `/espace/boutiques` et `GET /api/shops`. L’état vide reflète réellement les droits du compte ; aucune boutique Jumia fictive en production. La page privée d’accueil n’affirme plus qu’il n’existe aucune boutique lorsque l’utilisateur en possède.
- `/espace/journal?shop=…` : choix de boutique depuis le catalogue, puis événement d’audit borné et filtré côté serveur sous `audit:read` et RLS. Sans choix, message explicite et lien vers les boutiques. `GET /api/shops/[shopId]/audit` reste limité au shop sélectionné ; pas d’événement global ni de `before`/`after` potentiellement sensibles.
- Deux liens de navigation désormais prêts : « Toutes les boutiques » et « Journal d’activité ». Barre supérieure « Choisir une boutique » sans afficher un faux périmètre « toutes les boutiques ».

## 2. Tests exécutés
- `npm run lint`, `npm run typecheck`, `npm test` : **133/133** sur 18 fichiers ; `npm run build` réussi.
- PGlite + RLS : propriétaire voit A/B, gestionnaire avec accès A ne voit que A, rôle limité à B ne voit que B ; révocation de l’accès A masque A immédiatement. Journal A/B isolé ; assistant sans permission refusé ; événements globaux et secrets exclus.
- CI PostgreSQL 16 **préparée** pour tester réellement les nouvelles policies avec rôle applicatif, y compris l’absence de fuite du journal depuis le contexte catalogue. Migration 8 testée en montée/descente dans le workflow ; E2E bureau/mobile enrichi pour l’état vide et les refus. **Nouveau lot non exécuté en CI avant publication.**

## 3. Décisions
- Le sélecteur complet (recherche, statut/plateforme, mémorisation et propagation `?shop=` sur plusieurs pages, 100+ boutiques) reste à livrer ; ces pages sont la première tranche réelle. Aucun droit n’est accepté depuis le navigateur seul.
- Pas de lecture du journal « toutes les boutiques » sans autorisation globale et stratégie d’agrégation sous RLS : un seul shop à la fois pour l’instant.

## 4. Limites
- Les filtres page du journal n’exposent pas encore module, acteur et période ; API module/acteur uniquement. Pas d’export, comparaison avant/après, notifications, invitations ou déploiement. Phase 1 non terminée.
- PostgreSQL natif indisponible localement : la nouvelle migration et le test CI RLS doivent être confirmés sur PostgreSQL 16 après publication.

## 5. Vérification attendue
- Publier le prochain ZIP puis vérifier qualité, rollback/réapplication des 8 migrations, étape RLS réelle et parcours navigateur connecté bureau/mobile. Corriger tout échec sans désactiver les policies.

## 6. Suite
- Sélecteur accessible avec recherche, statut et conservation du périmètre, filtres et export d’audit neutralisé, puis administration des invitations/rôles et sauvegarde/restauration.
