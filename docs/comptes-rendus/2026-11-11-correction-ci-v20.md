# Phase 1 — correction de la CI du statut lu/non lu

## 1. Constat vérifié
CI v20, commit `b3ce9f5`, run `42972277034` : **failure**. Job qualité échoué sur le test d’authentification et job migrations échoué au rollback ; navigateur non exécuté car dépendant des deux premiers jobs. L’annotation du test montre un `sessions_expiration_ck` sur une session dont l’expiration était déjà passée ; le workflow conservait une boucle de 9 rollbacks pour 10 migrations.

## 2. Corrections
- Test d’authentification : remplacer la date fixe de novembre 2026 par un instant courant unique réutilisé sur les appels, pour que le test de rejeu vérifie bien le même code TOTP sans fabriquer une session antérieure à l’horloge réelle de PostgreSQL.
- Workflow : dériver le nombre de rollbacks de `schema_migrations` dans la base CI ; exiger un nombre strictement positif, annuler chaque version appliquée, vérifier zéro, puis réappliquer toutes les migrations. Aucun contournement de migration ni du contrôle d’expiration.

## 3. Vérifications exécutées
Local : lint, typage, build et **154/154 tests** réussis. PostgreSQL 16 réel et parcours navigateur ne sont pas disponibles localement et attendent la nouvelle CI.

## 4. Limites
Le run v20 reste rouge ; la nouvelle archive ne constitue pas une preuve de CI verte. Phase 1 non déployée et non terminée.

## 5. Validation attendue
Publier le correctif descendant de `b3ce9f5` sans force push ; confirmer les trois jobs et la restauration indépendante avec 10 migrations. En cas d’échec, exploiter les annotations/logs précis.

## 6. Suite
Après validation CI, reprendre le lot suivant de la Phase 1 ; ne pas annoncer la mise en ligne tant qu’un serveur, HTTPS, SMTP et des sauvegardes de production n’ont pas été réellement vérifiés.
