# Phase 1 L10 — export protégé des utilisateurs

## Périmètre

La page `/espace/utilisateurs` propose un lien CSV qui conserve recherche, statut et rôle, indépendamment de la page de pagination. Route GET `/api/admin/users/export` non cachée, téléchargement UTF-8 CSV, fichier `utilisateurs.csv`, `nosniff`. Champs exportés uniquement : ID, nom, e-mail, statut et date UTC ; aucune empreinte de mot de passe, jeton, secret 2FA, rôle détaillé, donnée de boutique ni champ non sélectionné. Métadonnées : périmètre organisation/droits globaux, date UTC d'export et filtres appliqués. Maximum 10 000 lignes : au-delà, erreur 400, pas de fichier partiel. Pas de migration ni de modification de permissions.

La liste et l'export partagent la validation des filtres et la condition SQL paramétrée (`users:read` global). L'export exige **en plus** `reports:export` au niveau global dans la même transaction autorisée. Un rôle limité à une boutique ne donne jamais le droit d'exporter les utilisateurs de l'organisation. Les cellules passent par la neutralisation CSV existante, déplacée dans `src/core/export/safe-csv.ts` et conservée à l'import historique de l'audit ; valeurs commençant par `=`, `+`, `-`, `@`, même après espace/BOM, sont neutralisées. Aucun secret dans le CSV, pas de données réelles utilisées en test.

## Contrôles et limites

TypeScript, ESLint, 34/34 tests unitaires ciblés (barrières API, CSV hostile, navigation), découverte 10 E2E, contrôle mémoire/diff : OK. Test d'intégration PGlite ajouté (fixture fictive hostile, filtres, droits et absence de secrets) et parcours E2E CI modifié (lien/CSV/400) **non exécutés localement** : le sandbox a subi des OOM PGlite lors du lot précédent. La CI du nouveau SHA doit les valider. Le seul export CSV des utilisateurs n'achève ni les autres exports L10, ni les invitations, ni la Phase 1.
