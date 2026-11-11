# Phase 1 — essai de restauration PostgreSQL indépendant (L11, préparation)

## 1. Livré
- Script `scripts/test-backup-restore.mjs` **réservé à la base PostgreSQL CI jetable** : insertion de fixtures fictives, archive custom `pg_dump`, vérification archive/SHA-256, restauration `pg_restore --exit-on-error` dans une deuxième base distincte ; comparaison des migrations, boutiques, audit, nombre de policies et FORCE RLS. Nettoyage de la seconde base et de l'archive en `finally`.
- Étape bloquante ajoutée au job migrations PostgreSQL 16. `docs/sauvegarde-restauration.md` distingue explicitement ce contrôle CI d'une sauvegarde chiffrée hors serveur. `docs/deploiement.md` nettoyé de ses indications périmées sur l'état du dépôt et de la CI.

## 2. Tests exécutés
- Local : `node --check` valide la syntaxe ; exécution sans `CI` **refusée (exit 1)** avant connexion ; lint, typage, **149/149 tests** et build verts.
- **Pas de PostgreSQL natif, pg_dump ni pg_restore local** : la restauration sur PostgreSQL 16 ne peut être déclarée réussie avant le job CI modifié. Le dernier run publié v15 `42929033068` était vert, mais ne contenait pas ce test.

## 3. Décisions
- Le script exige CI, environnement staging, hôte local, utilisateur postgres et nom de base exact. Cela réduit les erreurs involontaires ; ce n'est pas un outil de production ni une barrière si un opérateur lui fournit volontairement les identifiants d'une base réelle.
- L'archive temporaire n'est **pas chiffrée**. Elle ne contient que des données de test et est supprimée. Aucun dump n'est joint aux artefacts GitHub.

## 4. Limites
- Pas encore de backup quotidien chiffré, externalisé, surveillé, ni de restauration d'un véritable backup chiffré ; pas de RPO/RTO validé, pas de VPS ou domaine. Phase 1 non terminée et déploiement interdit avec données réelles.

## 5. Vérification attendue
- Publier un lot et vérifier les jobs qualité, migrations (particulièrement « Sauvegarder et restaurer… ») et navigateur. Corriger toute incompatibilité `pg_dump`/`pg_restore` plutôt que contourner le contrôle.

## 6. Suite
- Concevoir le backup de production chiffré avec clé distincte, rétention et copie hors serveur, puis effectuer une restauration complète en environnement distinct avant la mise en ligne. Les commandes de production seront exécutées par l'utilisateur sur son infrastructure, sans secret dans ce chat.
