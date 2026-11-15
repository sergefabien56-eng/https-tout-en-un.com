# Phase 1 / L10 — export PDF des boutiques

## Périmètre
Le PDF utilise le même chargement autorisé que les exports CSV/Excel des boutiques : session valide, boutiques visibles par RLS (`shops:read` et accès) et droit `reports:export` global ou sur chaque boutique ; mêmes filtres recherche et état, même tri. La projection ne contient que l'identifiant, le nom, le pays, la devise et l'état ; aucune donnée d'authentification ni de connexion Jumia. Aucun changement de données, droits, RLS ou schéma.

Le document indique son périmètre, la date UTC, la période « Sans période — instantané », les filtres, le tri et les en-têtes répétés. Les ventes et commandes indisponibles sont présentées par « — », jamais par zéro. Les valeurs potentiellement dangereuses pour un tableur sont neutralisées ; aucun lien ni script PDF n'est ajouté volontairement. Réponse sans cache, avec `nosniff`, erreurs internes neutres. Police DejaVu Sans et licence embarquées, incluses dans le traçage des trois routes PDF autonomes.

Limites PDF : 1 000 boutiques, 150 pages et 254 caractères par champ ; les caractères de contrôle, invisibles ou absents de la police et les valeurs dépassant une page sont refusés explicitement, sans troncature silencieuse. Des lignes longues peuvent atteindre la limite de pages avant celle de boutiques. D'autres écritures et certains emoji peuvent être refusés ; utiliser CSV/Excel si nécessaire. Les limites CSV/Excel demeurent de 10 000 lignes.

## Vérifications locales
Installation propre `npm ci`, vérification hash/verify argon2, 290 tests Vitest, lint, types, build, cohérence mémoire et audit au seuil high réussis (7 vulnérabilités modérées ; audit production : aucune). Tests de rôle applicatif sans BYPASSRLS sur PGlite : les textes dessinés dans le PDF ont été contrôlés pour le propriétaire filtré et un rôle limité à une boutique, avec refus sans session ou droit d'export, y compris une boutique visible mais non exportable. Limites, pagination, ligne trop haute, borne de pages, valeurs hostiles et non-régression PDF utilisateurs/rôles testées.

Police et licence comparées dans la sortie autonome et traçage vérifié sur les trois routes. Deux PDF fictifs ont été relus indépendamment avec PyMuPDF : texte, filtres, valeurs neutralisées, absence des données Jumia et pagination sur 7 pages ; aperçu inspecté. 12 scénarios Playwright listés, mais navigateur et PostgreSQL 16 réels du nouveau lot non exécutés localement ; ils restent à vérifier en CI.

## Base et livraison
Base `d80d1955d9c1c1d3ca56edaf582f034fd67739bb` publiée ; [run 43755748145](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43755748145) : quatre jobs verts, dont parcours navigateur et migrations PostgreSQL 16 ; artifact non restauré. ZIP Arena → publication sans force → lien CI immédiatement à « publié » → vérifier les quatre jobs du nouveau SHA avant autre lot. Les autres PDF et critères L10 restent à examiner ; Phase 1 non terminée, Windows en pause.
