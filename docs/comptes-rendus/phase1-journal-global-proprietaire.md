# L10 — journal global du propriétaire

## Base

`33ff1799d59963b992fe68d38528e5ef04a52b79` est publié : [CI 44046217087](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/44046217087), quatre jobs verts. Les 20 parcours existants et deux parcours dédiés à la délégation sont verts ; l'artéfact de code est visible, non restauré. Le nouveau sous-lot décrit ci-dessous est local et n'est pas couvert par cette CI.

## Périmètre

Nouvelle page `/espace/journal/global`, liée depuis le journal boutique ; API `GET /api/admin/audit/global` non mise en cache. Session active, rôle `owner` **global** et droit `audit:read` global exigés côté serveur. Un rôle boutique, un gestionnaire global ou un accès Système délégué ne donne pas ce journal. Les données sont strictement les lignes `audit_log.shop_id IS NULL` : aucune ligne de boutique. La liste montre date UTC, acteur par identifiant, module, action, entité dans l'API et résultat. Les champs `before`, `after`, `request_id` et codes d'erreur sont exclus de l'API et de l'interface ; aucune recherche dans ces champs. Les valeurs en texte sont affichées comme texte par React, sans HTML exécuté.

Filtres action/module (recherche littérale), module, acteur, résultat et dates UTC inclusives, pagination 20. Aucun export du journal global n'est livré dans ce lot ; les exports boutique restent inchangés. Le journal est limité aux événements effectivement écrits par les fonctionnalités existantes : une liste vide ne démontre pas l'absence d'opérations non journalisées.

## Protection RLS et migration

Migration `0016_global_audit_read` : la policy historique `audit_log_isolation` (0007) autorisait la lecture des lignes globales dès qu'un contexte boutique était actif. Elle est resserrée aux seules lignes de cette boutique ; une policy SELECT séparée n'ouvre les lignes globales qu'au contexte LOCAL du propriétaire actif possédant `audit:read` global. Le contexte est fixé par le serveur après vérification de session et rôle, et ne vient pas du navigateur. Comme dans les autres policies à contexte local de ce projet, cela suppose que l'accès SQL applicatif ne permette pas à un tiers d'imposer arbitrairement des réglages de transaction ; la RLS ne remplace pas la protection des identifiants de base.

Le service refuse la lecture si la RLS n'est pas active pour le rôle de connexion ou si la policy attendue manque : pas de faux journal vide avant migration. Ce contrôle vérifie la présence et l'activation, pas une attestation indépendante de l'intégrité du schéma. La RLS filtre les **lignes**, non les colonnes ; la projection des colonnes est assurée par le service serveur, pas par une sécurité par colonne en base.

Le rollback de `0016` **ne supprime aucun événement**, mais restaure la policy antérieure 0007 : les audits globaux redeviennent visibles au rôle applicatif dans un contexte boutique au niveau SQL, et l'interface globale devient indisponible. Ne pas appliquer de rollback en production sans sauvegarde indépendante, revue des conséquences et plan de réapplication.

## Vérifications et limites

- 371 tests Vitest, lint et TypeScript réussis ; build et audit npm niveau high réussis (7 vulnérabilités modérées de développement).
- PGlite, rôle non-BYPASSRLS : global sans contexte, accès propriétaire, refus gestionnaire même global et session révoquée, séparation boutique A/B, exclusions des détails, filtres et bornes, pagination, API `no-store`, refus si policy manquante ou RLS désactivée.
- PostgreSQL 17 réel : RLS avec rôle applicatif non privilégié, migration `0016` appliquée, rollback et réapplication vérifiés sur base fictive. Le script de test RLS a été corrigé pour trier numériquement les identifiants, après un échec local lorsque la séquence a dépassé 9 ; assertions d'isolation conservées.
- Quatre parcours navigateur locaux sur PostgreSQL 17, bureau et mobile, avec sessions fictives injectées : deux de délégation précédents et deux de journal global. Les 20 autres parcours n'ont pas été rejoués localement. CI PostgreSQL 16 et CI complète du nouveau commit restent à valider après publication.

Aucun secret ni données réelles utilisés. L10 et Phase 1 restent incomplets : invitations et SMTP, surveillance et alertes critiques au seul propriétaire, règles financières, recette et déploiement/sauvegardes. Domaine/VPS/SMTP non fournis à ce jour. Windows en pause. Archive du code ≠ sauvegarde de base.
