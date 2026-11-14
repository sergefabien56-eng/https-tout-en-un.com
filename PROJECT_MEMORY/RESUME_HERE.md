# Reprendre ici — correctif transport CI

Base GitHub `14d046ec1c0d7b65c5c45ff1551a6841d942eb8f` publiée ; [run 43639821115](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43639821115) qualité et PG16 verts, navigateur rouge sur un `ECONNRESET` classé flaky, archive sautée. Cause exacte non prouvée ; voir `docs/comptes-rendus/phase1-correctif-transport-ci.md`. Traces/logs sensibles exclus du dépôt.

Correctif local : `Connection: close` uniquement pour les appels API directs Playwright, aucun retry ni changement d'assertion ; test artificiel de socket réutilisé, cookies et absence de replay. 238 Vitest, lint/types/build et audit high OK (7 modérées). Les 10 tests Playwright sont listés mais non exécutés localement ; PG16 réel du nouveau SHA non exécuté localement. CI du nouveau SHA indispensable, et succès ne prouve pas à lui seul la cause de l'échec initial.

ZIP dans Arena → publication sans force → lien CI immédiatement après « publié » → vérifier quatre jobs avant tout nouveau lot. Lire `AI_HANDOVER.md` et `NEXT_ACTIONS.md`. Conserver une sauvegarde indépendante ; Windows en pause, L10 et Phase 1 incomplets. Ne publier aucun secret ni trace.
