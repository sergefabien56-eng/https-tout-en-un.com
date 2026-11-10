# Référence — spécification OpenAPI officielle Jumia (archivée)

**Source** : `https://vendorcenter.jumia.com/api-docs/openapi.yaml` et l'ensemble des fichiers qu'elle référence (chemins, textes, messages d'erreur).
**Récupérée le** : 2026-11-10, par téléchargement direct des fichiers `$ref` résolus.
**Version documentée** : GPM/GOP **v2.0 (2026-08-11)** et compléments **v9.0 (2026-09-16)** pour les champs retour/QC des lignes de commande.
**Hôte d'API indiqué par la spec** : `https://vendor-api.jumia.com` (live) · `https://vendor-api-staging.jumia.com` (staging).

## Pourquoi ces fichiers sont dans le dépôt

1. **Traçabilité** : `docs/jumia-integration.md` cite des champs et des comportements précis ; l'archive permet de vérifier chaque affirmation à la date indiquée.
2. **Contrats de test** : les fixtures de la Phase 2 seront dérivées de ces schémas, pas inventées.
3. **Détection de changement** : un job de comparaison (Phase 2) alertera si la spécification publiée par Jumia diffère de cette archive — une API qui change sans préavis est un risque réel (cf. les corrections « breaking » de la v2.0).

## Contenu

| Fichier | Contenu |
|---|---|
| `openapi.yaml` | racine : serveurs, tags, chemins, sécurité `bearerAuth` |
| `text-files__version-control-&-intro.md` | introduction, glossaire (feed, mastershop), **limites de débit** (200 req/min, 4 req/s par Mastershop), historique de versions et corrections |
| `text-files__step-by-step-auth-description.md` | OAuth 2.0 : Self Authorization vs Web Application, rotation du refresh token, dépannage |
| `text-files__error-messages.html` | messages d'erreur de création produit |
| `paths__*` | une trentaine de fichiers : `shops`, `catalog/*`, `feeds/*`, `orders/*`, `payout-statement`, `consignment-*`, `authentication/*` |

## Ce que cette archive **ne** contient pas

- Aucun endpoint de **facture** (voir `docs/jumia-integration.md` §7).
- Aucun **webhook**.
- Aucune limite de débit chiffrée par endpoint (seulement la limite globale annoncée).
- Aucune garantie de stabilité : les fichiers ont déjà connu une réécriture « breaking » documentaire en août 2026.

## Mise à jour

Pour rafraîchir : télécharger `openapi.yaml`, puis tous les fichiers `paths/…`, `text-files/…` référencés, et comparer (`git diff`) avant de mettre à jour les documents de conception. Un changement de schéma se traduit par une décision explicite, jamais par une adaptation silencieuse du code.
