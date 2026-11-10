# Phase 1 — garde-fou d'isolation PostgreSQL (en cours)

## 1. Livré
- `scripts/test-rls.mjs` : test SQL exécutable uniquement avec `CI=true` et une connexion administrateur vers une **base CI jetable**. Il insère deux boutiques, un compte et des entrées d'audit fictifs dans une transaction qui finit **toujours par `ROLLBACK`**.
- Le script change de rôle dans la transaction (`SET LOCAL ROLE toutenun_app`) : vérifie `NOSUPERUSER`/`NOBYPASSRLS`, l'absence de visibilité sans `app.shop_id`, l'isolation A/B, l'UPDATE hors périmètre sans effet, le refus d'INSERT d'accès boutique hors périmètre (`WITH CHECK`), et les règles de visibilité du journal d'audit avec ou sans contexte.
- Job navigateur CI : lance ce contrôle **après les migrations et la création du rôle applicatif**, avant le bootstrap du propriétaire fictif. En cas d'échec, le job devient rouge ; aucun privilège RLS n'est contourné pour faire passer le contrôle.

## 2. Tests exécutés
- `node --check scripts/test-rls.mjs`, `npm run lint`, `npm run typecheck`, `npm test` : **123/123 tests locaux**, réussite.
- CI du **lot v5** (`5e2166f`) : trois jobs **completed success**, y compris E2E authentifié sur PostgreSQL 16. Ce succès est antérieur au nouveau script.
- **Test RLS PostgreSQL du présent lot non encore exécuté** : PostgreSQL/psql/Docker absents localement. Il doit tourner lors de la publication dans GitHub Actions. Aucun résultat présumé.

## 3. Décisions
- Données de contrôle strictement fictives et révoquées par rollback. Le script refuse une exécution hors CI, mais `CI=true` n'est pas une barrière de sécurité : il ne faut jamais le pointer vers la production.
- Les événements globaux du journal (sans boutique) sont visibles **uniquement si un contexte boutique est présent**, conformément à la politique actuelle ; l'autorisation applicative supplémentaire `audit:read` reste obligatoire pour toute future route de consultation.

## 4. Limites
- Le test CI vérifie les politiques des tables `shops`, `user_shop_access` et `audit_log`, pas toutes les tables ni l'absence de fuites possibles dans les futures routes. La couverture RLS reste à étendre.
- Les autres exigences P1 (administration des invitations, moteur de recherche, sauvegarde/restauration, HTTPS) ne sont pas encore terminées.

## 5. Vérification attendue
- Publier le prochain ZIP ; contrôler le job navigateur et précisément l'étape « Vérifier la RLS avec le véritable rôle applicatif ». Si elle échoue, corriger la policy ou le test, sans ignorer l'échec.

## 6. Suite
- Étendre l'isolation aux autres tables et finaliser les pages administratives sous permissions et RLS.
