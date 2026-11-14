# Reprendre ici — export Excel utilisateurs

Base GitHub `c6aeddd8a1cac04ccf3ba7d3c240a91e0717cf9b` publiée ; [run 43643492681](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43643492681) quatre jobs verts, 10 tests navigateur. Artifact présent, non téléchargé ni restauré.

Lot L10 local : export Excel utilisateurs, mêmes droits globaux et filtres que CSV, valeurs dangereuses neutralisées, aucun secret exporté, voir `docs/comptes-rendus/phase1-export-excel-utilisateurs.md`. 250 Vitest, lint/types/build/audit high OK (7 modérées), classeur fictif relu par openpyxl. 10 E2E listés seulement, navigateur et PG16 réels du nouveau SHA non exécutés localement.

ZIP sur Arena → publication sans force → lien CI dès « publié » → quatre jobs du nouveau SHA avant autre lot. Lire `AI_HANDOVER.md` et `NEXT_ACTIONS.md`. Sauvegarde indépendante recommandée ; snapshot code n'est pas sauvegarde DB. Windows en pause, L10 et Phase 1 incomplets ; pas de secrets ni traces en livraison.
