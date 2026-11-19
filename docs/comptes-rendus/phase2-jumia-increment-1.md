# Jumia Connect — incrément 1 : les fondations

**Date** : 17 novembre 2026
**Portée** : renouvellement des jetons OAuth2 Jumia. **Aucune interface, aucune écriture chez Jumia.**

---

## Ce qui est livré

| Fichier | Rôle |
| --- | --- |
| `drizzle/0020_marketplace_tokens.{up,down}.sql` | Journal des renouvellements (append-only), garde anti-rotation, RLS sur `marketplace_apps` |
| `src/modules/marketplace/jumia-tokens.ts` | Renouvellement verrouillé, chiffrement des jetons, réutilisation du cache |
| `tests/integration/jumia-tokens.test.ts` | 8 tests sous PostgreSQL WASM |
| `scripts/test-jumia-token-race.ts` | Concurrence réelle (plusieurs connexions PostgreSQL) |
| `.github/workflows/ci.yml` | Le test de concurrence tourne en CI, job « Migrations » |

## Pourquoi commencer par là

Dans l'API Vendor Center, **chaque `POST /token` invalide le refresh token utilisé** et en renvoie un
nouveau. Si deux renouvellements partent en même temps pour la même application, le second présente un
jeton déjà consommé : Jumia répond `invalid_grant`, et la boutique est déconnectée jusqu'à ce que le
propriétaire régénère un jeton à la main dans Vendor Center.

C'est une panne définitive, silencieuse, et qui n'apparaît qu'en charge. Tout le reste de
l'intégration — lecture des boutiques, synchronisation, écrans — suppose que ce point est juste. Sans
le verrou, le reste est faux.

## Les trois protections

1. **Verrou consultatif par application** — `pg_advisory_xact_lock(hashtext('marketplace_app:'||app_id))`,
   pris avant toute relecture et tenu jusqu'au `COMMIT`. Valeur texte, donc stable entre processus.
2. **Relecture sous verrou** — le second appelant voit le jeton déjà renouvelé et le réutilise, sans
   appeler Jumia. Un jeton d'accès valable plus de 5 minutes n'est jamais renouvelé.
3. **Garde anti-rotation perdue** — si l'appel HTTP réussit mais que l'écriture échoue, le refresh
   token en base est périmé. La colonne `rotation_guard_at` rend l'état explicite : l'application exige
   une reconnexion manuelle au lieu de boucler sur `invalid_grant`.

`invalid_grant` ne déclenche **aucun retry** : la boutique passe en `reauth_required` une fois pour
toutes.

## Ce qui a été vérifié, et comment

PostgreSQL 17 réel (cluster jetable), 20 migrations appliquées, rôle `toutenun_app` sans `BYPASSRLS`.

- **Deux renouvellements simultanés → 1 seul appel API.** Prouvé par `scripts/test-jumia-token-race.ts` :
  2 appels concurrents, serveur factice lent (400 ms), compteur d'appels = 1, journal =
  `[refreshed, reused_cached]`.
- **La contre-épreuve est concluante** : en retirant le verrou consultatif, le même test échoue avec
  `un seul renouvellement attendu, 2 observé(s)`. Le test sait donc échouer.
  En revanche, retirer `FOR UPDATE` **seul** ne fait pas échouer le test : la sérialisation vient du
  verrou consultatif, `FOR UPDATE` ne protège que la cohérence de la ligne. Les deux sont conservés,
  le second pour la relecture cohérente.
- **La RLS protège les jetons** : sans contexte propriétaire, `marketplace_apps` renvoie 0 ligne au
  rôle applicatif ; une insertion de journal hors énumération est refusée par la policy.
- **Le journal est immuable** : `UPDATE` et `DELETE` renvoient 0 ligne sous le rôle applicatif.
- **Migration réversible** : `down` puis `up` rejoués sans erreur ; table, index et colonnes absents
  après retour arrière.
- **23 tests verts**, `tsc --noEmit` propre, `eslint` propre.

## Ce qui n'est pas fait, et ne peut pas l'être ici

- **Aucun test contre l'API réelle.** Aucune application Vendor Center ni `refresh_token` réel
  n'existe. La spec §10 est explicite : sans accès réel, la Phase 2 ne peut pas être déclarée
  terminée. Le client HTTP est écrit contre la spécification, avec un serveur factice.
- **Pas encore livré** : le client HTTP Vendor Center (`POST /token`, `GET /shops`, curseurs
  `nextToken`/`isLastPage`, 429/`Retry-After`), la limitation de débit `api_rate_buckets`, et
  l'assistant d'ajout en 6 étapes.
- **Aucune règle financière** : taux, commissions et conversions XOF restent non tranchés.

## Prochain incrément proposé

Le client HTTP Vendor Center, avec son serveur factice : `POST /token`, `GET /shops`, pagination
`nextToken`/`isLastPage`, et gestion de `429` + `Retry-After`. C'est ce qui branche le renouvellement
ci-dessus sur une vraie conversation HTTP — toujours sans toucher à une API réelle.
