# Déploiement — procédure opérateur (non exécutée)

> Ce document décrit un **modèle non encore validé sur un VPS**. Ne déployez pas une
> application contenant des données réelles avant la validation P1/L11, une sauvegarde
> chiffrée hors serveur et sa restauration testée. Le code dispose d'un bootstrap
> propriétaire local et d'écrans administratifs partiels, mais n'est pas prêt pour la production.

## Prérequis

- VPS Debian 12/13, Docker Engine/Compose, 2 vCPU et 4 Go RAM minimum ; ports 80/443 ouverts.
- Un **domaine ou sous-domaine contrôlé** : enregistrement DNS `A` vers l'adresse du VPS,
  pour l'application et pour le staging **distinct**. Caddy obtient ensuite le HTTPS.
- L'adresse `*.myshopify.com` donnée dans la conversation est une boutique Shopify, **pas**
  un domaine pour cette application Next.js indépendante. Ne pas configurer `APP_DOMAIN`
  avec cette adresse.
- Le dépôt GitHub et la CI sont actifs ; cela ne signifie pas que l’application est déployée.
  Le staging/prod exige une configuration et des secrets **distincts** à préparer par l’opérateur.
- SMTP et clés de chiffrement fournis **hors du dépôt et hors du chat**.

## Dépôt existant

Le dépôt GitHub est déjà créé. **Ne recréez pas le dépôt, ne modifiez pas son remote et
n’utilisez pas de force push.** La CI valide les commits publiés, pas l’hébergement.

## Préparation des secrets (sur le serveur, jamais dans le chat)

```sh
cd deploy
cp .env.production.example .env.production
chmod 600 .env.production
# Pour chaque clé distincte de 32 octets : openssl rand -base64 32
# Modifier .env.production avec les vraies valeurs : APP_URL, APP_DOMAIN, SMTP, etc.
# Définir un mot de passe distinct pour le rôle applicatif PostgreSQL.
```

**Attention :** la création du rôle applicatif requiert une étape administrateur.
`scripts/db-roles.sql` doit être exécuté après les migrations avec `psql` et une
variable `app_password` fournie par l'environnement sûr. Ce script a été exercé en CI sur PostgreSQL 16 avec le rôle non privilégié. Le rôle doit être `NOSUPERUSER NOBYPASSRLS` ; si
l'application tourne avec l'administrateur, la RLS est sans effet !

## Validation avant toute mise en ligne

1. Migrer une base jetable sur PostgreSQL 16 ; rollback complet ; appliquer à nouveau.
2. Tester le rôle applicatif, la RLS et la limitation des tentatives sur une base de staging indépendante.
3. Tester le scénario complet propriétaire + TOTP + session + révocation, puis les
   attaques de contournement et le filtrage par boutique.
4. Consulter `docs/sauvegarde-restauration.md` : la restauration CI jetable ne remplace pas
   une sauvegarde chiffrée de production, externalisée et restaurée réellement.
5. Vérifier l'URL HTTPS permanente, les en-têtes, le SMTP et la séparation staging/prod.

La présence de `deploy/compose.production.yml` et de `deploy/Caddyfile` **ne suffit pas**
à considérer ces contrôles comme exécutés.
