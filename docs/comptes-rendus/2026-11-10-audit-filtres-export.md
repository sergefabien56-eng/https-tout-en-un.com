# Phase 1 — filtres du journal et export CSV (L6/L10, en cours)

## 1. Livré
- Filtres module, acteur et période inclusive en jours UTC (`from`, `to`) sur le journal d’une boutique. Dates valides strictement contrôlées, intervalle inversé refusé. Filtres conservés dans la pagination et le lien d’export.
- Export `GET /api/shops/[shopId]/audit/export` : **permission boutique `audit:read` ET `reports:export`** vérifiées dans la même transaction avec contexte RLS et `WHERE shop_id = $1`. Maximum 10 000 événements ; au-delà, erreur explicite au lieu d’une troncature silencieuse. En-tête CSV : boutique, période, horodatage UTC de l’export, colonnes des événements. `Cache-Control: no-store`, téléchargement, UTF-8.
- Tous les champs CSV sont échappés ; cellules commençant par `=`, `+`, `-` ou `@`, même après espaces ou tabulations, neutralisées par apostrophe. Aucune valeur `before`/`after` ou événement global n’est exporté.
- Fixture **CI jetable seulement** complétée avec deux chaînes hostiles (`=cmd`, `@hostile`) pour vérifier le CSV dans le navigateur connecté.

## 2. Tests exécutés
- Local : `npm run lint`, `npm run typecheck`, **149/149 tests** sur 19 fichiers, `npm run build`, `node --check` du script CI : réussis.
- PGlite : export autorisé et refusé selon les deux permissions, aucune fuite de boutique B / événement global, période UTC, neutralisation. Tests unitaires des formules, guillemets CSV et dates impossibles. Route sans session : 401.
- Parcours Playwright écrit pour télécharger le CSV fictif et vérifier la neutralisation sur PostgreSQL 16, **non encore exécuté pour ce lot**. La dernière CI publiée v14 (`42927207416`) était verte avant ce code.

## 3. Décisions
- CSV seulement pour l’instant : aucun export Excel/PDF « simulé ». Le journal ne montre pas encore de comparaison avant/après car leur contenu réclame une revue de confidentialité distincte.
- La neutralisation transforme aussi un nombre négatif initial en texte : pour un champ d’audit potentiellement hostile, l’intégrité et la sécurité priment sur l’interprétation numérique par le tableur.

## 4. Limites
- Pas d’export > 10 000 lignes ni de job asynchrone ; pas encore de débit dédié aux exports. Test de restauration, SMTP, invitations et déploiement restent à faire. Phase 1 non terminée.

## 5. Vérification attendue
- Publier le prochain paquet, vérifier les trois jobs et la réponse CSV du parcours authentifié sur bureau/mobile ; corriger tout échec.

## 6. Suite
- Revue des contenus avant/après, plafonds d’export adaptés, notifications et administration des comptes, puis sauvegarde/restauration réelle.
