# Reprendre ici — export Excel des rôles

Base `6fe9e955a31f5170f15547fb6155ce5534eb33ae` publiée ; [run 43638313462](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43638313462) quatre jobs verts et 10 tests navigateur réussis. Artifact GitHub présent, non téléchargé ni restauré. Le run antérieur `dc803d9` reste historiquement rouge ; trace privée HTTP 503 et refus RLS reproduit, sans logs SQL directs du run.

Présent lot L10 : export Excel sécurisé de la seule matrice des rôles, mêmes autorisations globales que le CSV, valeurs dangereuses neutralisées, voir `docs/comptes-rendus/phase1-export-excel-roles.md`. 235 Vitest, lint/types/build, `npm ci` et audit high locaux OK ; 7 modérées signalées. Navigateur et PostgreSQL 16 réel de ce lot non exécutés localement ; CI du futur SHA à vérifier.

Livrer le ZIP sur Arena (pas Drive) → publication du propriétaire sans force → lien CI immédiatement après « publié » → vérifier quatre jobs du nouveau SHA avant lot suivant. Une copie de sauvegarde indépendante doit être conservée par le propriétaire. Lire `AI_HANDOVER.md` et `NEXT_ACTIONS.md`. L10 et Phase 1 incomplets ; Windows en pause ; ne pas publier secrets ou traces.
