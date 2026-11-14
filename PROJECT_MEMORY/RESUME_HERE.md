# Reprendre ici — L10 nom de l’organisation

La base GitHub `aa5bdabce585e5761a69c846f646357113de85d9` a été publiée ; [run 43519659898](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43519659898) : quatre jobs verts. Artifact présent mais non téléchargé ni restauré. L’origine exacte des anciens flakies n’est pas établie.

Le présent lot ajoute le nom de l’organisation aux paramètres généraux, séparé du nom officiel de l’application et non propagé aux exports. Droits globaux, Origin/CSRF, validation, audit transactionnel et idempotence. Voir `docs/comptes-rendus/phase1-nom-organisation.md`. 229 Vitest, lint/types/build OK localement ; parcours Playwright découvert mais non exécuté localement. Le lot n’est pas validé par la CI de la base.

Cycle impératif : ZIP Drive → publication par le propriétaire sans force → lien CI immédiatement après « publié » → vérifier les quatre jobs du nouveau SHA avant tout lot. Lire aussi `AI_HANDOVER.md` et `NEXT_ACTIONS.md`. L10 et Phase 1 incomplets ; Windows en pause. Pas de secrets, traces privées ou données réelles. MIMI après L10 souhaitée ; ordre avec L11/L12 à préciser.
