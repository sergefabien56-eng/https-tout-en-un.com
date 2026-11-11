# REPRENDRE ICI — source prioritaire de continuité

**État arrêté le 2026-11-11 (UTC ; vérifier la date lors de la reprise).** Base publiée vérifiée : GitHub `main` = `0226bd0890a20dd73bdcf09679003f0077085319` (v34), run Actions `43009896449` terminé **success**, 3 jobs verts, annotation navigateur « 10 passed (1.2m) ». Le présent jalon « mémoire de projet » est un commit *descendant* de v34, préparé dans un clone ; **ne pas confondre commit local et publication sur GitHub**. Relever `git rev-parse HEAD` et `git ls-remote origin refs/heads/main` pour savoir si ce jalon a été publié. Après publication, vérifier la CI du nouveau commit : elle n'est pas héritée du run v34.

## Exactement où se trouve le travail
- `PROJECT_MEMORY/` : 13 fichiers de mémoire ; lire ensuite `AI_HANDOVER.md`, `PROJECT_STATUS.md`, `NEXT_ACTIONS.md`.
- `scripts/project-memory.mjs` : `check` (cohérence), `snapshot [étiquette]` (bundle Git + ZIP source + SHA256), sans toucher aux données ni au schéma.
- `drizzle/0001_*.up.sql` à `0010_*.up.sql` et fichiers `.down.sql` : schéma effectivement migré ; `scripts/migrate.mjs` : suivi des migrations/checksums/transactions ; `scripts/test-backup-restore.mjs` : restauration de **données fictives CI uniquement**.
- `src/core/auth/{service,bootstrap,permissions}.ts`, `src/core/db/{client,shop-scope}.ts`, `src/modules/{identity,notifications,audit,monitoring}/`, `src/app/api/`, `src/ui/` : code implémenté ; consulter les fichiers avant de modifier.
- `tests/{unit,integration,e2e}/`, `.github/workflows/ci.yml` : tests ; `docs/comptes-rendus/2026-11-11-actualisation-notifications.md` : détail v34.

## Fonctions opérationnelles et limites
Connexion et sessions avec TOTP, accès boutiques et rôles, journal, notifications personnelles (marquage lu/non lu et **actualisation manuelle**), pages admin partielles et prévisualisation publique. Vérifié pour v34 par la CI ci-dessus, mais **tests locaux du jalon documentaire : check OK, lint OK, typecheck OK, 159/159 Vitest passés ; build, migrations sur nouvelle branche et E2E non réexécutés**. La CI de ce nouveau SHA reste à vérifier après publication. Pas d'API Jumia réelle, synchronisation, données commerciales, calcul financier validé, SMTP opérationnel, sauvegarde chiffrée externalisée, ni serveur de production. La restauration CI n'est pas un backup de production.

## Écarts / problèmes connus
- Ancien dossier de travail `/home/user` : HEAD `aaa7740…` avec fichiers suivis identiques à v34 mais histoire Git divergente et fichiers non suivis historiques. **Ne pas reset/clean/force-push** ; utiliser le clone descendant ou l'archive de publication.
- `README.md`, `docs/README.md`, `docs/phase-1-plan.md` et `docs/publication-github.md` sont des documents historiques contenant des étapes et affirmations dépassées ; cette mémoire décrit l'état actuel, sans les réécrire rétroactivement.
- `docs/sauvegarde-restauration.md` contient une ancienne mention de 0009 à revalider ; la CI v34 teste 10 migrations, pas une sauvegarde de production.
- Aucun backup hors machine ni hébergement durable n'est confirmé ; conserver l'archive hors sandbox sur votre machine.

## Prochaine action exacte
1. Vérifier `git status --short`, `git rev-parse HEAD`, `git ls-remote origin refs/heads/main` et `node scripts/project-memory.mjs check` ; comparer code et mémoire. Si l'archive de ce jalon n'a pas été publiée, l'importer dans GitHub Desktop et pousser normalement (sans force), puis vérifier Actions du **nouveau SHA**.
2. Fournir domaine/VPS, SMTP, stratégie de sauvegarde chiffrée hors serveur et réponses financières/Jumia ; préparer un staging indépendant avant toute production ; aucune clé dans ce dépôt.
3. Choisir un lot P1 restant dans `NEXT_ACTIONS.md`, snapshot avant et après, tests pertinents, mise à jour de cette mémoire et commit.

**Commande de reprise** : « Lis `PROJECT_MEMORY/RESUME_HERE.md`, puis `AI_HANDOVER.md`. Compare le commit, le code et les tests avec la mémoire, signale les divergences, puis reprends l'action 1 de `NEXT_ACTIONS.md` sans recommencer le projet. »
