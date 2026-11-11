# Phase 1 — guide utilisateur français (brouillon vérifié)

## 1. Périmètre
Guide `docs/guide-utilisateur.md` décrivant seulement les fonctionnalités visibles dans la version v23 déjà validée en CI : connexion, navigation, boutiques, journal, notifications, utilisateurs, rôles et système.

## 2. Réalisation
Instructions accessibles en français, distinction Réelle / Estimée / Indisponible, mises en garde sur les secrets, limites des fonctions bientôt disponibles. VPS non prêt selon l’utilisateur ; SMTP disponible mais aucun envoi implémenté ni vérifié. Aucun secret demandé.

## 3. Vérification
Lecture du code des pages documentées ; contrôle automatisé de l’existence des huit routes citées et des deux documents opérateur. 1 059 mots. Aucune capture de production fabriquée. Pas de test applicatif relancé, car seul un fichier Markdown a été ajouté.

## 4. Limites
Guide de la version de développement : pas encore d’URL HTTPS ni de capture réelle ; invitation, révocation distante des sessions, recherche globale, courriels et données Jumia restent indisponibles. La Phase 1 n’est pas finie.

## 5. Validation demandée
Relire les termes et parcours du guide. Ne pas le diffuser comme manuel d’une application déjà déployée. Les captures authentiques seront ajoutées une fois un staging disponible.

## 6. Suite
Continuer les fonctionnalités Phase 1 sans VPS, préparer la configuration SMTP standard sans identifiants ; attendre les tests d’envoi et la restauration de production avant toute validation finale.
