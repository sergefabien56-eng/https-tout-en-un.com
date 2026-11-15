# Phase 1 / L10 — export PDF des paramètres d’organisation

## Périmètre et sécurité
PDF du nom et du fuseau de l’organisation uniquement, avec périmètre global, instantané sans période et date UTC. Même chargeur et sélection explicite que les exports CSV/Excel ; session requise et droits globaux `settings:read` ET `reports:export`. Aucun autre paramètre ni secret n'est sélectionné. Les champs absents sont indiqués « Non configuré » ; le chargeur partagé traite aussi un fuseau non reconnu comme non configuré. Pas de devise, notifications ou données inventées. Pas de mutation.

Police DejaVu Sans embarquée avec licence, réponse `no-store`/`nosniff`, erreurs internes neutres. Valeurs à préfixe de formule neutralisées, chaînes longues renvoyées à la ligne ; valeurs trop longues (254 caractères), contrôles ou glyphes non pris en charge refusés sans troncature silencieuse. Certains emoji ou écritures sont refusés ; CSV/Excel restent disponibles. Un PDF dont le contenu dépasserait la page est explicitement refusé.

## Vérifications locales
312 tests Vitest réussis, dont droits PGlite, absence de session, double droit, exclusion d'un paramètre sensible fictif et tests de route ; lint, types, build et audit high réussis (7 modérées en dépendances de développement ; aucune en production). Deux PDF fictifs relus avec PyMuPDF, aperçu visuel, vérification texte, accents, neutralisation et ligne longue. Police et licence dans le standalone et traçage des cinq routes PDF. 14 scénarios navigateur listés, mais navigateur et PostgreSQL 16 réels du nouveau lot non exécutés localement : à vérifier en CI. Le contrôle de cohérence documentaire ne remplace pas les tests.

## Base et livraison
Base `6cf8be786d03440e75328d5b6395047009c8bd0d` publiée ; [run 43761332925](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43761332925) quatre jobs verts dont 14 tests navigateur ; artifact présent mais non restauré. ZIP Arena → publication sans force → lien CI immédiatement à « publié » → vérifier les quatre jobs du nouveau SHA avant autre lot. L10 et Phase 1 restent incomplets ; Windows en pause.
