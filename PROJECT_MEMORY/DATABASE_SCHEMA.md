# Schéma de données effectivement migré (v34)

**Source de vérité** : `drizzle/0001_*.up.sql` … `0016_*.up.sql` et `.down.sql` ; `docs/database.md` est une conception plus large, **pas** le schéma effectif. L'exécuteur `scripts/migrate.mjs` suit `schema_migrations`, versions et checksums ; vérifier la base cible avant toute commande.

| Migrations | Tables / modifications réellement présentes |
|---|---|
| 0001 | primitives SQL, fonctions de mise à jour et protection d'audit ; suivi `schema_migrations` par exécuteur |
| 0002 | `marketplace_apps` (identité application, jetons chiffrés et rotation prévue), `shops` (boutique Jumia × pays, devise/contraintes, référence à application) |
| 0003 | `users` (hash mot de passe, TOTP, sécurité), `sessions`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_shop_access` ; cinq rôles système |
| 0004 | `app_settings`, `audit_log` (triggers anti-update/delete), `system_events`, `rate_limits` |
| 0005 | policies RLS + FORCE RLS sur `shops`, `user_shop_access`, `audit_log`, `system_events` |
| 0006 | données de permissions et associations rôles/permissions |
| 0007 | compteur TOTP anti-rejeu `users.totp_last_counter` et durcissement de policies audit/événements |
| 0008 | lecture catalogue des boutiques limitée au contexte utilisateur authentifié |
| 0009 | `user_notifications` : `user_id`, `shop_id` facultatif, `kind` actuellement `security_login`, `title`, `message`, `created_at`, `read_at` ; RLS propre utilisateur |
| 0010 | policy INSERT audit dédiée aux changements lu/non lu de notification personnelle |
| 0011 | policy INSERT audit limitée aux mutations de rôle global, acteur concordant avec le contexte local ; lecture RLS inchangée |
| 0012 | policy INSERT audit pour les deux paramètres globaux nom/fuseau, acteur concordant avec le contexte local ; lecture RLS inchangée |

Aucune table commandes/produits/stocks/finance Jumia réelle migrée à ce stade. **Ne pas publier de données de dump.** Sauvegarde CI sur base jetable : `scripts/test-backup-restore.mjs` ; elle ne concerne ni des données commerciales ni une copie chiffrée externe.

- **0013** : policy INSERT d’audit pour `update_reference_currency`, acteur local, pas de droit de lecture ; réversible. Valeur explicite sous la clé `organization.reference_currency` de `app_settings`, aucun taux ni conversion.

- **0014** : policy INSERT audit limitée aux changements de matrice des rôles.
- **0015** : `user_directory_access` et policy d'audit pour les accords individuels ; le rollback détruit les accords.
- **0016** : policy audit boutique resserrée, policy SELECT des audits globaux pour le propriétaire actif et index global. Le rollback restaure la policy SQL 0007 plus permissive pour les lignes globales en contexte boutique ; voir `docs/comptes-rendus/phase1-journal-global-proprietaire.md`.
