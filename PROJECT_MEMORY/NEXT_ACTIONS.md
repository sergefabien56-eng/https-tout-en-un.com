# Actions suivantes — PDF des boutiques

1. Base `d80d195` publiée ; [run 43755748145](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43755748145) quatre jobs verts, dont navigateur et PostgreSQL 16 ; artifact non restauré.
2. Livrer ZIP sur Arena → publication sans force → lien CI immédiatement à « publié » → vérifier les quatre jobs du nouveau SHA avant autre lot. 290 Vitest, lint/types/build/audit high locaux OK (7 modérées), PDF fictifs relus ; navigateur et PostgreSQL 16 réels du nouveau SHA à vérifier en CI (12 E2E listés). Voir `docs/comptes-rendus/phase1-export-pdf-boutiques.md`. Ne pas masquer un échec.
3. Après validation, poursuivre critères L10 : PDF des autres écrans, invitations SMTP, paramètres/devise/notifications, santé réelle et autres exports. MIMI souhaitée après L10, ordre avec L11/L12 à confirmer ; P1 incomplète, Windows en pause, conserver copie indépendante.
