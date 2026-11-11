# Correction L10 — formulaire de tri des boutiques et « Tous les états »

## Échec réel du premier SHA

GitHub `main` `3fd31f861e807dfd96ebd151f60f4b47d9b63371`, [run `43120844550`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43120844550) **completed failure** : qualité/types/tests/build et migrations PG16 success ; navigateur bureau et mobile 375 px failure (deux parcours échoués même après retry), archive skipped. [Annotations du job](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43120844550/job/130861816063) : après envoi du formulaire de tri `name-asc`, `getByRole('table')` introuvable, attendu « Boutique CI fictive ». Le formulaire GET soumet `status=''` pour « Tous les états », alors que `listOwnShops` rejetait ce statut comme inconnu. Le `toHaveURL(sort=name-asc)` prouvait seulement le changement d'URL, pas la présence du tableau.

## Correction et garde-fous

`parseShopStatus('')` renvoie l'absence de filtre, comme `undefined` ; les états non vides inconnus restent refusés (API 400/page 404). RLS, permission et SQL de tri whitelist inchangés. Test unitaire du parseur, assertions PGlite du formulaire complet `q=''&status=''&sort=name-asc` et E2E vérifiant aussi l'API avec état vide/invalide. Pas de migration, perte de fonctionnalité, Jumia ni vraie donnée.

Local : TypeScript/lint, **27/27 tests unitaires ciblés**, découverte 10 E2E et mémoire/diff OK. PGlite et E2E véritables non exécutés localement à cause des limites mémoire antérieures ; seule la CI du **nouveau SHA** pourra valider la correction. Le run rouge `43120844550` demeure rouge et ne valide pas ce correctif. Snapshot avant correction copié/vérifié hors dépôt.
