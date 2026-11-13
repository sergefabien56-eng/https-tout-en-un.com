# Actions suivantes — délais CI navigateur

1. `4148ac6` publié ; [run 43518057115](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43518057115) : qualité/PG16 succès, navigateur échec sur 1 flaky fiche utilisateur, archive sautée. Cause exacte inconnue ; correctif des délais de test ci-présent, voir `docs/comptes-rendus/phase1-delais-assertions-e2e.md`.
2. ZIP Drive → publication sans force par le propriétaire → lien CI immédiatement à « publié » → vérifier **quatre jobs du SHA publié** avant tout lot. E2E de ce correctif non exécutés localement. Si nouvel échec, inspecter trace au lieu d'allonger indéfiniment.
3. Après validation, poursuivre vrais critères L10 : invitations (serveur SMTP préalable), paramètres/devise/notifications, santé réelle, Excel/PDF et validation. MIMI souhaitée après L10, ordre avec L11/L12 à confirmer. Phase 1 incomplète ; Windows en pause ; pas de secrets, traces ou données réelles dans les livraisons.
