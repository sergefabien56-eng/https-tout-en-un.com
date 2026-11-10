# Création initiale du propriétaire — opération d'administration

> **Non destinée à l'utilisateur final.** Réservée à l'opérateur sur une instance PostgreSQL
> fraîchement migrée. Ne jamais lancer depuis une route Web ni saisir de secret dans le chat.
> Ne pas faire sur une base contenant déjà un utilisateur ; le script refusera.

## Procédure (sur le serveur, pas sur GitHub)

1. Appliquer les migrations `npm run db:migrate` avec un compte PostgreSQL de migration.
2. Stocker le mot de passe propriétaire **dans un fichier privé hors du dépôt** (permissions
   `0600`, au moins 12 caractères et une majuscule, une minuscule, un chiffre, un symbole).
   Ne pas le passer en argument de ligne de commande ni dans une issue GitHub.
3. Préparer dans l'environnement administrateur, hors des journaux :
   - `DATABASE_URL_ADMIN` (connexion à la base migrée, privilèges de création d'utilisateur) ;
   - `APP_ENC_KEYS` et `APP_ENC_ACTIVE` (clés chiffrement 32 octets, identiques à l'application) ;
   - `OWNER_EMAIL`, `OWNER_NAME`, `OWNER_PASSWORD_FILE` ;
   - `TOTP_QR_FILE` et `TOTP_RECOVERY_FILE` (chemins absolus **hors dépôt**, fichiers qui n’existent pas encore).
4. Exécuter `npm run auth:bootstrap`. Dans une transaction, le script vérifie qu'aucun compte
   n'existe, verrouille la création initiale, hache le mot de passe avec Argon2id, chiffre
   le secret TOTP avec AES-256-GCM lié à l'ID utilisateur, affecte le rôle `owner`, puis
   génère **localement** un QR privé et dix codes de secours privés, fichiers `0600`. Il n’imprime aucun mot de passe ni code.
5. Ouvrir **sur l'appareil de l'opérateur** le QR (transfert chiffré si le serveur est distant),
   le scanner avec une application d'authentification, vérifier une connexion réussie,
   conserver les codes de secours hors ligne et effacer le fichier QR de manière appropriée. Ne jamais le déposer sur un partage
   public ni le committer dans Git.

## Limites avant mise en production

- Le script et le service ont été exécutés sous **PGlite** par tests d'intégration ;
  l'exécution du script d'administration sur PostgreSQL 16 natif reste à valider.
- La connexion navigateur complète (cookie, CSRF, navigation, TOTP) n'a pas été testée en E2E.
- Les **codes de récupération et l'enrôlement en libre-service sécurisé** sont à implémenter
  et tester avant d'autoriser l'accès à des données réelles. Ce script n'est pas un substitut
  aux parcours L5/L6 complets.
- Une restauration de base sans les clés `APP_ENC_KEYS` rend le TOTP indéchiffrable ; les
  clés doivent être sauvegardées séparément de la base, avec accès restreint.
