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

## Incident CI `43053514712` — second essai réellement analysé

Le premier échec était DNS `security.ubuntu.com` pendant installation Chromium ; le second a installé le navigateur et **révélé un test sessions faux** (attend 0 boutons alors que plusieurs sessions parallèles légitimes), plus une attente fiche utilisateur flaky 5 s. Correctif local dans `tests/e2e/authenticated-admin.spec.ts`, ne pas confondre avec une CI verte. Voir `RESUME_HERE.md` et compte rendu.

## Correctif filtres notifications (après `e4c4678`)

Run `43063876856` : qualité/PG16 verts, navigateur 9 passed/1 flaky sur clic filtre notifications, archive skipped ; traces présentes sur GitHub mais non téléchargées. Correctif local : navigation document native pour les trois filtres et attente URL 15 s. Hypothèse de concurrence router.refresh/Link, non prouvée. Lire `RESUME_HERE.md` et `docs/comptes-rendus/phase1-correctif-navigation-notifications.md`.

## Lot déconnexion groupée — Phase 1

Le propriétaire a choisi « Déconnecter tous les autres appareils » ; code local descendant de `a78a901`, dont run `43065395902` était vert (4 jobs). Nouveau lot non publié/non validé par ce run. `revokeAllOtherSessions`, route POST Origin/CSRF, bouton confirmation dans Mes sessions, audit transactionnel et tests 43/43 locaux ; lire `RESUME_HERE.md` et `docs/comptes-rendus/phase1-deconnecter-tous-autres-appareils.md`.

## Lot P1 recherche dans le journal de la boutique sélectionnée

Run `43067657827` du SHA `9055afb` : 4 jobs verts, artifact code présent mais non restauré depuis GitHub. Nouveau lot local **non validé** par ce run : `src/modules/audit/search-audit.ts` + API/page/palette ajoutent audit uniquement sous boutique sélectionnée, droit `audit:read` et RLS. 49 tests ciblés/lint/types OK ; E2E ajoutés non exécutés localement. Voir `RESUME_HERE.md` et `docs/comptes-rendus/phase1-recherche-audit-boutique.md`.

## Diagnostic du run `43069544036`

Qualité/PG16 verts, E2E bureau/mobile échouent sur lien audit absent de palette (API directe Playwright correcte), archive skipped. Nouveau test local capte la **réponse fetch du navigateur** et l’état UI, sans changer app. Lire `RESUME_HERE.md` et compte rendu ; ne pas présenter le diagnostic comme correctif validé.

## Cause du run `43071602554` démontrée

Le navigateur reçoit bien réponse audit et palette affiche `ci · fixture.created`. L'ancienne assertion attendait `shops · fixture.created` alors que `scripts/seed-e2e-shop.mjs` définit `module=ci`. Correction **du test seulement**, locale et non publiée ; suivre `RESUME_HERE.md` et compte rendu.

## Nouveau lot — périodes rapides du journal

Le run `43073364514` sur `ae540ec` est confirmé success (4 jobs) ; l'artifact GitHub n'a pas été téléchargé. Les sources ont été copiées sur Drive privé, MD5 concordant ; restauration depuis les octets Drive non testée. Le propriétaire a ensuite choisi les raccourcis 7/30 jours UTC du journal, les filtres module/date préexistant. Nouveau lot local ; suivre `RESUME_HERE.md` et `docs/comptes-rendus/phase1-periodes-rapides-journal.md` ; ne pas attribuer la CI de la base au nouveau lot.

## Run périodes rapides `43077689648` — flaky E2E

Le SHA `f05f8b7` est publié ; qualité/PG16 success, navigateur 9 passés/1 flaky bureau, archive skipped. L'assertion `toHaveURL(/\/espace\/journal\?/)` était vraie sur l'ancienne URL après clic 30 jours : le test lisait encore l'intervalle 7 jours (6 jours d'écart). Correction locale attend `from`/`to` de la nouvelle destination avant assertions, sans toucher au métier. Voir `RESUME_HERE.md` et compte rendu ; le prochain SHA doit être publié et CI quatre jobs verts.

## Run `43079138718` — autre flaky notifications

Qualité/PG16 verts, navigateur 9 passés/1 flaky bureau dans scénario notifications, archive skipped. Lien rafraîchir `href=...filter=read&page=1` vérifié mais ancienne URL `filter=read` persiste à l'assertion de 5 s ; retry passe. Cause précise inconnue sans trace GitHub (non téléchargée). Diagnostic local attend navigation document et réponse 200 ; ne pas le présenter comme correction validée. Voir `RESUME_HERE.md`.

## Lot Actions rapides et installation Windows en pause

Run `43082146651` du SHA `0f04914` : **quatre jobs verts**, artifact code présent non restauré. Le propriétaire a tenté WSL/Docker sur son PC Windows 10 puis demandé de **cesser les manipulations Windows** (erreur `0x80070641`, `msiserver` introuvable) pour reprendre la programmation P1. Aucune vraie donnée / backup DB / production installée. Nouveau lot menu Actions rapides engagé localement, non publié : accès aux routes prêtes selon droits, audit uniquement sur boutique sélectionnée autorisée, invitation non cliquable. Lire `RESUME_HERE.md` et compte rendu ; ne pas attribuer la CI précédente au nouveau lot.

## Lot écran Apparence personnelle — installation PC en pause

GitHub `main` `75ee3b2`, run `43110029953` quatre jobs verts, artifact code présent non restauré. Propriétaire a choisi l'écran d'apparence personnel Système/Clair/Sombre, tout en gardant Windows 10/WSL/Docker **en pause**. Nouveau lot local non validé en CI : même `localStorage` que le bouton barre, synchronisation événement locale, aucune préférence serveur ni paramètres admin généraux. Lire `RESUME_HERE.md` et `docs/comptes-rendus/phase1-apparence-personnelle.md` ; ne pas attribuer CI précédente au nouveau lot.

## Run `43111774881` — contrat navigation obsolète

SHA `bfe33db` publié ; PG16 success, qualité failure sur deux assertions `tests/unit/navigation-config.test.ts` obsolètes (45 feuilles / route Apparence absente), E2E/archive skipped. Test corrigé localement vers 46 feuilles et liste réelle ; ne pas attribuer cette CI au correctif. Voir `RESUME_HERE.md`.

## Nouveau lot filtre résultat du journal

Run `43112722746` du SHA `410d408` : quatre jobs verts validant **Apparence**, artifact code non restauré. Nouveau lot local « Tous/Succès/Échec » sur journal boutique, API et CSV, SQL paramétré sous RLS, valeurs invalides 400, fixture E2E fictive failure. Non publié/non validé par cet ancien run. PC Windows reste en pause explicite. Voir `RESUME_HERE.md`, `NEXT_ACTIONS.md` et `docs/comptes-rendus/phase1-filtre-resultat-journal.md`.

## Chantier L10 interface et administration après filtre validé

Propriétaire ne veut plus de choix entre micro-améliorations : il veut terminer le vrai chantier interface/administration P1. SHA base GitHub `075be6e`, run `43115169737` quatre jobs success, artifact non restauré ; preuve `/home/user/continuity-backups/verification-publication-075be6e.md`. Premier sous-lot local Système : API+page owner cohérentes (version, environnement déclaré, nombre de migrations, durée de requête ; file absente), sans secret ni changement de droits. Voir compte rendu, `RESUME_HERE.md`, `NEXT_ACTIONS.md`. Tests PGlite renforcés non exécutés localement ; CI du nouveau SHA obligatoire. Windows demeure en pause, aucune donnée réelle ou production.
