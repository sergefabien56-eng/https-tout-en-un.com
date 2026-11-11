- **Phase 1 — Ctrl/Cmd+K enrichi** (présent lot, SHA à relever) : API recherche protégée, palette boutiques + comptes selon permission globale ; 35 tests ciblés/lint/types OK ; build/suite complète/E2E du nouveau SHA à vérifier en CI. Aucun schéma, Jumia ni MIMI.
- **Validation `a64593b`** : run `43024089653` quatre jobs verts, artifact code présent, non téléchargé/restauré depuis GitHub.
- **Phase 1 — recherche limitée boutiques/comptes** (`a64593b`, validé CI `43024089653`) : service composé de deux contrôles d’accès existants, page, menu et tests ciblés 9/9 ; lint/types OK. Suite complète locale NON VERTE par OOM (153/163, 18/20), build/E2E locaux non exécutés ; CI du SHA `a64593b` depuis réussie (4 jobs). Aucun schéma/Jumia/IA.
- **Validation `061a368`** : run `43021881652` terminé success, quatre jobs verts, artifact code présent ; téléchargement/restauration de cet artifact non effectués.
- **Phase 1 — filtre rôle utilisateurs** (`061a368`, validé CI `43021881652`) : combiné à statut/recherche, pagination et droits globaux conservés ; check/lint/types/162 Vitest réussis localement ; build local non validé (dépendances/sandbox), CI et E2E depuis réussis sur `061a368`.
- **Validation `d1d4088`** : run `43018013858` quatre jobs verts, artifact code présent ; archive GitHub non encore restaurée depuis le téléchargement.
- **Phase 1 — correctif upload artifact** (SHA à relever) : échec CI `43016471668` isolé au dossier caché, archive créée et vérifiée mais non envoyée ; préparation dans dossier visible ; simulation locale en clone propre/empreintes/restauration OK, lint/types/161 Vitest OK ; nouveau run et téléchargement de l'artifact encore en attente. Aucun code métier ni migration modifiés.
- **Phase 1 — filtre de statut utilisateurs** (présent lot, SHA à relever) : recherche combinée à statut, API et page, pagination conservée, tests PGlite et E2E ajoutés ; check/lint/types/161 Vitest/build locaux OK, E2E du nouveau SHA et CI distants en attente. Aucun schéma changé.
# Journal des jalons

- **Phase 1 — archive CI du code** (présent jalon, SHA à relever dans Git) : job après qualité, migrations et E2E verts, seulement pour push `main` ; bundle Git + ZIP source + SHA256 publiés comme artifact GitHub de 30 jours demandés. Aucun changement du code métier/SQL ; YAML parsé, check, Node syntaxe, lint, types, 159 Vitest OK localement ; build/DB/E2E non relancés, publication et validation GitHub de ce nouveau job **en attente**. Docs et mémoire synchronisées.
- **Mémoire de continuité `bf706f1`** : 13 fichiers et script de contrôle/snapshot ; GitHub run `43013341355` success, 3 jobs verts.
- **v34 `0226bd0`** : notifications actualisables manuellement, accueil clarifié ; run `43009896449` success.

Après chaque fonctionnalité : noter SHA, fichiers/tests/problèmes et résultats réels, jamais seulement un résultat supposé.
