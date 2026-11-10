# Déploiement — procédure opérateur (non exécutée)

> Ce document décrit un **modèle non encore validé sur un VPS**. Ne déployez pas une
> application contenant des données réelles avant la validation P1/L11, la sauvegarde
> et la restauration testée. À ce jour, il n'y a pas d'interface métier ni de parcours
> d'enrôlement du premier propriétaire.

## Prérequis

- VPS Debian 12/13, Docker Engine/Compose, 2 vCPU et 4 Go RAM minimum ; ports 80/443 ouverts.
- Un **domaine ou sous-domaine contrôlé** : enregistrement DNS `A` vers l'adresse du VPS,
  pour l'application et pour le staging **distinct**. Caddy obtient ensuite le HTTPS.
- L'adresse `*.myshopify.com` donnée dans la conversation est une boutique Shopify, **pas**
  un domaine pour cette application Next.js indépendante. Ne pas configurer `APP_DOMAIN`
  avec cette adresse.
- Un dépôt GitHub et des secrets Actions, à créer. Les fichiers CI sont déjà écrits ;
  ils ne peuvent pas être déclarés « verts » avant leur première exécution.
- SMTP et clés de chiffrement fournis **hors du dépôt et hors du chat**.

## Préparation d'un dépôt (commandes à lancer vous-même)

```sh
# Créez d'abord un dépôt GitHub privé dans votre compte ; copiez ensuite son URL.
git remote add origin git@github.com:VOTRE_COMPTE/VOTRE_DEPOT.git
git branch -M main
git push -u origin main
# Dans GitHub > Actions, ouvrir le premier workflow CI ; réparer tout échec.
```

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
variable `app_password` fournie par l'environnement sûr. Ce script n'a pas encore été
validé sur PostgreSQL réel. Le rôle doit être `NOSUPERUSER NOBYPASSRLS` ; si
l'application tourne avec l'administrateur, la RLS est sans effet !

## Validation avant toute mise en ligne

1. Migrer une base jetable sur PostgreSQL 16 ; rollback complet ; appliquer à nouveau.
2. Tester le rôle applicatif, la RLS et la limitation des tentatives sur la base réelle.
3. Tester le scénario complet propriétaire + TOTP + session + révocation, puis les
   attaques de contournement et le filtrage par boutique.
4. Tester une sauvegarde **et** sa restauration sur une base indépendante.
5. Vérifier l'URL HTTPS permanente, les en-têtes, le SMTP et la séparation staging/prod.

La présence de `deploy/compose.production.yml` et de `deploy/Caddyfile` **ne suffit pas**
à considérer ces contrôles comme exécutés.
