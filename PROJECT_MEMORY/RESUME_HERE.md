# Reprendre ici — correctif tri des boutiques L10

## Base et échec constaté

GitHub `main` et clone descendant `/tmp/toutenun-continuity-audit/` au SHA `3fd31f861e807dfd96ebd151f60f4b47d9b63371` **avant ce correctif**. [Run `43120844550`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43120844550) `completed failure` : qualité/types/tests/build et migrations PG16 verts, navigateur bureau/mobile échoué après retry, archive skipped. Annotations montrent `getByRole('table')` absent après soumission formulaire tri. Diagnostic : `status=''` envoyé par « Tous les états » mais rejeté par le serveur. Export utilisateurs précédent `d721595`/run `43119275267` avait quatre jobs verts ; ne pas attribuer ce run au tri. Preuve run rouge dans `docs/comptes-rendus/phase1-correctif-tri-boutiques.md`.

## Correctif local en cours

`parseShopStatus` traite `''` comme absence de filtre, garde 400 pour statut non vide inconnu ; SQL whitelist/RLS/droits inchangés. Tests unitaires, PGlite et E2E adaptés à la véritable soumission. Code **local non committé/non publié/non validé CI** au moment de cette mise à jour. Snapshot avant correction `*avant-correctif-tri-boutiques*` copié et SHA vérifié sous `/home/user/continuity-backups/`. TypeScript/lint, 27 tests unitaires ciblés et découverte 10 E2E OK ; PGlite renforcé et vrais E2E non exécutés localement (OOM sandbox précédent). Suite : mémoire/diff, commit descendant de `3fd31f8`, snapshot après et ZIP GitHub Desktop vérifiés, publication normale par propriétaire, CI **quatre jobs sur le futur SHA**. Ne pas dire que le run rouge valide le correctif.

## Chantier et restrictions

Le propriétaire poursuit le vrai chantier interface et administration L10, pas des menus d'améliorations. L10 et P1 restent inachevés. Windows/WSL/Docker en pause explicite (`0x80070641`, `msiserver` absent) : aucune installation, vraie donnée, sauvegarde PostgreSQL réelle restaurée ni production. Ne pas solliciter de manipulations PC. Aucun aperçu Arena n'est production ; préserver ancien dépôt divergent `/home/user` sans reset/clean/force push. Pas de Jumia/MIMI dans L10.

**Prompt de reprise** : « Lis `PROJECT_MEMORY/RESUME_HERE.md` puis `AI_HANDOVER.md`, compare Git/code/CI/docs, préserve l'arbre et suis `NEXT_ACTIONS.md` sans repartir de zéro. »
