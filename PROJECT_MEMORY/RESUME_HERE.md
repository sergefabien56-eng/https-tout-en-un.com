# REPRENDRE ICI — Phase 1 administration

**Base GitHub publiée et validée :** `main = d1d40888c63100e2372c846f63b2e714ae839a53`, run Actions `43018013858` **completed success**, quatre jobs verts : qualité (lint/types/tests/build), migrations PostgreSQL 16, E2E bureau/mobile, archive du code. Artifact **présent** : `code-valide-d1d40888c63100e2372c846f63b2e714ae839a53`, expiration annoncée 2026-12-11 UTC. L'artifact GitHub **n'a pas été téléchargé/restauré depuis GitHub** ; les snapshots locaux ont été restaurés en simulation, pas celui du run distant. Le présent lot **filtre par rôle des utilisateurs est un nouveau commit local descendant**, **pas encore publié ni validé en CI**. Vérifier `git rev-parse HEAD`, `git ls-remote origin refs/heads/main`, Actions et `PROJECT_STATUS.md` avant toute affirmation ultérieure.

## Modifications du présent lot
- `src/modules/identity/user-list.ts` : `isUserRoleFilter` et `listAuthorizedUsers(token,page,q,status,role)` ; filtre SQL paramétré `EXISTS` sur `user_roles` (attribution globale ou boutique), sans doublons ; permission globale `users:read` inchangée.
- `src/app/api/admin/users/route.ts` : paramètre `role` validé par le service ; valeur invalide → 400.
- `src/app/espace/utilisateurs/page.tsx` : sélecteur de rôle accessible, recherche + statut + rôle combinables et conservés dans les liens de pagination, état vide explicite.
- `tests/integration/authorize-global.test.ts` : rôles globaux/boutique, multi-rôles, pagination, refus et injection ; `tests/e2e/authenticated-admin.spec.ts` : nouveaux parcours API/UI **non exécutés sur le présent SHA**.
- `docs/guide-utilisateur.md`, `docs/comptes-rendus/phase1-filtre-role-utilisateurs.md`, `PROJECT_MEMORY/` : état et guide. Pas de migration SQL, donnée Jumia ni modification de fonction opérationnelle.

## Tests du présent lot (ne pas confondre avec la CI du SHA précédent)
`node scripts/project-memory.mjs check`, lint, typecheck et **162/162 Vitest** locaux réussis. Le **build local n'est pas validé** : la copie accélérée de dépendances a produit une erreur de résolution Next malgré la présence des fichiers, et `npm ci` dans le clone a expiré/puis été tué (137, contrainte sandbox). Attendre le job qualité du **nouveau** run GitHub pour valider build. E2E ajoutés mais pas relancés localement sur PostgreSQL réel. Aucun secret publié.

## Limites et précautions
L'archive CI du code est temporaire (30 jours demandés), sur le même hébergeur que le dépôt, ne contient ni fichiers non suivis ni données PostgreSQL. **Aucune sauvegarde chiffrée externe ni restauration de données commerciales**, aucun VPS/domaine/SMTP de production vérifié, pas d'API Jumia réelle ni finances livrées. `scripts/test-backup-restore.mjs` teste et modifie seulement une base CI jetable. SQL 0001–0010 `drizzle/` inchangé. Ancien dépôt `/home/user` : HEAD `aaa7740…` et travaux historiques non suivis ; **ne pas reset/clean/force-push**. Ne pas utiliser les prévisualisations Arena avec de vraies données.

## Prochaine action exacte
1. Committer le lot et faire snapshot propre après commit. Publier le descendant du `main` via l'archive GitHub Desktop sans force push ; vérifier sur **ce nouveau SHA** les quatre jobs verts (incluant build et E2E filtre rôle), et l'artifact présent. Si échec, corriger avant de déclarer validé.
2. Télécharger l'artifact GitHub, vérifier ses SHA256 et `git bundle verify`, restaurer en clone séparé, comparer HEAD, copier hors GitHub pour conservation durable.
3. Pour une future production, définir **sans secrets dans le chat** hébergement/base, stockage externe, chiffrement, rétention, surveillance, RPO/RTO et restauration d'une vraie sauvegarde ; poursuivre ensuite un petit lot Phase 1.

**Prompt de reprise** : « Lis `PROJECT_MEMORY/RESUME_HERE.md` puis `AI_HANDOVER.md`, compare Git, code, CI et docs ; protège le travail local, reprends `NEXT_ACTIONS.md` et distingue testé de non testé. »
