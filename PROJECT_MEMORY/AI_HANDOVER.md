# Passation à une autre IA / fin de session

## À lire et à vérifier en premier
1. Lire `RESUME_HERE.md`, puis ce fichier, `PROJECT_STATUS.md` et `NEXT_ACTIONS.md` ; ne pas reconstruire le projet depuis zéro.
2. Exécuter `git status --short`, `git log -3 --oneline`, `git rev-parse HEAD`, `git ls-remote origin refs/heads/main`, `node scripts/project-memory.mjs check` ; comparer preuves, code (`src/`, `drizzle/`, tests) et mémoire, signaler tout écart. Ne pas se baser sur les anciennes affirmations du README Phase 0.
3. Si clone ancien ou main distant divergent, sauvegarder et travailler sur un clone/branche du main distant, jamais force push/reset destructeur. Ne jamais envoyer secret, `.env`, dump, jeton ou compte utilisateur dans une archive.

## Sauvegarde du CODE et restauration (pas des données commerciales)
- Sur arbre **propre et committé**, exécuter `node scripts/project-memory.mjs snapshot avant-NOM` avant changement, puis `snapshot apres-NOM` après commit. Sortie par défaut `.project-backups/`, ignorée par Git, avec `.bundle` (historique), `.zip` (code du HEAD), `.sha256`. Le nom de snapshot ne contient pas de secret. Vérifier `sha256sum -c <fichier.sha256>` et `git bundle verify <bundle>` ; **transférer réellement** ces fichiers vers un emplacement durable contrôlé par le propriétaire. Un dossier local n'est pas un backup hors site.
- Restauration isolée : `git clone /chemin/sauvegarde.bundle restauration-test` ; `cd restauration-test && git log -1 --oneline` ; comparer SHA attendu et lancer tests. Si bundle absent mais ZIP présent, `unzip ... -d restauration-test` restaure des sources **sans historique**. Ne jamais restaurer par-dessus un arbre avec modifications non committées. Un bundle ne contient pas de fichiers non suivis ni de base de données.
- Données PostgreSQL : suivre `docs/sauvegarde-restauration.md` ; le script `scripts/test-backup-restore.mjs` modifie une **base CI jetable** et ne doit jamais cibler production. Le plan chiffré externe reste à installer/tester avant production.

## Protocole STOP / PAUSE / ON ARRÊTE ICI / SAUVEGARDE / FIN DE SESSION
1. Arrêter les modifications, relever fichiers changés et tests réellement effectués ; si du travail est incomplet, le noter explicitement sans prétendre « terminé ».
2. Mettre à jour **`RESUME_HERE.md`, `PROJECT_STATUS.md`, `NEXT_ACTIONS.md`**, plus `CHANGELOG.md`/risques/décisions selon impact, avec tâches et chemins exacts.
3. Vérifier `node scripts/project-memory.mjs check` + tests adaptés ; contrôler `git diff --check`, `git status`, inspection des fichiers prêts à committer, absence de secrets ; ne pas inclure dumps, .env ni fichiers non pertinents.
4. Commit explicite sur branche descendante du dépôt publié si possible ; si impossible, exporter patch/ZIP et marquer « non committé ». Une fois arbre propre, snapshot et contrôle d'empreinte ; transférer hors sandbox. Si le commit existe localement mais pas sur GitHub, indiquer **non publié** et fournir instructions de push sans force.
5. Donner bilan : fichiers exacts, sauvegardes et emplacement, SHA commit/local/distant, tests passés/non exécutés, blocages, et le prompt de reprise ci-dessous.

**Prompt de reprise à copier** : « Ouvre `PROJECT_MEMORY/RESUME_HERE.md` puis `AI_HANDOVER.md` ; compare Git, code, migrations, tests et docs. Préserve tout travail local ; vérifie le dernier SHA GitHub et reprends la première action de `NEXT_ACTIONS.md`. Effectue un snapshot propre avant/après et distingue testé de non testé. »

## Archive automatique du code validé (à vérifier après publication)

La CI ajoute `code_archive` dépendant de `quality`, `migrations`, `e2e`, seulement sur `main`. Récupérer depuis **Artifacts** du run réussi : `code-valide-<sha>` ; vérifier SHA256 et `git bundle verify`, puis restaurer en clone séparé. Rétention demandée 30 jours sur GitHub, pas une copie indépendante : transférer ailleurs pour durabilité. Ce mécanisme ne sauvegarde ni DB ni travail non poussé. Vérifier réellement le nouveau run avant de le déclarer opérationnel.

## Présent lot P1

La liste utilisateurs ajoute `status` (`all/active/suspended/invited`) combiné à `q` côté SQL, API et UI, avec liens de pagination préservant les deux filtres. Lire `docs/comptes-rendus/phase1-filtre-statut-utilisateurs.md`. Tests locaux 161 Vitest/lint/types/build verts ; E2E ajoutés mais non exécutés sur PostgreSQL réel localement, valider via CI du prochain SHA. Deux commits restent éventuellement à pousser selon `git ls-remote`; ne pas déclarer l'archive CI opérationnelle sans artifact restauré.

## Incident upload artifact

`43016471668` : 3 validations vertes, création/verify snapshot vert, upload échoué « No files were found ... .project-backups/* ». Correctif `code-archive-upload/` depuis validé par les runs suivants (dont `43024089653`) : artifact présent, téléchargement/restauration depuis GitHub **non vérifiés**.

## Lot P1 rôle des utilisateurs

Lire `docs/comptes-rendus/phase1-filtre-role-utilisateurs.md`. Historique : `d1d4088` était la base du filtre rôle ; `061a368` a depuis été publié et validé (run `43021881652`, quatre jobs verts). Lint/types/162 Vitest avaient réussi localement, build local non validé (symlink Next/`npm ci` tué 137).

## Lot P1 recherche limitée

Historique : `43021881652` de `061a368` est vert (4 jobs) ; le lot recherche a depuis été publié en `a64593b` et validé (`43024089653`, 4 jobs). Lire `docs/comptes-rendus/phase1-recherche-boutiques-comptes.md`. La suite complète locale a été interrompue par OOM (dmesg), ne jamais annoncer 163 tests verts ; ciblés 9/9, lint/types OK. Le build, la suite complète et les E2E du **SHA a64593b** ont été confirmés par sa CI, pas ceux du nouveau lot palette.

## Lot palette Ctrl/Cmd+K enrichie

Le run GitHub `43024089653` de `a64593b` est vert (4 jobs) ; la palette modifiée attend **son** run. Lire `docs/comptes-rendus/phase1-recherche-rapide-permissions.md`. Nouveau `/api/search` + `src/ui/directory-quick-search.tsx` remplace l'ancien fichier boutique sans supprimer la recherche boutique. Tests ciblés 35/35, lint/types OK, suite entière/build/E2E locaux non validés. Ne pas déclarer opérationnel avant CI du nouveau SHA.

## Révocation ciblée des sessions — lot P1 en cours

Le run `43026793436` de `cbbe950` est vert (4 jobs), mais **ce nouveau lot ne l’est pas encore**. Le propriétaire a choisi « Sécurité des sessions ». Service/route/UI protégés, 38 tests ciblés/lint/types OK ; E2E/build/suite entière du prochain SHA non validés. Lire `docs/comptes-rendus/phase1-revocation-autres-sessions.md`. Aperçu sur port 3100 = copie séparée `/home/user/preview-phase1`, pas le clone de travail ni la production.
