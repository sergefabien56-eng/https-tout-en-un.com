# Statut — Phase 1

- Base publiée `9fa2b45c15b6126cdc2e83175b66ad71f3a1c822`, [CI 43974576655](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43974576655) : quatre jobs verts, 20 parcours navigateur, artifact non restauré.
- Lot L10 local non publié et non couvert par cette CI : délégation limitée des rôles de boutique aux membres à accès actif, sans escalade de permissions et avec protections du propriétaire, des invitations et de soi-même ; détails et limites dans `docs/comptes-rendus/phase1-delegation-roles-boutique.md`.
- 363 Vitest, lint/types/build/audit high OK, PostgreSQL 17 réel non-BYPASSRLS et deux E2E session fictive réussis. Une tentative locale à deux workers a échoué ; cause non établie. CI PostgreSQL 16 et nouveau SHA à valider.
- XOF choisi sans taux ni formules ; alertes critiques au propriétaire uniquement ; seul le propriétaire modifie la matrice et télécharge l'export Système. SMTP, domaine et VPS seront fournis ultérieurement, sans secrets en conversation. Compteurs Système sous RLS indisponibles.
- Invitations, surveillance, règles financières, recette et déploiement/sauvegardes restent à traiter. ZIP Arena → publication sans force → lien CI immédiatement à « publié » → quatre jobs verts avant autre lot. L10 et Phase 1 incomplets ; Windows en pause ; snapshot code ≠ sauvegarde DB.
