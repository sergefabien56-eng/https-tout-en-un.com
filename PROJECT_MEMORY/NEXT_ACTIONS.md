# Actions suivantes — Phase 1

1. Publier le commit de la **recherche rapide enrichie** descendant de `a64593b` à partir de l'archive GitHub Desktop, sans force push et sans toucher à l'ancien `/home/user` divergent. Vérifier sur le **nouveau SHA** les quatre jobs verts (qualité/build/tous tests, migrations PostgreSQL 16, E2E bureau/mobile palette, archive). Les 35 tests ciblés/lint/types locaux ne suffisent pas pour déclarer le lot validé.
2. Télécharger l'artifact `code-valide-<sha>` du run Actions, vérifier `sha256sum -c *.sha256`, `git bundle verify *.bundle`, restaurer dans clone séparé, comparer HEAD ; transférer copie hors GitHub (rétention demandée 30 jours).
3. Avant données commerciales : demander sans partager de secrets l'hébergement PostgreSQL et le stockage séparé, définir chiffrement/RPO/RTO/rétention/alertes et réaliser restauration indépendante. Ne jamais lancer `scripts/test-backup-restore.mjs` contre une base réelle.
4. Choisir un autre lot P1 limité depuis le code et `docs/phase-1-plan.md` : snapshot avant/après, tests et mémoire. Recherche commandes/produits/Jumia et MIMI restent non livrées.
