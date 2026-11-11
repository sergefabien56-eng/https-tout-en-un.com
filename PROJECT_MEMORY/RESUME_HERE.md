# REPRENDRE ICI — dernier état certain

**Phase 1 en cours.** `0226bd0` = v34 (notifications manuelles), CI `43009896449` verte, 10 E2E ; `bf706f194241e4ff6a9a69aa4f4e2d538b6fa78c` = mémoire de projet **publiée sur GitHub `main`**, CI `43013341355` terminée **success** (3 jobs). Deux lots **locaux non encore publiés** s'empilent au-dessus : `8833d4c` ajoute le job CI d'archive du code après trois validations ; le présent lot ajoute un filtre de statut aux utilisateurs. Leur réussite distante **n'est pas prouvée**. Vérifier `git rev-parse HEAD`, `git ls-remote origin refs/heads/main` et Actions avant d'annoncer un jalon validé.

## Modifications du présent lot et fichiers à connaître
- `src/modules/identity/user-list.ts` : `listAuthorizedUsers(token,page,q,status)` filtre SQL paramétré `all/active/suspended/invited`, avec `isUserStatusFilter`, autorisation globale `users:read` inchangée.
- `src/app/api/admin/users/route.ts` : paramètre `status` transmis au service (invalide → 400).
- `src/app/espace/utilisateurs/page.tsx` : filtre accessible par statut, combiné à la recherche et conservé dans les liens de pagination ; état vide explicite.
- `tests/integration/authorize-global.test.ts` : isolation et trois statuts fictifs ; `tests/e2e/authenticated-admin.spec.ts` : vérifications API et UI ajoutées, **non exécutées localement**.
- `docs/guide-utilisateur.md`, `docs/comptes-rendus/phase1-filtre-statut-utilisateurs.md`, `PROJECT_MEMORY/` : documentation.
- `.github/workflows/ci.yml` (commit précédent `8833d4c`) : job `code_archive` dépendant de la qualité, des migrations PG16 et E2E, seulement sur `main` ; artifact GitHub code+historique de 30 jours demandés, **jamais backup externe ou de base**, pas encore testé sur GitHub.
- Schéma inchangé : SQL up/down `drizzle/0001_*` à `0010_*`, suivi `scripts/migrate.mjs` ; `scripts/test-backup-restore.mjs` modifie une **base CI jetable seulement**. Auth et RLS `src/core/auth/`, `src/core/db/` ; notifications `src/modules/notifications/`.

## Preuves du lot actuel
Contrôle mémoire, lint, typage, **161/161 tests Vitest** (dont intégration PGlite des trois statuts) et build réussis dans un clone du dernier commit publié. Pas d'E2E local PostgreSQL réel ; les scénarios Playwright ajoutés et le nouveau job d'archive doivent être vérifiés **après push**. Aucun secret publié. Pas de modification de schéma ni suppression de fonctionnalité opérationnelle.

## Problèmes et précautions
- Ancien dossier `/home/user` à HEAD `aaa7740…` avec historique divergent et travaux non suivis : **ne pas reset/clean/force-push**. Les commits livrables sont dans un clone descendant de GitHub et dans l'archive GitHub Desktop remise à l'utilisateur.
- Sauvegarde automatique du code sur GitHub seulement **préparée**, pas prouvée sans run du nouveau SHA et artifact restauré ; conservation temporaire chez le même fournisseur. **Aucune sauvegarde de production chiffrée hors serveur**, ni hébergement de production, SMTP, Jumia réelle, données commerciales, worker ou finances livrés.
- Certains vieux README/plan Phase 0 restent historiques ; `PROJECT_MEMORY/PROJECT_STATUS.md` et le code prévalent. Les deux prévisualisations Arena ne sont pas un hébergement permanent.

## Prochaine action exacte
Publier le dernier commit descendant via l'archive GitHub Desktop sans force push ; vérifier le SHA `main` et les **quatre jobs** (qualité, migrations PG16, E2E, archive) sur ce SHA. Télécharger l'artifact `code-valide-<sha>`, vérifier SHA256/bundle et restaurer dans un clone isolé ; si les tests échouent, corriger puis actualiser `PROJECT_STATUS.md`, `NEXT_ACTIONS.md`, ce fichier. Ensuite choisir un prochain petit lot P1 ; demander séparément fournisseur du serveur/base et destination hors serveur **sans secrets** pour la sauvegarde des données. Voir `AI_HANDOVER.md` pour protocole STOP/PAUSE.

**Prompt de reprise** : « Lis `PROJECT_MEMORY/RESUME_HERE.md`, puis `AI_HANDOVER.md` ; confronte mémoire, code, Git et CI. Préserve les travaux locaux et reprends la première action de `NEXT_ACTIONS.md` sans repartir de zéro. »
