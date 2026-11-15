# Phase 1 / L10 — export PDF des utilisateurs

## Périmètre
PDF des utilisateurs de l'organisation, avec les mêmes filtres de recherche, statut et rôle et le même chargement autorisé que CSV/Excel. Une session et les droits globaux `users:read` et `reports:export` sont requis ; un rôle limité à une boutique ne suffit pas. La projection comprend identifiant, nom, e-mail, statut et date de création UTC : aucun mot de passe ni secret d'authentification. Pas de modification de données, de droits, de schéma ou de RLS.

La pièce jointe affiche périmètre global, date UTC, période « Sans période — instantané », filtres et en-têtes répétés. Les textes potentiellement dangereux pour un tableur sont neutralisés ; aucun lien ni script PDF n'est volontairement ajouté. `no-store` et `nosniff` s'appliquent aussi aux erreurs, sans fuite des erreurs internes. Police DejaVu Sans et licence embarquées et présentes dans le traçage des deux routes PDF autonomes.

Limites spécifiques PDF : 1 000 utilisateurs, 150 pages, 254 caractères par champ ; une valeur qui ne tient pas ou un caractère de contrôle, invisible ou manquant dans la police est refusé explicitement, sans troncature silencieuse. Les documents longs peuvent atteindre la limite de pages avant celle de lignes. D'autres écritures et certains emoji peuvent être refusés : utiliser CSV/Excel si nécessaire. Les limites CSV/Excel restent inchangées (10 000 lignes).

## Vérifications locales
283 tests Vitest réussis, dont autorisations et RLS sur PGlite, limites, pagination et non-régression PDF rôles ; lint, types, build, cohérence mémoire et audit au seuil high réussis (7 vulnérabilités modérées ; audit production : 0). Police et licence comparées dans la sortie autonome, traçage vérifié pour les deux routes. Un PDF fictif et un PDF fictif de 120 utilisateurs sur 7 pages ont été relus indépendamment avec PyMuPDF : métadonnées, neutralisation de valeurs hostiles, répétition des en-têtes et dernière ligne vérifiées ; aperçu inspecté. 12 scénarios Playwright listés, mais navigateur et PostgreSQL 16 réels du nouveau lot non exécutés localement : à vérifier en CI. Installation locale réparée lors du lot précédent ; `npm ci` a réussi en CI sur la base publiée, ce qui ne prouve pas une installation propre locale de ce lot.

## Base et livraison
Base `98eaee86afaa82bf49de6a1a4ea2f02f6188633e` publiée ; [run 43744750704](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43744750704) : quatre jobs verts, 12 tests navigateur, installation propre réussie ; artifact non restauré. ZIP Arena → publication sans force → lien CI immédiatement à « publié » → vérifier les quatre jobs du nouveau SHA avant autre lot. Les autres PDF et critères L10 restent à examiner ; Phase 1 non terminée, Windows en pause.
