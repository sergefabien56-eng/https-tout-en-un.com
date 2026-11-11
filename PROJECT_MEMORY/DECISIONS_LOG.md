# Décisions et traçabilité

- Phase 0 : Vendor Center API OAuth (pas Seller Center historique) ; boutique = boutique Jumia × pays ; stock distant remplace la valeur observée ; marges estimées et confirmées distinctes ; aucune facture officielle fabriquée. Références `docs/jumia-integration.md` et `docs/README.md` (**propositions de conception ; validation utilisateur à confirmer**).
- P1 : PostgreSQL, SQL versionné + RLS, rôle applicatif sans BYPASSRLS, TOTP, audit immuable ; justifications dans `docs/architecture.md`, code/SQL dans `src/` et `drizzle/`.
- v34 : actualisation manuelle des notifications, aucune prétention temps réel, voir `docs/comptes-rendus/2026-11-11-actualisation-notifications.md`.
- Jalon mémoire : 13 documents dans `PROJECT_MEMORY/` + outil non destructif `scripts/project-memory.mjs` ; travailler sur clone descendant de v34 pour préserver `/home/user` ; snapshot Git+source avant/après jalon ; ne pas confondre backup de code avec backup de base.

Pour chaque nouvelle décision : date, auteur/validation, options, raison, impact, SHA et preuve de test. Changement de technologie ou suppression de fonction : demander validation explicite.

- Jalon Phase 1 archive : job Actions après trois validations sur push `main`, avec artifact temporaire de code sans secret et sans base ; aucune prétention de backup hors GitHub ni de backup production. Déploiement réel différé sans informations opérateur.
