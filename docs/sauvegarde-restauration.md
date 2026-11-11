# Sauvegarde et restauration — état Phase 1

> **Pas prêt pour la production.** Le contrôle CI ci-dessous prouve une restauration d’une base jetable fictive, **pas** la sauvegarde automatique, chiffrée et externalisée du futur serveur.

## Contrôle automatisé préparé

Le job `Migrations (PostgreSQL 16 réel)` lance `scripts/test-backup-restore.mjs` après montée/rollback/réapplication des migrations versionnées.

1. Vérifie que la base et l’environnement sont exactement ceux de la CI jetable (`CI=true`, `APP_ENV=staging`, base `tout_en_un_test` sur `localhost`, utilisateur `postgres`).
2. Insère une application, une boutique et une ligne d’audit **fictives** dans cette base CI.
3. Crée une archive temporaire `pg_dump --format=custom` avec la CLI de l’image `postgres:16`, vérifie son format et son SHA-256. Le premier essai avec une CLI plus récente avait échoué sur `transaction_timeout` ; la correction PostgreSQL 16 a ensuite réussi dans le run CI `42932059433`.
4. Restaure avec `pg_restore --exit-on-error` de la **même image PostgreSQL 16** dans une autre base, `toutenun_restore_ci`.
5. Compare la présence des migrations versionnées, la boutique, l’audit, le nombre de politiques RLS et le `FORCE ROW LEVEL SECURITY` sur `shops` ; vérifie que l’archive n’a pas changé ; détruit la base restaurée et l’archive temporaire.

L’étape est bloquante en CI. La restauration de la version précédente (8 migrations) a réussi dans le run `42932059433` ; **la nouvelle migration 0009 des notifications devra être revalidée en CI**.

## Ce qui manque avant une sauvegarde de production

- Planifier une sauvegarde chiffrée quotidienne avec une clé distincte du serveur applicatif, gérée hors dépôt. Ne jamais envoyer la clé ou un dump dans le chat.
- Stocker une copie hors serveur, avec accès restreint, politique de rétention, contrôle d’intégrité et alertes d’échec ; définir RPO/RTO et vérifier les coûts de stockage.
- Réaliser une restauration **d’un vrai backup chiffré** en environnement de test séparé avec les secrets de l’opérateur, mesurer le délai et documenter les écarts.
- Tester un rollback applicatif N → N−1 sans perte de données, puis la reprise sur l’URL HTTPS définitive.

**Ne pas exécuter le script CI en lui passant l’URL d’une base réelle.** Son archive temporaire n’est pas chiffrée et sa base source est modifiée par des fixtures avant le dump ; ces propriétés le rendent inadapté à la production.
