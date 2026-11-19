# Jumia Connect — incrément 2 : le client HTTP

**Date** : 17 novembre 2026
**Portée** : `POST /token` et `GET /shops`. **Aucune interface, aucune écriture chez Jumia, aucune donnée réelle.**

---

## Ce qui est livré

| Fichier | Rôle |
| --- | --- |
| `src/modules/marketplace/jumia-client.ts` (327 lignes) | Conversation HTTP avec Vendor Center, traduite en résultat typé |
| `tests/integration/jumia-client.test.ts` (253 lignes) | 20 tests contre un **vrai serveur HTTP** sur `127.0.0.1` |

Ce module ne fait **que** deux choses : demander un jeton, lister les boutiques. Il ne prend pas le
verrou de renouvellement (c'est `jumia-tokens.ts`, incrément 1) et n'applique pas encore la limitation
de débit (incrément 3, table `api_rate_buckets`). Cette séparation est volontaire : le client reste une
brique testable sans base de données.

## Les quatre décisions qui structurent le code

1. **Aucune exception réseau ne remonte.** `request()` attrape le timeout, la coupure, le DNS. Un appelant
   qui doit décider d'un retry a besoin d'un **état**, pas d'un `throw`. Le résultat est une union
   discriminée : `ok` | `rate_limited` | `transient` | `rejected` | `fatal`.
2. **`invalid_grant` n'est pas une erreur de programmation.** Jumia renvoie un `400` avec `{error,
   error_description}` : un 400 signifie « jeton consommé », pas « bug ». Le corps OAuth est lu *avant*
   de conclure quoi que ce soit. `invalid_grant` → `rejected`, **jamais rejoué** (le refresh token est
   mort, insister le brûlerait davantage).
3. **Aucune durée en dur.** `expires_in` et `refresh_expires_in` viennent de la réponse. Si `expires_in`
   manque, le client **refuse** la réponse (`unexpected_response`) au lieu de supposer une valeur — une
   durée inventée décalerait silencieusement tous les renouvellements.
4. **Aucun jeton dans un message.** Les messages d'erreur sont tronqués à 300 caractères ; le corps de la
   requête, qui contient le refresh token, n'est jamais journalisé. Un test vérifie explicitement qu'aucun
   jeton n'apparaît dans un message d'erreur.

Détails conformes à l'OpenAPI archivé : corps `application/x-www-form-urlencoded` **sans
`client_secret`** (application Self Authorization) ; `GET /shops` **non paginé** et renvoyant un
**tableau nu** — une enveloppe `{data: …}` est traitée comme une réponse inattendue, pas comme un cas
tolérable. `Retry-After` n'étant pas documenté par Jumia, `parseRetryAfter` accepte les deux formes
usuelles (secondes, date HTTP) et renvoie `null` plutôt que d'inventer un délai.

## Ce qui a été vérifié, et comment

Commandes exécutées dans le dépôt, sortie conservée :

| Vérification | Commande | Résultat |
| --- | --- | --- |
| Types | `./node_modules/.bin/tsc --noEmit` | **0 erreur** |
| Tests du client | `vitest run tests/integration/jumia-client.test.ts` | **20/20 réussis** (267 ms) |
| Suite entière | `vitest run` | **82 fichiers, 462 tests réussis** |
| Style | `eslint src/modules/marketplace tests/integration/jumia-client.test.ts` | **0 problème** |

Les tests ne simulent pas `fetch` : ils démarrent un `http.createServer` sur le port 0 et laissent le
client faire une vraie requête TCP. Ce qui est ainsi réellement éprouvé : l'en-tête
`Content-Type`, la forme exacte du corps, la présence du `Bearer`, le statut reçu, l'en-tête
`Retry-After`, et le comportement au-delà du délai (le serveur ne répond pas, le client abandonne avec
`code: 'timeout'` et **aucune exception**).

Cas couverts, y compris ceux qui protègent contre des suppositions flatteuses :

- le corps envoyé ne contient **pas** `client_secret` ;
- une réponse sans `expires_in` est refusée, pas complétée d'office ;
- `invalid_grant` et `invalid_client` sont classés non rejouables, avec leur message d'origine ;
- un 429 avec et sans `Retry-After` (dans le second cas : pas de délai inventé) ;
- un 500 est rejouable ; un 400 sans code OAuth est fatal ;
- un corps non JSON est tronqué et classé fatal ;
- `GET /shops` ignore une entrée inexploitable plutôt que de créer une boutique fantôme ; une enveloppe
  inattendue est refusée ; un 401 propage `invalid_grant` sans retry ;
- la production est la cible par défaut, le staging est connu mais non activé.

## Ce que cet incrément ne prouve pas

**Rien de tout cela n'a touché la vraie API.** Aucun compte Vendor Center, aucun `refresh_token` réel.
Les tests prouvent la conformité au contrat OpenAPI archivé, **pas** le comportement de Jumia en
production. Deux points restent explicitement inconnus et sont notés dans `docs/jumia-integration.md`
comme « à observer en réel » : la présence effective de `Retry-After` / `X-RateLimit-*`, et le format
exact des erreurs sur un jeton expiré en cours de route. Tant que l'accès n'existe pas, la Phase 2 ne
peut pas être déclarée terminée (spec §10).

## Suite

- **Incrément 3** : limitation de débit partagée (`api_rate_buckets`, 200/min et 4/s, web et worker
  confondus) — c'est là que `rate_limited` et `retryAfterSeconds` trouveront leur consommateur.
- **Incrément 4** : assistant d'ajout de boutique en 6 étapes.
- **Incrément 5** : synchronisation 90 jours — toujours bloquée par les règles de calcul XOF non tranchées.
