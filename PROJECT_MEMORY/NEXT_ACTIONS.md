# Actions suivantes — correctif E2E sessions

1. Corriger la fausse hypothèse « zéro autre session » en vérifiant uniquement la ligne de l'appareil courant, conserver API 404 et tests sécurité. Déjà modifié localement dans `tests/e2e/authenticated-admin.spec.ts` ; exécuter lint/types/tests ciblés, check mémoire/diff, puis commit descendant de `c868cb9` et snapshot après.
2. Remettre archive GitHub Desktop vérifiée au propriétaire ; publier **sans force push**. Sur le nouveau SHA, attendre les 4 jobs verts et artifact du code. En cas d'échec E2E, lire annotations/traces puis corriger sans supprimer le test ni passer `failOnFlakyTests=false`.
3. Télécharger l'artifact depuis GitHub, vérifier et restaurer en clone isolé, conserver code hors GitHub. Préparer hors dépôt backup chiffré/restauré de la **vraie** base PostgreSQL quand hébergeur et stockage distinct seront précisés ; aucune sauvegarde réelle vérifiée.
4. Reprendre ensuite un autre lot P1 limité ; pas MIMI ni données Jumia.
