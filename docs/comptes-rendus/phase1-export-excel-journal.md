# L10 — export Excel du journal de boutique

## Périmètre

La page Journal propose l'Excel en plus du CSV pour une boutique autorisée à la fois. Les deux formats utilisent le même chargement, les mêmes filtres (recherche, module, acteur, résultat, dates UTC), la même RLS, les droits `audit:read` et `reports:export` globaux ou sur la boutique et la même limite de 10 000 événements. Aucune migration ni permission modifiée. Le classeur précise boutique, dates de début et fin incluse, export UTC et tous les filtres ; événements sans données `before`/`after`, identifiants externes ou secrets. Cellules texte, caractères XML interdits remplacés et préfixes dangereux neutralisés ; limite 32 767 unités UTF-16 par cellule. Réponse `no-store`, `nosniff` et nom fixe.

## Validation et limites

- 257 tests Vitest, lint, types, build, cohérence mémoire et `git diff --check` OK ; audit `--audit-level=high` passe, **7 modérées**. Tests PGlite sous rôle sans bypass : isolation entre deux boutiques, double permission, filtres, refus et neutralisation.
- Tests format et route (400/403/503), classeur fictif relu par `openpyxl` sans formule ; `=cmd`, `+1`, `@x` neutralisés.
- 10 Playwright découverts ; assertions Excel ajoutées mais navigateur et PG16 réel du nouveau SHA **non exécutés localement**. À confirmer par la CI après publication.
- Base `4c55ea56b7e4b5099d6daaff48dde360eb64617d` publiée, [run 43644540811](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43644540811) quatre jobs verts, 10 tests navigateur ; artifact présent, non téléchargé ni restauré.
- Ce lot n'achève pas L10 ni Phase 1 ; Windows en pause, ZIP Arena, garder copie indépendante ; snapshot code n'est pas sauvegarde DB.
