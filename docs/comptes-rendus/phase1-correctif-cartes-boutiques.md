# Correction L10 — assertion du mode d'affichage invalide

## Run rouge, cause vérifiée

GitHub `main` `4be54738ffa0dd9c42c49373535b73d9d22dcb93`, [run `43272897889`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43272897889) **completed failure**. Qualité/types/tests/build et migrations PostgreSQL 16 success ; navigateur bureau et mobile 375 px failure (deux parcours, retry aussi), archive skipped. [Annotations du job](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43272897889/job/131374865867) : ligne 244, l'assertion du test attendait **HTTP 404** pour `/espace/boutiques?view=invalid`, reçu **HTTP 200**. Le code appelle `notFound()` avant lecture boutique ; Next.js App Router peut avoir commencé le flux du layout authentifié et renvoyer une page d'erreur « 404 / This page could not be found. » avec le statut de transport 200 (soft 404). Le contrat de test sur le code HTTP était donc trop strict pour ce rendu streamé ; ce n'est pas une preuve que la page de boutiques était affichée.

## Correction retenue

Dans le parcours navigateur existant, naviguer vers le mode invalide et vérifier la **présence visible des titres 404 et « This page could not be found. »**, ainsi que l'absence du tableau. Revenir ensuite sur une vraie page boutique et vérifier qu'elle reste fonctionnelle ; poursuivre l'accessibilité et les autres assertions existantes. **Aucun code d'autorisation, de validation de `view`, de RLS, de service ni de migration modifié.** Le test n'est pas supprimé ni désactivé ; il observe l'effet utilisateur du refus même si le transport est déjà en flux. Les API restent soumises à leurs propres contrôles HTTP.

Local : TypeScript/lint, 27/27 tests unitaires ciblés, découverte des 10 E2E et mémoire/diff **OK** sur ce correctif ; **vrais E2E PG16 non exécutés localement** (sandbox limité). Seule la CI du **futur SHA** peut valider le correctif ; le run `43272897889` demeure rouge. Snapshot avant correction vérifié hors dépôt. Aucune production/donnée réelle.
