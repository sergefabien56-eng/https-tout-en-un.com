# Phase 1 — déconnexion de tous les autres appareils (lot local)

- Base publiée : GitHub `main` `a78a9010a5e3e7a03d68bf2a625e87199b2adb61`, CI `43065395902` **completed success**, quatre jobs verts qualité/build, PostgreSQL 16, E2E bureau/mobile et archive. Artifact du même SHA présent, **non téléchargé/restauré depuis GitHub**. Preuve hors dépôt `/home/user/continuity-backups/verification-publication-a78a901.md`.
- Choix du propriétaire : compléter la sécurité des sessions par **déconnexion de tous les autres appareils**, jamais du courant. Service/route/UI/guide/tests dans `docs/comptes-rendus/phase1-deconnecter-tous-autres-appareils.md`. Nouveau lot **local descendant, non publié ni validé en CI**. Aucune migration.
- Local : 43/43 tests ciblés PGlite/route/UI, lint, typecheck, découverte des 10 E2E réussis ; suite complète/build/E2E du nouveau SHA **non exécutés localement**. Requiert CI du nouveau SHA avant validation.
- Aucun hébergement de production ni sauvegarde PostgreSQL réelle chiffrée hors serveur et restaurée vérifiés. La fixture PostgreSQL CI et l'artifact GitHub code temporaire ne remplacent pas cela. MIMI/Jumia non livrées.
