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
