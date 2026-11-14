# L10 — export Excel des boutiques autorisées

## Périmètre

L'écran Toutes les boutiques propose le format Excel, en plus du CSV. Les deux formats utilisent le même chargement autorisé, les mêmes filtres et tri, toutes les pages, la même RLS et le même contrôle `reports:export` global ou pour chaque boutique. Seules les boutiques visibles et exportables sont incluses ; maximum 10 000, au-delà refus explicite. Aucune migration ou permission modifiée.

Le classeur indique périmètre, période « Sans période — instantané », date UTC, recherche, état et tri. Les colonnes comportent ID, nom, pays, devise, état, ventes et commandes « — » car les données Jumia ne sont pas disponibles. Aucune clé, session ou identifiant externe Jumia. Toutes cellules texte ; caractères XML invalides remplacés, préfixes tableur dangereux neutralisés, limite 32 767 unités UTF-16 par cellule. Réponse `no-store`, `nosniff`, fichier fixe. Le traitement texte partagé avec l'Excel rôles reste couvert par ses tests.

## Validation et limites

- 244 tests Vitest, lint, types, build, cohérence mémoire et `git diff --check` OK ; audit npm `--audit-level=high` passe, **7 modérées restantes**. Tests PGlite sous rôle RLS sans bypass : rôle global et boutique, filtres, refus, valeurs hostiles, parité avec CSV.
- Tests de format et route (erreurs 400/403/503, aucun secret), classeur fictif relu indépendamment par `openpyxl` : aucun champ formule ; valeurs `=cmd`, `+1`, `@x` neutralisées.
- 10 scénarios Playwright découverts ; assertions Excel ajoutées aux parcours réels mais navigateur et PostgreSQL 16 réel de ce nouveau SHA **non exécutés localement**. À confirmer par la CI après publication.
- Base `adcdaa3be1d74fb8c0461347e0a38c56f2c3032a` publiée, [run 43642226784](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43642226784) quatre jobs verts, 10 tests navigateur ; artifact CI présent mais non téléchargé ni restauré. Ce succès ne prouve pas la cause exacte du reset antérieur.
- Ce lot n'achève pas L10 ni Phase 1. Windows en pause ; ZIP directement dans Arena, conserver une copie indépendante ; snapshots code non équivalents à une sauvegarde DB.
