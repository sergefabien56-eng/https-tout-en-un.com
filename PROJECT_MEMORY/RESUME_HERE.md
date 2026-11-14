# Reprendre ici — correctif CI navigateur

GitHub `main=5be44764549e1bbfb2b895e941a819dfb656f5a1` publié ; [run 43646861790](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43646861790) : qualité et PG16 verts, navigateur flaky rouge, archive sautée. Trace privée : limite globale atteinte après accumulation d'étapes ; dernière requête non prouvée responsable. Voir `docs/comptes-rendus/correctif-ci-duree-parcours-e2e.md`.

Correctif local : découpage du long scénario authentifié, codes fictifs supplémentaires uniquement CI, contrôles et `failOnFlakyTests` conservés. 262 Vitest, lint/types/build/audit high OK (7 modérées), SQL fixture vérifié sur PGlite ; 12 E2E listés, navigateur et PG16 réels du correctif non exécutés localement.

ZIP Arena → publication sans force → lien CI dès « publié » → vérifier les quatre jobs avant autre lot. Lire `AI_HANDOVER.md` et `NEXT_ACTIONS.md`. Ne pas diffuser trace ni cookies. Sauvegarde indépendante recommandée ; snapshot code n'est pas sauvegarde DB. Windows en pause, L10 et Phase 1 incomplets.
