# Actions suivantes — délégation des rôles boutique

1. Base publiée `9fa2b45` : [CI 43974576655](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43974576655), quatre jobs verts, 20 E2E ; artifact non restauré.
2. Sous-lot de mutation déléguée local : voir `docs/comptes-rendus/phase1-delegation-roles-boutique.md`. ZIP Arena → publication sans force → lien CI immédiatement au signal de publication → contrôler quatre jobs verts avant tout autre lot. Si CI rouge, corriger sans masquer les échecs.
3. Vérifier les deux nouveaux parcours navigateur et le test concurrence PostgreSQL 16 du nouveau SHA ; les tests locaux PostgreSQL 17 et sessions fictives ne remplacent ni CI ni recette humaine complète.
4. Annuaire complet : accord individuel + `users:read` global pour non-propriétaire ; export et gestion des comptes globaux réservés au propriétaire. Rollback 0015 supprime les accords ; prévenir avant usage réel.
5. Restent invitations, SMTP sans secrets, surveillance et alertes critiques propriétaire seul, compteurs système sécurisés, recette L10 ; taux et formules XOF non définis. Domaine/VPS/SMTP attendus ultérieurement ; déploiement et e-mail réel non validés.
6. MIMI après L10, ordre avec L11/L12 à préciser. Windows en pause ; snapshot code ≠ sauvegarde base ; L10 et Phase 1 incomplets.
