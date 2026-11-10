# Phase 1 — avancement après demande de finalisation rapide

**Statut : en cours. La Phase 1 n'est pas terminée et ne doit pas être déployée en production.**

## Exécuté et vérifié

- Authentification, **primitives seulement** : hachage de mot de passe Argon2id, règle de robustesse, jeton de session opaque/empreinte SHA-256, TOTP RFC 6238 avec protection contre le rejeu (compteur), contrôle CSRF à comparaison constante et vérification d'origine stricte.
- Autorisation par permission et par boutique (un rôle limité à la boutique A ne confère rien sur B).
- Connexion PostgreSQL : transaction avec `SET LOCAL app.shop_id` et remise automatique du client au pool après commit ou rollback ; repository exemple avec filtre SQL **et** RLS.
- Migration 0007 réversible : compteur anti-rejeu TOTP et fermeture de la lecture des journaux globaux lorsqu'aucun contexte boutique n'est défini. Le rôle applicatif a toujours besoin d'un contrôle de permission **côté serveur** avant toute consultation des journaux.
- CI mise à jour pour vérifier également le septième rollback.
- Routes `/api/auth/csrf`, `/api/auth/login`, `/api/auth/logout` : pré-contrôles d’origine et de CSRF testés, authentification par mot de passe + TOTP dans une transaction PostgreSQL, limitation persistante à 10 tentatives par e-mail et par quart d’heure, cookie opaque `HttpOnly` ; aucun compte propriétaire n’est provisionné et ces routes n’ont pas encore subi de test de bout en bout avec PostgreSQL réel.

## Résultats réellement exécutés

- `npm run lint` : succès.
- `npm run typecheck` : succès.
- `npm test` : **75/75 tests réussis** (9 fichiers), dont la migration 0007 et la RLS sous PGlite.
- `npm run build` : succès ; la page d'accueil reste la page de démarrage, **pas encore une interface connectée**.
- `npm audit --audit-level=high` : succès ; **7 avis modérés** subsistent dans l'outillage.

## Non livrés — ne pas assimiler « primitives testées » à « fonctionnalité finie »

- **Aucun parcours de connexion complet et vérifié** (pas de création du premier propriétaire, ni enrôlement TOTP, ni écran 2FA, ni tests sur PostgreSQL natif). Les routes compilent mais ne constituent pas une fonctionnalité livrée.
- Rôles et permissions ne sont **pas encore vérifiés sur toutes les routes/actions**, l'écran d'administration n'existe pas.
- Navigation, design system complet, recherche, notifications, PWA, export, sauvegarde/restauration, HTTPS, déploiement et tests E2E restent à réaliser.
- La CI GitHub et les migrations sur PostgreSQL 16 **n'ont pas été exécutées** faute de runner/serveur accessibles dans l'environnement.

## Dépendances externes pour conclure P1

1. Domaine et accès DNS (HTTPS sur l'URL définitive).
2. VPS avec accès SSH (staging et production séparés).
3. Dépôt GitHub où lancer Actions et configurer les secrets ; partager une invitation ou connecter GitHub, jamais un secret dans le chat.
4. Serveur SMTP transactionnel (invitations et notifications) ; transmettre les paramètres via gestionnaire de secrets, pas dans le chat.
5. Réponse à `docs/questions-ouvertes.md` : pays/devises et modèle d'organisation. Sans décision, les valeurs sont provisoires.

## Chemin critique

L5 (parcours complet de connexion/2FA + tests d'attaque) → L6 (autorisations serveur/audit) → L7–L10 (UI/navigation/recherche/admin) → L11 (domaine/VPS/SMTP, sauvegarde et restauration testée) → L12 (E2E, accessibilité, guide et validation). Le plan initial estime **~24 jours de travail effectifs** pour P1 ; la demande de rapidité ne justifie pas de supprimer les vérifications de sécurité.

**Réponses utilisateur reçues :** le VPS et SMTP seraient disponibles, mais aucun accès ni configuration n’a été fourni. La seule URL fournie est `https://tout-en-en-business-manager.myshopify.com`, qui est une boutique Shopify, **pas** un domaine pour ce SaaS ni une URL GitHub. L’utilisateur confirme qu’il n’a **pas encore créé de dépôt GitHub** et préfère un sous-domaine d’hébergeur provisoire. Il exécutera lui-même les commandes de déploiement avec ses secrets. Aucun de ces services n’a été utilisé/testé à ce stade.

**Préparation additionnelle :** `deploy/Caddyfile`, `deploy/compose.production.yml`, `deploy/.env.production.example` et `docs/deploiement.md` ont été écrits comme modèles **non exécutés** ; ils ne constituent pas une mise en ligne validée.

**Mise à jour — dépôt communiqué :** `https://github.com/sergefabien56-eng/https-tout-en-un.com.git`. Une tentative de `git push --dry-run` a échoué faute d’authentification GitHub dans cet environnement ; **aucun code n’a été poussé et aucune CI distante n’a tourné**. Le bundle Git local vérifié et la procédure `docs/publication-github.md` permettent au propriétaire du dépôt de publier depuis son ordinateur sans partager de jeton. Les vérifications locales ont été rejouées après `npm ci` : 75 tests, lint, typage et build réussis.
