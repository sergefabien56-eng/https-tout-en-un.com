# Phase 1 — recherche du journal limitée à une boutique autorisée

## 1. Référence
v27, commit GitHub `9f0a8b5`, CI `42993705541` : trois jobs verts ; navigateur **10 tests réussis sans retry signalé** dans cette exécution. Décision utilisateur : poursuivre développement/tests sans hébergement ni données commerciales réelles pour l’instant.

## 2. Réalisation
Champ de recherche par action ou module dans le journal, transmis à l’API et à l’export CSV. Requête paramétrée, insensible à la casse, 80 caractères maximum, contrôles refusés ; boutique et droit `audit:read` vérifiés côté serveur, RLS maintenue. L’export exige en plus `reports:export`, applique **exactement les mêmes filtres**, indique le terme recherché dans son en-tête et neutralise les formules CSV. Pagination conserve la sélection. Aucun champ `before`/`after` sensible n’est exposé. Pas de migration.

## 3. Tests exécutés
Lint, typage et build réussis ; suite complète précédente **159/159 tests** réussis avant l’ajout des dernières assertions de validation. Après celles-ci, les 20 tests ciblés audit/CSV sont verts. Intégration PostgreSQL WASM : recherche boutique A/B isolée, casse, pagination, entrée trop longue, export filtré et refus d’export non autorisé. Scénario Playwright bureau/mobile étendu, **non exécuté localement sur PostgreSQL 16**.

## 4. Limites
Recherche limitée aux événements d’une boutique connue et autorisée, **pas de recherche globale multi-boutiques**. La CI de ce lot n’est pas encore exécutée. Application non déployée ; aucune alerte SMTP réelle.

## 5. Validation attendue
Publier le ZIP descendant de `9f0a8b5` via GitHub Desktop sans force push ; vérifier trois jobs, résultat Playwright sans flaky, export correspondant aux filtres, et isolation RLS sur PostgreSQL 16.

## 6. Suite
Poursuivre les composants administratifs et d’authentification P1 ; maintenir le principe « sans données fictives en production » et ne pas déclarer la Phase 1 finie avant HTTPS, SMTP et sauvegardes réelles restaurées.
