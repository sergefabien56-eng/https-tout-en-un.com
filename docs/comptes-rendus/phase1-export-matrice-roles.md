# L10 — export CSV de la matrice des rôles

## Fonction

La page des rôles, déjà adossée aux rôles/permissions réels, offre l'export CSV de la **même projection**. `/api/admin/roles/export` vérifie la session et deux droits **globaux** : `roles:manage` pour consulter la matrice et `reports:export` pour exporter. Lecture et autorisation s'exécutent dans la même transaction d'identité ; aucun droit boutique n'élargit le périmètre. La réponse est bornée, sans cache, pièce jointe UTF-8 BOM avec en-tête « organisation — droits globaux » et date UTC. Les libellés sont protégés contre les formules (`=cmd`, `+1`, `@x`, `-2`) et CSV correctement échappé. Ni secret ni donnée Jumia. La matrice système reste immuable hors migrations ; aucun changement de schéma, de permissions, de RLS ou d'écran existant.

Ce lot couvre le **CSV de la matrice uniquement** : pas d'Excel/PDF annoncé. L'export utilisateurs et l'export du journal boutique existent séparément. Le plan L10 dans son ensemble reste incomplet.

## Preuves et limites

Base locale `68bac8b` (sous-lot paramètres déjà committé **non publié/non validé CI** au dernier contrôle de GitHub `main=e6f087d`). Snapshot avant export du code vérifié sous `/home/user/continuity-backups/`. Local : TypeScript, lint ciblé, 6 tests unitaires ciblés (dont injection CSV), découverte 10 E2E et contrôle mémoire/diff OK. Un test d'intégration des permissions et un E2E CSV ont été ajoutés mais **non exécutés localement** : le test d'intégration PGlite du lot précédent a été tué par manque de mémoire. Build/E2E PG16 et CI du futur SHA à vérifier après publication. Pas de production, donnée réelle ni installation PC ; Windows demeure en pause.
