# Phase 1 / L10 — export des paramètres d’organisation

## Périmètre
Deux exports CSV et Excel sont ajoutés à l’écran Paramètres. Ils portent **uniquement** sur le nom et le fuseau horaire de l’organisation déjà pris en charge, avec périmètre global, date d’export UTC et mention « Sans période — instantané ». Les valeurs absentes sont indiquées « Non configuré ». Aucune devise, notification, préférence personnelle, autre clé `app_settings`, donnée boutique ou secret n’est exporté. Ces formats ne constituent pas le PDF demandé au plan L10 ; celui-ci reste à traiter.

Les deux routes utilisent un chargement autorisé commun dans une transaction : session valide, `settings:read` global et `reports:export` global obligatoires. Une seule requête sélectionne explicitement les deux clés. Le nom invalide est refusé comme sur l’écran ; un fuseau non reconnu est rendu non configuré comme sur l’écran. Les réponses sont `no-store`, `nosniff`, en pièces jointes ; aucun changement de données, droit, RLS ou schéma n’est apporté. Les liens sont affichés aux utilisateurs ayant le droit global d’export ; le serveur recontrôle tous les droits.

Les champs sont neutralisés contre les formules de tableur dans les deux formats. Un compte rendu sans période ne prétend pas représenter un historique. Le nom de l’organisation n’est pas ajouté aux autres exports.

## Vérifications locales
273 Vitest, lint, types, build et audit au seuil high réussis ; 7 vulnérabilités modérées préexistantes. Tests de droits globaux, refus 401/403, accès via rôle sans BYPASSRLS sur PGlite, exclusion d’une autre clé fictive, caractères hostiles `=cmd`, `+1`, `@x`, contrôle de cache, etc. Deux fixtures fictives relues indépendamment par Python `csv` et `openpyxl` : pas de formule. 12 tests navigateur listés mais non exécutés ; PostgreSQL 16 réel et E2E de ce commit restent à vérifier en CI.

## Reprise et validation
Base `63df5cf2d533ca7831ba2037033b48a9add1d819` publiée ; [CI 43649987828](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43649987828) quatre jobs verts, 12 tests Playwright. À la reprise Arena, l’ancien répertoire avait une référence Git antérieure et des fichiers divergents : état préservé, travail effectué dans un clone séparé du commit publié ; snapshot préalable vérifié. ZIP Arena, publication sans force, lien CI immédiat puis contrôle des quatre jobs avant nouveau lot.
