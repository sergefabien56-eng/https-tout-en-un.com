# Reprendre ici — correctif CI du lot devise XOF

Le lot `ccf391239e953b39aca0a2e4a623ee882413e63b` est publié mais son [run 43933906412](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43933906412) est rouge : qualité et migrations PostgreSQL 16 réussies, navigateur flaky, archive sautée. La trace vérifiée montre un cumul d'opérations dans le test sans session jusqu'à expiration avant la fin de la seconde navigation ; cause des latences inconnue.

Correctif local : découpage du test en trois, assertions de sécurité et configuration CI conservées ; aucun changement applicatif. 334 Vitest, lint, types, build, contrôle mémoire et audit high OK ; 18 E2E listés, navigateur et PostgreSQL 16 réels non exécutés localement. Publication et quatre jobs verts nécessaires avant tout autre lot. Voir `docs/comptes-rendus/correctif-ci-smoke-ccf3912.md` ; ne pas divulguer les traces privées.

Choix confirmés : XOF référence consolidée, mais taux et formules à valider ; alertes critiques au propriétaire uniquement avec détection réelle ; permissions des rôles modifiables par le propriétaire avec garde-fous à préciser ; export Système réservé au propriétaire. Domaine, VPS et SMTP non disponibles : le propriétaire prévoit de les fournir à la fin de la programmation ; déploiement, e-mail réel et restauration de production restent bloqués. Les trois compteurs globaux Système restent `null`/indisponibles à cause de la RLS, sans faux zéro.

Lire `AI_HANDOVER.md` et `NEXT_ACTIONS.md`. ZIP Arena → publication sans force → lien CI immédiatement à « publié » → vérifier les quatre jobs avant autre lot. Ne jamais partager secrets, traces ou cookies. Snapshot code ≠ sauvegarde DB. L10 et phase 1 incomplets ; Windows en pause.
