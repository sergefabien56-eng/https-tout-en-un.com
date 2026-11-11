# Phase 1 — notifications réelles de connexion (L9, première tranche)

## 1. Livré
- Migration réversible `0009_notifications` : table de **notifications de compte**, utilisateur obligatoire, boutique facultative uniquement pour un événement de compte global ; index par utilisateur/date ; RLS `FORCE` sur `app.notification_user_id` local à la transaction.
- Une connexion **réussie avec 2FA** écrit, dans la même transaction que la session, une notification « Nouvelle connexion ». Aucun mot de passe, jeton, TOTP, User-Agent ni IP dans le texte. Un échec de connexion ne crée pas de notification.
- `/espace/notifications` et `GET /api/notifications` listent uniquement les notifications du compte authentifié, 20/page, sans cache. Lien réellement fonctionnel dans le menu et l’icône de la barre. L’écran indique explicitement que les notifications Jumia et l’e-mail ne sont pas encore disponibles.
- CI adaptée : montée/descente de 9 migrations, comparaison de 9 migrations après restauration, tests RLS PostgreSQL du refus de lire/écrire les notifications d’autrui, parcours connecté bureau/mobile vérifiant la notification créée par connexion.

## 2. Tests exécutés
- Local : lint, typage, **153/153** sur 20 fichiers, build. PGlite : notification créée lors de la vraie connexion, isolation des comptes via RLS, refus sans contexte et refus d’insertion vers un autre utilisateur ; route sans cookie : 401.
- La **nouvelle migration, l’insertion via le rôle PostgreSQL CI et l’E2E** ne sont pas encore exécutés en GitHub Actions. La CI antérieure v17 (`42932059433`) avait trois jobs verts avec 8 migrations ; elle ne couvre pas ce lot.

## 3. Décisions
- Première catégorie uniquement : connexion de sécurité réelle. Aucun compteur non lu simulé, pas de bouton « marquer comme lu » sans mutation sécurisée et auditée. Pas de fausse alerte Jumia.
- L’écriture est atomique avec la session : si la notification ne peut être insérée, la connexion échoue plutôt que d’ouvrir une session dont l’événement de sécurité manque.

## 4. Limites
- Pas de regroupement, filtres lu/non lu, marque lu, alertes Jumia, service SMTP ou e-mail d’incident. La notification de connexion ne prouve pas ces fonctions. Phase 1 non terminée, aucun déploiement.

## 5. Vérification attendue
- Publier le prochain paquet et contrôler les trois jobs, surtout migration 0009, restauration avec 9 migrations, RLS sous rôle applicatif et connexion Playwright générant/affichant une notification.

## 6. Suite
- Notifications d’incident avec producteurs réels et permission boutique, action de lecture auditée, puis SMTP transactionnel sur staging séparé et exigences de sécurité restantes.
