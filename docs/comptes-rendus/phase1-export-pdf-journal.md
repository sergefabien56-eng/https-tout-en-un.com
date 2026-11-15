# Phase 1 / L10 — export PDF du journal de boutique

## Périmètre
Le PDF utilise exactement le chargement autorisé partagé par les exports CSV/Excel du journal : session valide, boutique accessible avec RLS, droits `audit:read` et `reports:export` globaux ou sur la boutique. Filtres identiques : recherche action/module, module, acteur, résultat et dates UTC ; la date de fin inclut toute la journée indiquée. Le document affiche la boutique, la période, les filtres et la date d'export UTC ; les en-têtes sont répétés.

Seuls l'identifiant, la date, l'acteur, le module, l'action, l'entité et le résultat sont projetés. Acteur ou entité absents affichés « — » ; les données `before`, `after`, secrets, IP et détails non prévus ne sont pas exportés. Pas de changement de données, droits, RLS ou schéma. Valeurs hostiles neutralisées ; aucun lien ni script PDF volontairement ajouté. Réponse sans cache et `nosniff`, erreurs internes neutres. Police DejaVu Sans et licence embarquées et incluses dans le traçage des quatre routes PDF autonomes.

Limites spécifiques PDF : 1 000 événements, 150 pages et 254 caractères par champ ; contrôles, caractères invisibles ou absents de la police, valeurs trop longues et valeurs dépassant une page sont refusés explicitement sans troncature silencieuse. Des lignes longues peuvent atteindre la limite de pages avant celle de lignes. Certains emoji ou écritures peuvent être refusés : utiliser CSV/Excel si nécessaire. Les limites CSV/Excel restent à 10 000 événements.

## Vérifications locales
299 tests Vitest, lint, types, build, cohérence et audit high réussis (7 vulnérabilités modérées ; audit production : aucune). PGlite avec véritable rôle applicatif sans BYPASSRLS : textes dessinés et filtres, exclusion d'une autre boutique et des champs sensibles, refus sans session ou double droit, date de fin à 23:59:59.999 incluse et minuit suivant exclu. Pagination, bornes, données absentes, dates invalides et non-régression PDF utilisateurs/boutiques/rôles testées.

Police et licence comparées dans la sortie autonome et traçage vérifié sur les quatre routes. Deux PDF fictifs relus indépendamment avec PyMuPDF : contexte, dates, neutralisation, valeurs absentes, en-têtes et dernière ligne sur 8 pages ; aperçu inspecté. 14 scénarios Playwright listés, mais navigateur et PostgreSQL 16 réels de ce nouveau lot non exécutés localement ; à vérifier en CI.

## Base et livraison
Base `f3ac2f252a37fbccc03738afcae158e5028c55bf` publiée ; [run 43759955270](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43759955270) quatre jobs verts, 14 tests navigateur ; artifact non restauré. ZIP Arena → publication sans force → lien CI immédiatement à « publié » → vérifier les quatre jobs du nouveau SHA avant autre lot. Les autres PDF et critères L10 restent à examiner ; Phase 1 non terminée, Windows en pause.
