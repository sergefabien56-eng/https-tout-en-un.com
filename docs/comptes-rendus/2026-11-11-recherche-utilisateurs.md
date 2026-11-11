# Phase 1 — recherche administrative des utilisateurs

## 1. Référence
v25, commit distant `7e241bb`, CI `42979093280` : trois jobs verts (qualité, 10 migrations/restauration PostgreSQL 16, 8 scénarios navigateur bureau/mobile). Décision utilisateur : continuer développement et tests, sans hébergement ni données commerciales réelles pour l’instant.

## 2. Réalisation
Recherche par nom ou adresse e-mail sur la liste des utilisateurs et son API (`q`), pagination conservant le filtre et message vide explicite. Requête SQL paramétrée et bornée (80 caractères maximum, caractères de contrôle refusés), champs de sortie sûrs. Le contrôle `users:read` **global** est fait côté serveur avant toute liste ; un rôle seulement attribué à une boutique ne voit pas les utilisateurs de l’organisation. Le guide utilisateur est mis à jour. Aucune migration nécessaire.

## 3. Vérifications locales
Lint, typage, build et **159/159 tests** réussis. Intégration PostgreSQL WASM : recherche nom/e-mail insensible à la casse, pagination, refus des comptes à rôle boutique, jeton absent et entrées invalides. E2E étendu pour la page et l’API, mais **non rejoué localement sur PostgreSQL 16 réel**.

## 4. Limites
Recherche limitée aux utilisateurs de l’administration, **pas une recherche globale complète**. Pas d’invitation, de modification de compte ou de données Jumia. Le lot n’est ni publié ni validé en CI à cette étape. Application non déployée, Windows 10 du MacBook utilisateur non approprié pour une production exposée.

## 5. Validation attendue
Publier le ZIP descendant de `7e241bb` avec GitHub Desktop sans force push ; vérifier les trois jobs CI et le parcours navigateur bureau/mobile.

## 6. Suite
Élargir la recherche autorisée aux événements du journal et consolider les autres exigences de la Phase 1. Ne pas déclarer terminé sans serveur sûr, HTTPS, tests SMTP et sauvegardes hors serveur restaurées.
