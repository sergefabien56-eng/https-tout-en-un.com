# Reprendre ici — correctif audit des paramètres

`dc803d9d9d3fe414ca6aba534e5c08173178e654` publié ; [run 43636585803](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43636585803) : qualité et PostgreSQL 16 verts, navigateur rouge (9 réussis, 1 échec bureau aux deux tentatives), archive sautée. Trace privée : PUT nom d’organisation HTTP 503 ; RLS audit paramètres reproduite en rôle non privilégié sur PGlite. Détails et limites : `docs/comptes-rendus/phase1-correctif-audit-parametres.md`.

Présent correctif : migration 0012, contexte d’audit local après autorisation pour nom et fuseau, tests rôle non privilégié et RLS, scénario navigateur enrichi. 231 Vitest, lint/types/build et cohérence OK ; PostgreSQL 16 réel et navigateur non exécutés localement. La CI du futur SHA reste indispensable.

Selon la dernière demande : fournir les ZIP via Arena et non Drive → publication par le propriétaire sans force → lien CI immédiatement après « publié » → vérifier les quatre jobs du SHA avant tout lot. Demander au propriétaire de conserver une copie indépendante : Arena n’est pas une sauvegarde hors site garantie. Lire `AI_HANDOVER.md` et `NEXT_ACTIONS.md`. L10 et Phase 1 incomplets ; Windows en pause ; ne pas publier secrets ou traces privées.
