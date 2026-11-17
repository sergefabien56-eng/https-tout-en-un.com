# Statut — Phase 1

- Base publiée `33ff1799d59963b992fe68d38528e5ef04a52b79`, [CI 44046217087](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/44046217087) : quatre jobs verts, 20 parcours préexistants + 2 de délégation, artéfact non restauré.
- Sous-lot local non publié et non couvert par cette CI : journal global limité au propriétaire, sans événements boutique ni before/after. Migration 0016 resserre RLS audit boutique et ouvre une lecture globale dédiée ; détails et rollback dans `docs/comptes-rendus/phase1-journal-global-proprietaire.md`.
- 371 Vitest, lint/types/build/audit high OK, PostgreSQL 17 réel non-BYPASSRLS et 4 E2E avec sessions fictives. CI PostgreSQL 16 et nouveau SHA à valider.
- XOF choisi sans taux ni formules ; alertes critiques au propriétaire uniquement ; seul le propriétaire modifie la matrice et télécharge l'export Système. SMTP, domaine et VPS seront fournis ultérieurement, sans secrets en conversation. Compteurs Système sous RLS indisponibles.
- Invitations, surveillance, règles financières, recette et déploiement/sauvegardes restent à traiter. ZIP Arena → publication sans force → lien CI immédiatement à « publié » → quatre jobs verts avant autre lot. L10 et Phase 1 incomplets ; Windows en pause ; snapshot code ≠ sauvegarde DB.
