# Actions suivantes — harmonisation CSV

1. Base `4cf4822` publiée, [run 43645700922](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43645700922) quatre jobs verts, 10 tests navigateur, artifact non restauré.
2. Livrer ZIP sur Arena → publication sans force → lien CI immédiatement à « publié » → vérifier les quatre jobs du nouveau SHA avant autre lot. 259 Vitest, lint/types/build/audit high locaux OK (7 modérées) ; 10 E2E listés, navigateur et PG16 réels du nouveau SHA non exécutés localement. Les métadonnées CSV changent : attention aux clients automatisés. Ne pas masquer un échec.
3. Après validation, poursuivre critères L10 : invitations SMTP, paramètres/devise/notifications, santé réelle, exports autres écrans et PDF. MIMI souhaitée après L10, ordre avec L11/L12 à confirmer ; P1 incomplète, Windows en pause, conserver copie indépendante.
