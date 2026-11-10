# Phase 1 — rôles et état système (L6/L10, en cours)

## 1. Livré

- Matrice de rôles/permissions **lue depuis PostgreSQL**, sans chiffres ni droits fictifs : page `/espace/roles`, API `/api/admin/roles`. Accès limité au rôle global disposant de `roles:manage` (en pratique, Propriétaire). La matrice est en lecture seule : modifier les cinq rôles système requiert encore une règle métier validée et un audit des écritures.
- Écran `/espace/systeme` et sonde profonde `/api/health/deep`, réservés à `system:manage`. Vérification réelle de la base et du nombre de migrations appliquées ; état de la file de tâches « Indisponible », pas « OK » simulé. Aucune URL de connexion ou clé en réponse.
- Navigation ajustée : seuls les utilisateurs ayant une permission **globale** voient les liens correspondants. Un gestionnaire limité à une boutique n’accède ni à la matrice ni à Système.
- Scénario Playwright connecté préparé pour visiter les trois pages (Utilisateurs, Rôles, Système) sur bureau et mobile et vérifier la sonde profonde sur PostgreSQL 16.

## 2. Tests exécutés

- Local : `npm test` → **121/121 tests**, 17 suites. Tests d’intégration PGlite : matrice de 5 rôles et 31 permissions, refus Gestionnaire (global ou boutique), contrôle de la sonde Système pour le Propriétaire et refus sans session. Tests de routes 401 sans cookie.
- `npm run lint`, `npm run typecheck`, `npm run build` → succès ; routes compilées.
- La dernière exécution GitHub **du code précédent** (commit `0a37245c`) est vérifiée verte sur qualité, migrations PostgreSQL 16 et navigateur bureau/mobile avec connexion 2FA. **Elle ne couvre pas encore ce nouveau code.**

## 3. Décisions et écarts

- Aucune mutation des permissions système n’est exposée tant que son modèle d’audit et sa règle de validation ne sont pas établis. La matrice est consultable et fidèle à la base, pas un formulaire décoratif.
- La sonde profonde est privée ; la sonde publique `/api/health` reste un simple contrôle de vie et ne révèle pas l’état détaillé du système.

## 4. Limites connues

- Le nouveau parcours Playwright sur Rôles et Système est **écrit mais pas encore exécuté sur la CI** ; son résultat ne doit pas être présumé.
- Pas de gestion des invitations, réinitialisation, changement de rôles par UI, journal d’audit consultable, sélecteur de boutique réel ni sauvegarde/restauration. Phase 1 non terminée.
- Pas de VPS ou domaine identifié ; aucun déploiement.

## 5. Points à vérifier

- Publier un lot regroupé et confirmer que l’E2E sur PostgreSQL 16 reste vert après les deux nouveaux écrans.
- Décider ultérieurement si et comment les rôles système peuvent être personnalisés, sans modifier leur migration en place.

## 6. Suite

- Terminer les autres écrans administratifs et les flux de sécurité, puis réaliser les tests E2E connectés et l’audit complet avant d’envisager la mise en ligne.
