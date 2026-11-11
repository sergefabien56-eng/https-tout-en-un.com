# REPRENDRE ICI — état exact du projet

**Jalon Phase 1, archive CI du code — préparé après `bf706f194241e4ff6a9a69aa4f4e2d538b6fa78c`.** Ce dernier commit est bien publié sur GitHub `main` : run `43013341355` terminé **success**, trois jobs verts. Le **présent jalon** est un nouveau commit descendant, préparé localement et **pas encore publié/validé en CI** tant que le SHA distant n'a pas changé. Pour constater l'état actuel : `git rev-parse HEAD`, `git ls-remote origin refs/heads/main`, puis lire la conclusion Actions du SHA courant. La date UTC des fichiers peut différer de la date locale de la session.

## Où sont les modifications de ce jalon
- `.github/workflows/ci.yml` : nouveau job `code_archive` après `[quality, migrations, e2e]` verts, uniquement push sur `main`. Checkout complet sans identifiants conservés, `node scripts/project-memory.mjs snapshot ci-main`, vérification SHA256/bundle, dépôt d'un artifact GitHub (`code-valide-<sha>`, rétention demandée 30 jours). **Comportement GitHub non encore testé sur ce nouveau commit**.
- `docs/sauvegarde-restauration.md` : distinction backup du code temporaire et restauration CI de fixtures PostgreSQL (aucune donnée réelle).
- `PROJECT_MEMORY/` : présent état, décisions, risques, suite. Le script `scripts/project-memory.mjs` n'a pas été modifié ; il crée bundle Git, ZIP source et empreintes uniquement sur arbre propre.
- Fichiers applicatifs et schéma inchangés. Code existant : `src/core/auth/{service,bootstrap}.ts`, `src/core/db/{client,shop-scope}.ts`, `src/modules/{identity,notifications,audit,monitoring}/`, `src/app/api/`, UI `src/ui/` ; SQL `drizzle/0001_*.up.sql` à `0010_*.down.sql` ; tests `tests/{unit,integration,e2e}/`.

## Fonctions et preuves
Base Phase 1 : connexion, sessions/TOTP, permissions, boutiques, journal, notifications personnelles avec actualisation manuelle, admin partielle. CI du **précédent** commit `bf706f1` : run `43013341355` réussi (qualité, migrations PostgreSQL 16, navigateur). Pour le **présent** jalon : YAML parsé, `check`, `node --check`, lint, typecheck et 159/159 Vitest réussis localement ; build/DB/E2E non relancés. Ne pas déclarer le nouveau job CI opérationnel avant un run vert et un artifact téléchargé/restauré. Aucune intégration Jumia réelle, données commerciales, worker, SMTP ni hébergement de production validé.

## Limitations et précautions
L'archive GitHub Actions est **temporaire (30 jours demandés, potentiellement moins selon politique), sur le même hébergeur que le dépôt** : ni sauvegarde indépendante, ni sauvegarde PostgreSQL, ni conservation des changements non poussés. Les bases commerciales doivent attendre sauvegarde chiffrée hors serveur, restauration vérifiée, hébergement et secrets gérés hors dépôt. `scripts/test-backup-restore.mjs` opère **uniquement** sur une base CI jetable et y insère des fixtures. Ancien `/home/user` : HEAD local `aaa7740…`, histoire divergente et fichiers non suivis historiques ; **ne pas reset/clean/force-push**. Le clone de publication descendant de GitHub est séparé. Certains `README.md` et plans Phase 0 sont historiques/dépassés.

## Tâche suivante exacte
1. Vérifier le check `node scripts/project-memory.mjs check`, les tests locaux, l'archive du jalon et le commit descendant. Publier via GitHub Desktop sans force push. Sur le **nouveau** run : quatre jobs verts, artifact `code-valide-<sha>` téléchargeable ; télécharger, vérifier `.sha256`, `git bundle verify`, restaurer dans un dossier isolé, comparer SHA ; rapporter les résultats et mettre à jour `PROJECT_STATUS.md`/`NEXT_ACTIONS.md`/ce fichier.
2. Demander **sans secrets** où sont le serveur PostgreSQL et la destination externe chiffrée avant d'automatiser le backup de données ; RPO/RTO/rétention puis restauration testée séparément. Choisir ensuite le prochain petit lot P1 selon code et tests, sans déclarer P1 terminée.

**Prompt de reprise** : « Lis `PROJECT_MEMORY/RESUME_HERE.md` puis `AI_HANDOVER.md`. Vérifie Git, code, migrations, CI, artifact et divergences ; protège les travaux locaux ; poursuis la première action de `NEXT_ACTIONS.md` sans recommencer le projet. »
