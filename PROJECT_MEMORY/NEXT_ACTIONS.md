# Actions suivantes — Phase 1 recherche audit boutique

1. Finaliser le lot local descendant de `9055afb` : audit **uniquement boutique sélectionnée** via permission serveur/RLS ; préserver boutiques/comptes. 49 tests ciblés/lint/types/découverte Playwright locaux OK ; contrôler mémoire/diff/secrets, puis commit, snapshot après/empreintes, archive Desktop vérifiée par extraction propre. Snapshot avant `*avant-p1-recherche-audit*` déjà vérifié.
2. Publier normalement sans force push ; sur **nouveau SHA**, confirmer quatre jobs GitHub verts (lint/types/tous tests/build, migrations PG16, E2E bureau/mobile palette/page/permissions, archive code) et artifact du bon SHA. Les anciens jobs verts de `9055afb` ne valident pas ce lot.
3. Télécharger/restaurer artifact GitHub et conserver code indépendant hors GitHub ; planifier hébergement/SMTP et backup chiffré/restauré de la **vraie** base avec informations non secrètes du propriétaire. Aucun aperçu Arena n'est production.
4. Choisir après validation le prochain petit lot P1 ; MIMI/Jumia hors phase.
