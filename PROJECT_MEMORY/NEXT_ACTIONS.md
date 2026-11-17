# Actions suivantes — journal global propriétaire

1. Base publiée `33ff179` : [CI 44046217087](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/44046217087), quatre jobs verts, 20 parcours préexistants + 2 de délégation ; artéfact non restauré.
2. Lot local journal global : `docs/comptes-rendus/phase1-journal-global-proprietaire.md`. ZIP Arena → publication sans force → lien CI immédiatement au signal de publication → vérifier les quatre jobs verts avant autre lot. En cas de CI rouge, corriger sans masquer les échecs.
3. Vérifier migration 0016 PostgreSQL 16, RLS, anciens E2E et deux nouveaux parcours de journal. Rollback 0016 rétablit l'ancienne visibilité SQL globale en contexte boutique, sans supprimer les événements ; revue préalable indispensable en environnement réel.
4. Les exports actuels du journal sont limités aux boutiques ; export global non livré. Annuaire complet : accord individuel + `users:read` global pour non-propriétaire ; gestion/export globaux réservés au propriétaire. Rollback 0015 détruit les accords.
5. Restent invitations, SMTP sans secrets, surveillance et alertes critiques propriétaire seul, compteurs système sécurisés, recette L10 ; taux et formules XOF non définis. Domaine/VPS/SMTP attendus ultérieurement ; déploiement et e-mail réel non validés.
6. MIMI après L10, ordre avec L11/L12 à préciser. Windows en pause ; snapshot code ≠ sauvegarde base ; L10 et Phase 1 incomplets.
