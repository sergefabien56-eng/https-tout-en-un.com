# L10 — export Excel des utilisateurs

## Périmètre

La page Utilisateurs propose le format Excel en plus du CSV. Les deux formats partagent le même chargement autorisé et filtres recherche/statut/rôle : `users:read` et `reports:export` **globaux** sont nécessaires ; un rôle limité à une boutique ne suffit pas. Toutes les pages sont incluses, maximum 10 000 lignes, au-delà refus explicite. Aucune migration ou permission modifiée.

Le classeur indique périmètre organisation, période « Sans période — instantané », date UTC et filtres. Il contient uniquement identifiant, nom, e-mail, statut et date de création UTC. Aucune empreinte de mot de passe, jeton, secret 2FA, attribution détaillée ou donnée boutique. Les cellules sont du texte, caractères XML invalides remplacés et préfixes dangereux neutralisés ; limite 32 767 unités UTF-16 par cellule. Réponse `no-store`, `nosniff`, fichier fixe.

## Validation et limites

- 250 tests Vitest, lint, types, build, cohérence mémoire et `git diff --check` OK ; audit `--audit-level=high` passe, **7 modérées restantes**. Tests PGlite des droits globaux, filtres, refus, valeurs hostiles et parité CSV.
- Tests format et route (erreurs 400/403/503, aucun secret), classeur fictif relu indépendamment par `openpyxl` sans formule ; valeurs `=cmd`, `+1`, `@x` neutralisées.
- 10 scénarios Playwright découverts ; assertions Excel ajoutées mais navigateur et PostgreSQL 16 réels de ce nouveau SHA **non exécutés localement** : à confirmer par la CI après publication.
- Base `c6aeddd8a1cac04ccf3ba7d3c240a91e0717cf9b` publiée, [run 43643492681](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43643492681) quatre jobs verts, 10 tests navigateur ; artifact CI présent mais non téléchargé ni restauré.
- Ce lot n'achève pas L10 ni Phase 1. Windows en pause ; ZIP dans Arena ; conserver copie indépendante ; snapshot code n'est pas sauvegarde DB.
