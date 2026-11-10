# Phase 1 — correction du parcours connecté après le test RLS

## 1. Constat
- Le run GitHub Actions `42914330729` du commit `6fe9a5d` est **en échec**, malgré la perception initiale d'un résultat vert : qualité et migrations ont réussi ; navigateur a échoué sur bureau et mobile.
- La nouvelle étape de vérification RLS PostgreSQL n'a pas été signalée en échec : elle s'est exécutée avant les scénarios navigateur. La cause précise des deux échecs initiaux est `GET /api/admin/users/1` → 404 dans le scénario E2E.

## 2. Cause
- Le test RLS crée un compte fictif puis annule la transaction. PostgreSQL **ne restaure pas les séquences** après `ROLLBACK`. Le propriétaire bootstrapé ensuite n'a donc plus forcément l'ID numérique `1`.
- Les retries Playwright réutilisaient le même code de secours 2FA à usage unique : ils échouaient déjà à la connexion et masquaient le premier problème.

## 3. Correction
- Le scénario trouve l'identifiant réel du Propriétaire dans la liste autorisée, puis appelle l'API avec cet identifiant. Aucun identifiant séquentiel n'est supposé.
- Codes 2FA distincts par appareil et numéro de tentative, sans exposer leur contenu.
- Aucun assouplissement de RLS, aucune donnée de production, aucun secret supplémentaire.

## 4. Tests exécutés
- `npm run lint`, `npm run typecheck`, `npm test` (**123/123**) et `npm run build` réussis localement.
- Le scénario E2E PostgreSQL corrigé **n'a pas encore été rejoué** : nouvelle CI nécessaire après publication.

## 5. Validation attendue
- Publier un nouveau commit descendant du commit v6 ; vérifier les trois jobs et la nouvelle étape RLS ainsi que les parcours connectés bureau/mobile. En cas d'échec, reprendre le diagnostic.

## 6. État de Phase 1
- En cours. Pas de validation de mise en production ni de conclusion anticipée sur le nouveau run.
