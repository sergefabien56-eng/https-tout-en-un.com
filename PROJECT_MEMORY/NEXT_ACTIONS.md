# Actions suivantes — correctif CI

1. Base `5be4476` publiée ; [run 43646861790](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43646861790) navigateur flaky rouge. Étude de trace et correctif dans `docs/comptes-rendus/correctif-ci-duree-parcours-e2e.md`.
2. Livrer ZIP sur Arena → publication sans force → lien CI immédiatement à « publié » → vérifier les quatre jobs du nouveau SHA avant autre lot. 262 Vitest, lint/types/build/audit high locaux OK (7 modérées) ; 12 E2E listés, navigateur et PG16 réels du correctif non exécutés localement. Ne pas masquer un échec, trace privée non livrée.
3. Après validation, poursuivre critères L10 : invitations SMTP, paramètres/devise/notifications, santé réelle, exports autres écrans et PDF. MIMI souhaitée après L10, ordre avec L11/L12 à confirmer ; P1 incomplète, Windows en pause, conserver copie indépendante.
