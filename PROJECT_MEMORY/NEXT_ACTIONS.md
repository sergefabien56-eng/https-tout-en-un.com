# Actions suivantes — corriger l'assertion E2E audit

1. Vérifier lint/types/tests ciblés/découverte E2E + mémoire/diff du test corrigé `module='ci'`, conformément à la fixture `scripts/seed-e2e-shop.mjs` ; commit descendant de `ea09d9d`, snapshot après vérifié, archive GitHub Desktop extraite/HEAD/empreinte vérifiés. Snapshot avant déjà copié/contrôlé.
2. Publier normalement sans force push par propriétaire. Vérifier sur **nouveau SHA** quatre jobs verts (qualité/build, PG16, navigateur bureau/mobile sans flaky, archive code) et artifact présent ; l'ancien run de diagnostic `43071602554` reste rouge. Si nouvel échec, lire annotations plutôt que masquer les tests.
3. Télécharger/restaurer artifact GitHub du code dans clone isolé puis conserver copie hors GitHub ; indépendamment prévoir backup chiffré/restauré des **vraies données PostgreSQL** après informations non secrètes hébergeur/stockage. Aucun aperçu Arena n'est une production.
4. Après validation, choisir petit lot P1 suivant, sans commencer MIMI/Jumia.
