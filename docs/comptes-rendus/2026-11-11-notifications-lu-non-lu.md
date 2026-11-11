# Phase 1 — notifications personnelles : statut lu/non lu

## 1. Périmètre et preuve du lot précédent
- v19, commit distant `9af201e`, CI `42936320505` : **success sur les trois jobs** (qualité, 9 migrations/restauration PostgreSQL 16, navigateur bureau/mobile 375 px). Publication de la nouvelle fonctionnalité ci-dessous non encore constatée.

## 2. Réalisation
- Bouton accessible « Marquer comme lue / non lue » sur chaque notification réelle ; l’interface ne se rafraîchit qu’après confirmation serveur, avec erreur explicite en cas d’échec.
- Route POST individuelle avec contrôle d’origine, jeton CSRF et session ; identifiant numérique validé, identité dérivée du cookie opaque, requête filtrée par `user_id` et RLS. Notification étrangère : 404, sans modification.
- Mutation idempotente sous verrou et écriture dans le journal d’audit **dans la même transaction**, seulement si l’état change. Migration réversible `0010` : politique INSERT étroite pour le journal des notifications personnelles, sans donner accès à sa lecture hors contexte boutique.

## 3. Vérifications locales
- Lint, TypeScript, build et **154/154 tests** réussis. Intégration PGlite : compte étranger refusé, RLS, idempotence, les deux transitions et deux lignes d’audit. Migration up/down testée en local. Scénario navigateur étendu, non rejoué localement avec PostgreSQL réel.

## 4. Limites et risques
- **Nouvelle migration et parcours E2E non encore validés en CI** : attendre les trois jobs, y compris restauration avec 10 migrations et navigateur bureau/mobile. Pas d’envoi e-mail : SMTP/staging non fournis. Aucune URL de production validée. La Phase 1 n’est pas terminée.

## 5. Validation demandée
- Publier le ZIP descendant de `9af201e` avec GitHub Desktop, sans force push ; vérifier tous les jobs et corriger tout échec avant validation du lot.

## 6. Suite
- Regroupement, filtrage des notifications et incidents réellement produits, puis administrations et durcissement prévus au plan P1. Ne jamais simuler un incident ou un e-mail reçu.
