# Actions suivantes — périodes rapides du journal

1. Sur le clone descendant `/tmp/toutenun-continuity-audit`, vérifier lint/types, tests ciblés de périodes/audit, découverte E2E, mémoire et diff du lot « 7/30 jours UTC » ; ne pas changer les droits ou les filtres existants. Snapshot avant déjà copié/vérifié hors dépôt.
2. Commit propre descendant du SHA publié `ae540ec`, snapshot après copié/vérifié hors dépôt, archive GitHub Desktop contrôlée par extraction/HEAD/`git fsck`/arbre propre ; demander au propriétaire de publier normalement sans force push.
3. Sur **le nouveau SHA**, vérifier quatre jobs CI verts (qualité/build, migrations PG16, navigateur bureau/mobile, archive code) et artifact présent ; si échec, lire annotations et corriger sans supprimer le test. Ne pas attribuer l'ancien run vert `43073364514` à ce lot.
4. L'artifact GitHub et les octets Drive de `ae540ec` ne sont pas retéléchargés/restaurés ; copie privée Drive des sources avec MD5 conforme et restauration ZIP local déjà effectuées. Prévoir un test de restauration depuis Drive et backup chiffré/restauré des **vraies données PostgreSQL** avant toute production. Aucun aperçu Arena n'est une production.
