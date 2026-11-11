# Phase 1 L10 — tri du catalogue des boutiques autorisées

La page « Toutes les boutiques autorisées » et `/api/shops` acceptent un tri : plus récentes (ordre antérieur, valeur par défaut), nom A–Z, nom Z–A. SQL `ORDER BY` construit exclusivement à partir d'une table fixe de trois expressions et contrôlé avant exécution ; aucune entrée libre injectée dans la requête. Le nom est ordonné en minuscules avec ID descendant comme départage stable. Recherche et état existants restent paramétrés et filtrés dans la même requête RLS par la session/droits ; pagination garde recherche, état et tri. Valeur inconnue : API 400, page 404. État vide distingué si filtres actifs. Aucun agrégat Jumia ni chiffre de vente simulé.

Tests : types/lint, 26/26 tests unitaires ciblés (dont tri borné et valeurs hostiles), découverte 10 E2E et mémoire/diff OK localement. Les assertions PGlite ajoutées vérifient ordre, invalidité et périmètre ; E2E bureau/mobile vérifie tri et API. **PGlite et vrais E2E non exécutés localement** à cause de la mémoire du sandbox ; CI du nouveau SHA obligatoire. Pas de migration, changement de permission, hébergement ni vraie donnée.

Ce sous-lot ne termine ni tout l'écran L10 (cartes et données métiers réelles non disponibles), ni L10/Phase 1. La base `d721595` (export utilisateurs) est validée par le run `43119275267`, quatre jobs verts ; ce run est antérieur à ce tri.
