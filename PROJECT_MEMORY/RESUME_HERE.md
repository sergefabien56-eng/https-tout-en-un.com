# Reprendre ici — correctif CI boutiques / journal / sessions

Base `1005473a1e990d5c88fef4b0d1e24db5ff1c0a6e` publiée, mais [run 43757504110](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43757504110) rouge : qualité et PG16 verts, navigateur rouge (11 réussis, 1 échec), archive sautée. Les deux traces privées montrent l'accumulation d'étapes jusqu'à la limite globale de 120 s ; voir `docs/comptes-rendus/correctif-ci-boutiques-journal-sessions.md`.

Correctif local : découpage du scénario en deux tests autonomes, assertions et sécurité maintenues, 16 codes fictifs CI. 291 Vitest, lint/types/build/audit high OK (7 modérées), 14 E2E listés ; navigateur et PostgreSQL 16 réels du nouveau SHA à vérifier en CI.

Lire `AI_HANDOVER.md` et `NEXT_ACTIONS.md`. ZIP Arena → publication sans force → lien CI dès « publié » → vérifier les quatre jobs avant autre lot. Ne pas divulguer traces/cookies. Snapshot code ≠ sauvegarde DB ; copie indépendante recommandée. Windows en pause, L10 et Phase 1 incomplets.
