- **Phase 1 — filtre de statut utilisateurs** (présent lot, SHA à relever) : recherche combinée à statut, API et page, pagination conservée, tests PGlite et E2E ajoutés ; check/lint/types/161 Vitest/build locaux OK, E2E du nouveau SHA et CI distants en attente. Aucun schéma changé.
# Journal des jalons

- **Phase 1 — archive CI du code** (présent jalon, SHA à relever dans Git) : job après qualité, migrations et E2E verts, seulement pour push `main` ; bundle Git + ZIP source + SHA256 publiés comme artifact GitHub de 30 jours demandés. Aucun changement du code métier/SQL ; YAML parsé, check, Node syntaxe, lint, types, 159 Vitest OK localement ; build/DB/E2E non relancés, publication et validation GitHub de ce nouveau job **en attente**. Docs et mémoire synchronisées.
- **Mémoire de continuité `bf706f1`** : 13 fichiers et script de contrôle/snapshot ; GitHub run `43013341355` success, 3 jobs verts.
- **v34 `0226bd0`** : notifications actualisables manuellement, accueil clarifié ; run `43009896449` success.

Après chaque fonctionnalité : noter SHA, fichiers/tests/problèmes et résultats réels, jamais seulement un résultat supposé.
