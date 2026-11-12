# Reprendre ici — correctif E2E des cartes boutiques (L10)

## État GitHub réellement vérifié

GitHub `main` = `4be54738ffa0dd9c42c49373535b73d9d22dcb93` au dernier contrôle, [run `43272897889`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43272897889) **completed failure** : qualité/types/tests/build et migrations PG16 verts ; navigateur bureau/mobile rouge (même après retry) ; archive CI skipped. [Annotations navigateur](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43272897889/job/131374865867) : assertion HTTP 404 sur page `/espace/boutiques?view=invalid` a reçu 200. Le code appelle `notFound()` mais le layout Next.js streamé peut conserver 200 tout en affichant la page 404 ; voir `docs/comptes-rendus/phase1-correctif-cartes-boutiques.md`. L'ancien **code validé** reste `d5e8215` run `43122127408` quatre jobs verts ; il ne valide pas les cartes. Commit documentaire `cc7e49f` est l'ancêtre du SHA cartes `4be5473`, désormais publié avec lui. Artifact Github du SHA rouge non présent ; archive Desktop locale `4be5473` vérifiée.

## Correction locale en cours

Test Playwright bureau/mobile conservé : navigue vers `view=invalid`, vérifie que les titres de la page d'erreur 404 sont visibles et que le tableau est absent ; revient au catalogue, vérifie le tableau, poursuit accessibilité et thème. **Pas de code produit/permission/RLS/migration modifié.** Travail **local non committé/non publié/non validé CI** au moment de cette note. Snapshot avant correction `*avant-correctif-cartes-boutiques*` exporté et SHA vérifié hors dépôt sous `/home/user/continuity-backups/`. Types/lint, 27/27 tests unitaires ciblés, découverte 10 E2E, mémoire/diff OK. Vrais E2E PG16 **non exécutés localement**. Suite : commit descendant du SHA rouge, snapshot après/ZIP GitHub Desktop vérifiés ; publication normale par propriétaire ; quatre jobs CI du futur SHA à vérifier avant validation. Ne pas déclarer le run rouge vert.

## Chantier et garde-fous

Le propriétaire veut finir **Interface et administration L10** sans menus de micro-améliorations. Les cartes réutilisent les boutiques RLS et affichent des chiffres métier indisponibles ; L10/P1 restent incomplets. Maquette autonome `/home/user/maquette-interactive-phase1.html` fictive ; ancien aperçu du vrai code sur PG17 jetable arrêté/base/session détruites, non production. Windows/WSL/Docker **en pause demandée** ; aucune installation PC, donnée réelle, sauvegarde PostgreSQL réelle restaurée ni production. Préserver ancien dépôt divergent `/home/user` sans reset/clean/force push.

**Reprise** : « Lis `RESUME_HERE.md`, `AI_HANDOVER.md`, `NEXT_ACTIONS.md`, compare Git/code/CI/docs. SHA cartes `4be5473` publié mais run `43272897889` rouge sur assertion soft 404 ; correctif local non publié en attente de sa propre CI. Windows en pause, pas de production. »
