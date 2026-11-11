# Prochaines actions (Phase 1)

1. Finaliser et publier le commit local **révocation ciblée d'une autre session** descendant de `cbbe950`, sans force push ; snapshot avant déjà vérifié, snapshot après commit + archive GitHub Desktop à produire et tester. Confirmer ensuite quatre jobs Actions du **nouveau SHA** : qualité/tests/build, migrations PG16, navigateur bureau/mobile, archive. Les 38 tests ciblés et lint/types locaux ne prouvent pas le build/E2E du lot.
2. Corriger toute erreur CI avant d'annoncer « validé ». Télécharger l'artifact GitHub du bon SHA, vérifier SHA256 + bundle, restaurer dans un clone isolé et transférer une copie code indépendante hors GitHub ; présence seule ≠ restauration.
3. Préparer sauvegarde automatique chiffrée hors serveur et restauration testée des **données PostgreSQL réelles** quand hébergement et stockage séparé seront connus (informations non secrètes à demander). Ne jamais partager clé/token ou dump en Git.
4. Choisir le prochain lot P1 limité avec le propriétaire (invitations/accès, audit, SMTP/déploiement). Garder snapshots et mémoire à jour. MIMI/Jumia hors lot.
