# Correctif L10 — audit des paramètres globaux

## Constat et diagnostic

`dc803d9d9d3fe414ca6aba534e5c08173178e654` est publié. [Run 43636585803](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43636585803) : qualité et migrations PostgreSQL 16 vertes ; navigateur rouge (9 réussis, 1 échec bureau, y compris retry), archive sautée. Les traces montrent deux PUT `/api/admin/settings/organization-name` avec réponse 503 et l’interface indique l’échec d’enregistrement ; ce n’est pas une simple attente trop courte. Les traces restent privées et ne sont pas intégrées au dépôt.

Reproduction PGlite indépendante : en rôle non superutilisateur et sans BYPASSRLS, l’INSERT d’audit global des paramètres (`update_organization_name` et `update_timezone`) est rejeté par `audit_log` (code 42501). L’ancienne RLS n’autorise les écritures globales sans boutique que pour notification et rôle global, pas pour les paramètres. C’est une cause cohérente et fortement étayée du 503 ; le message d’erreur SQL du run GitHub lui-même n’est pas disponible dans les traces navigateur, donc ne pas prétendre qu’il y a été observé directement. Les tests PGlite initiaux utilisaient un rôle privilégié, masquant cette différence.

## Correction

Migration réversible `0012_settings_audit` : policy INSERT uniquement, `shop_id NULL`, module `settings`, entité `app_setting`, actions strictement `update_timezone` ou `update_organization_name` ; acteur égal au contexte transactionnel `app.audit_actor_id`. Après authentification et autorisation globale `settings:manage`, les deux services posent ce contexte LOCAL avant insertion, dans la même transaction. Le test vérifie l’annulation de la mutation si l’audit échoue. Aucune lecture d’audit ouverte par la policy.

Comme pour les autres policies contextuelles, l’acteur est posé par l’application dans la transaction : ce n’est **pas** une identité de base distincte par utilisateur et cette policy ne remplace pas la vérification d’autorisation serveur.

## Vérifications et limites

- 231 tests Vitest sériels OK, dont tests PGlite de services réels sous rôle `NOBYPASSRLS`, échec sur acteur absent/différent, module/action/entité/boutique non autorisés, absence de lecture et rollback lors d’un audit impossible. Migrations up/down PGlite OK.
- Lint, types, build et cohérence mémoire OK. Test RLS CI PostgreSQL 16 élargi aux deux actions et cas interdits.
- Scénario navigateur renforcé : vérifie HTTP 200 et persistance après rechargement pour nom et fuseau, sans retirer d’assertion. Dix scénarios découverts ; **navigateur et PostgreSQL 16 réels non exécutés localement**. CI du prochain SHA indispensable.
- Selon la demande, livraison ZIP dans Arena, pas sur Drive ; l’espace Arena n’est pas une sauvegarde indépendante. Le propriétaire doit télécharger et conserver une copie durable séparée. Windows en pause, L10 et P1 incomplets.
