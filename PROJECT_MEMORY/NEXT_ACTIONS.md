# Actions suivantes — diagnostic palette audit

1. Vérifier le test E2E diagnostique local (`tests/e2e/authenticated-admin.spec.ts`) : lint/types/découverte Playwright, contrôles mémoire/diff ; committer descendant de `213dca6`, snapshot après vérifié et archive Desktop restaurée en clone propre.
2. Après publication normale sans force, lire l'annotation/les traces du **nouveau SHA** : si pas de fetch navigateur → corriger déclenchement ; si réponse API erronée → isoler cookie/permission ; si réponse correcte mais UI absente → corriger rendu/état client. Ne pas neutraliser le test ni simplement augmenter son délai. Exiger ensuite quatre jobs verts sur le SHA du correctif métier, pas sur le SHA de diagnostic seul.
3. Télécharger/restaurer l'artifact code GitHub quand quatre jobs verts et conserver copie hors GitHub. Indépendamment, planifier backup chiffré/restauré de la vraie base PostgreSQL avec hébergeur et stockage distinct ; aucun backup réel vérifié.
