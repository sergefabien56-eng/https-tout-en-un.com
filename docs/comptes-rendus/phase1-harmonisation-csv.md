# L10 — harmonisation des métadonnées CSV

## Périmètre

Les CSV rôles, utilisateurs et boutiques portent désormais une colonne « Période » valant « Sans période — instantané », en plus du périmètre et de la date UTC existants. Le CSV du journal d'une boutique précise que la borne de fin UTC est incluse et expose aussi les filtres module et acteur, en plus des bornes, de la recherche, du résultat, de la boutique et de la date UTC.

Toutes les métadonnées restent traitées par `safeCsvCell` contre les formules et correctement échappées. Aucun changement aux données exportées, requêtes, filtres, autorisations, RLS ou formats Excel. Ce lot modifie toutefois la **structure des deux premières lignes de métadonnées CSV** : colonnes ajoutées et libellé de fin du journal modifié ; les consommateurs automatisés dépendant de ces lignes doivent être adaptés. Les colonnes et l'ordre des lignes de données ne changent pas.

## Validation et limites

- 259 Vitest, lint/types/build et cohérence mémoire OK ; audit `--audit-level=high` passe avec 7 vulnérabilités modérées restantes. Tests des quatre en-têtes, filtres, bornes, valeurs hostiles et droits existants ; deux fichiers fictifs relus indépendamment par Python `csv` avec guillemets et virgules.
- 10 scénarios Playwright découverts ; assertions ajoutées pour les CSV, navigateur et PostgreSQL 16 réel du nouveau SHA non exécutés localement : CI à vérifier après publication.
- Base `4cf48226c4bf318082909f9800f6e8bce8fbedca` publiée ; [run 43645700922](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43645700922) quatre jobs verts, 10 tests navigateur ; artifact présent non téléchargé ni restauré.
- L10 et Phase 1 incomplets (invitations SMTP, devise, notifications, santé/worker, PDF et exports autres écrans) ; Windows en pause ; ZIP Arena ; snapshot code n'est pas une sauvegarde DB ni une copie indépendante.
