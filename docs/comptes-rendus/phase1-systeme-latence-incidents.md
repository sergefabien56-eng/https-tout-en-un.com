# Lot Écran Système — latence par route et incidents applicatifs

Date : 18 novembre 2026. Base publiée au départ : `204fb87`. Auteur : agent, validation
propriétaire à faire. **Aucun chiffre n'est inventé : tout ce qui s'affiche est lu en base.**

## Ce que ce lot livre

1. **Latence réelle par route**, agrégée par tranche de 5 minutes, rétention 24 h, mesurée
   automatiquement sur **toutes** les routes API déclarées — sans modifier un seul gestionnaire.
2. **Incidents applicatifs** : lecture des `system_events` globaux sur 30 jours, compteurs par
   gravité, **acquittement** unique par le Propriétaire.
3. **Écran Système enrichi** : deux cartes remplacent les deux blocs qui disaient « Indisponible ».
4. **Export Système** (CSV, Excel, PDF) aligné : plus de « compteurs indisponibles ».

## Ce qui reste explicitement non livré

- **File de tâches et worker** : toujours « Indisponible ». Aucun état « OK » n'est simulé.
- **Collecteur d'erreurs automatique** : le catalogue existe, mais la RLS existante (0007)
  exige un contexte boutique pour **écrire** dans `system_events`. Le rôle applicatif ne peut
  donc pas alimenter les incidents. C'est mesuré par un test et **affiché tel quel** à l'écran.
  Livrer un écrivain demanderait un compte d'administration dédié : décision à prendre.
- **Latence réseau ou de rendu** : non mesurée, et l'écran le dit.

## Décisions techniques, avec les échecs qui les ont motivées

| Approche essayée | Résultat | Décision |
|---|---|---|
| Enveloppes générées dans `src/app/api/_measured/…` | **0 route générée** : le préfixe `_` est exclu du routeur Next | Abandonnée |
| Patch de `getRequestHandler` via `instrumentation.ts` | Compilation cassée (`WebpackError is not a constructor` dans le minifieur, reproductible après `rm -rf .next`) | Abandonnée |
| Écoute de `http.Server` (`'request'` → `'finish'`) | Fonctionne : **76 échantillons** réellement écrits sur une exécution e2e locale complète | **Retenue** |

La mesure est **silencieuse par construction** : elle n'écrit rien dans le flux, ne modifie
aucun en-tête, et toute erreur de mesure est avalée. Une panne de mesure ne dégrade pas le service.

## Sécurité et vie privée

- Aucune requête, aucun en-tête, aucune session, aucune adresse enregistrés : seulement
  `route_key` normalisée (`admin/users/[id]/status`), méthode, classe de statut, durées.
- Une route non déclarée dans `ROUTE_PERMISSIONS` n'écrit **rien** (test unitaire dédié).
- Incidents : lecture **et** acquittement exigent `system:manage` **et** le rôle global `owner`
  (policy 0018). Un gestionnaire global est refusé — vérifié par test.
- Un incident de boutique (`shop_id` non nul) n'apparaît jamais dans le périmètre global,
  même quand le rôle local de test est superutilisateur : filtre SQL explicite **et** RLS.
- Aucun message d'erreur client, aucune trace d'exception, aucun identifiant dans les incidents :
  le message vient d'un **catalogue fermé** de quatre codes.

## Défauts trouvés par les tests pendant ce lot (tous corrigés)

1. `/api/admin/users/export` était compté comme `admin/users/[id]` : un export réel était
   attribué à la fiche d'un compte. Corrigé par priorité aux segments littéraux.
2. Fenêtre de lecture : la tranche en cours était exclue (alignement puis recul d'une tranche).
3. Absence de **borne haute** : une fenêtre close dans le passé ramassait les mesures récentes.
4. `bucket_start` non aligné côté SQL : la contrainte d'alignement rejetait l'écriture réelle.
5. `samples` et `total_ms` partageaient un paramètre : type déduit incohérent en PostgreSQL.
6. Un test croyait changer de rôle PostgreSQL sans `BEGIN` : il testait en réalité le rôle
   propriétaire et **ne prouvait rien**. Corrigé, et l'assertion remplacée par une mesure réelle
   (`affectedRows = 0`) au lieu d'une exception qui n'arrive pas.
7. Test d'horodatage fixe : cassait dès que la suite complète dépassait la fenêtre. Rendu relatif.

## Vérifications locales

- `npx tsc --noEmit` : OK. `npx eslint .` : OK. `npm run build` : OK.
- `npx vitest run` : **427 tests, 80 fichiers, tous verts** (405 avant ce lot).
- e2e local ordre CI complet, base neuve : **19 passés / 5 sautés / 2 échoués**, et la base
  publiée `204fb87` donne **exactement les mêmes deux échecs** (`mobile-375` seulement).
  Ces deux-là sont des **échecs de charge sur cette machine** : `toHaveURL` sur `/espace` après
  connexion, et le tableau des boutiques non rendu à 375 px. Aucune régression imputable au lot.
- Échantillons de latence réellement écrits pendant ce run : `auth/csrf`, `auth/login`,
  `admin/users`, `notifications`, `shops`, `shops/[shopId]/audit/export`, etc.

## Limites dites au propriétaire

Pas de production, pas de lecteur d'écran réel, 375 px seulement, recette utilisateur non faite.
La CI reste le juge : quatre jobs verts, **zéro test instable** (cette base refuse qu'un test
réussisse à la reprise).

## Correctif du 18/11 — CI rouge sur le job navigateur (run 44320835442)

### Symptôme
Le job « Navigateur bureau et mobile 375 px » échouait sur `Timed out waiting 90000ms from
config.webServer` : le serveur de développement n'était jamais prêt. Journaux de la CI
inaccessibles (dépôt privé sans jeton) → diagnostic par annotations, puis reproduction locale.

### Cause
`src/instrumentation.ts` tirait, par imports statiques, la chaîne
`route-latency → core/db/client → pg` **et** `node:http`. En `next dev`, ce fichier est compilé
pour les runtimes nodejs **et** edge : la compilation échouait (`Can't resolve 'fs'`,
`Can't resolve 'pg-native'`, puis `UnhandledSchemeError: Reading from "node:http" is not
handled`), `/api/health` répondait **500** en boucle et Playwright expirait. Preuve par
soustraction : `instrumentation.ts` déplacé → `/api/health` 200 en ~10 s, zéro erreur.

### Tentatives écartées (ne pas les refaire)
1. import statique de `node:http` → `UnhandledSchemeError` ;
2. `import()` à spécificateur littéral → même graphe, même échec ;
3. `import()` à spécificateur variable → « Critical dependency », module enveloppé, exécution
   cassée ;
4. `serverExternalPackages` seul → insuffisant tant que le graphe statique contient `pg`.

### Correctif retenu
- `scripts/latency-hook.mjs` : crochet en **JavaScript pur, hors du bundle**, chargé par
  `import(/* webpackIgnore: true */ …)`. Il patche `http.Server` **et** `https.Server`
  (en HTTPS, `https.Server` n'hérite pas du prototype de `http.Server`).
- `src/instrumentation.ts` ne contient plus aucune référence à `node:http`, `pg` ou `argon2` ;
  garde `NEXT_RUNTIME === 'nodejs'` puis interrupteur explicite `LATENCY_INSTRUMENTATION=on`.
- `src/modules/monitoring/instrument-routes.ts` devient une **politique pure** (`decideSample`,
  `decideSamples`, `MEASURED_METHODS`, `MAX_BUFFERED_SAMPLES`) — testée, sans effet de bord.
- `src/modules/monitoring/route-latency-store.ts` : accès base uniquement ; draine le tampon
  global (`Symbol.for('toutenun.latency.buffer')`) déposé par le crochet. L'écriture est faite
  au premier chargement de l'écran Système, jamais pendant la requête mesurée.
- `next.config.mjs` : `serverExternalPackages: ['argon2', 'pg', 'pg-native']`.

### Défauts trouvés en vérifiant sur un serveur réel (et corrigés)
- `bucket_start` aligné sur 5 minutes : la tranche en cours n'étant pas terminée, les mesures
  des dernières minutes étaient invisibles. Ajout d'une colonne `started_at` (instant réel),
  utilisée pour la lecture de fenêtre et la purge de rétention.
- Refus explicites avant écriture : `assertWritableRouteKey` (route non déclarée) et durée hors
  bornes. Une mesure fausse affichée comme un fait est pire qu'une mesure manquante.

### Vérifications réelles (18/11)
- `next dev` neuf : `/api/health` **200 en 5 s**, `/espace` 307, `/connexion` 200 ; plus aucune
  erreur de compilation.
- `next build` : 0. `tsc` : 0. `eslint .` : 0. `vitest run` : **427/427**, 80 fichiers.
- Serveur autonome de production avec `LATENCY_INSTRUMENTATION=on` : 3 requêtes réelles → à la
  première ouverture de l'écran Système, `route_latency` contient
  `health | GET | 2 | samples=3 | max=32 ms`, horodatage récent. Aucune donnée simulée.
- Playwright local : non concluant sur ce bac à sable (Chromium « Page crashed », mémoire) ;
  la condition d'échec de la CI (serveur jamais prêt) est levée et vérifiée par `curl`.

### Reste à faire côté propriétaire
La migration **0018 n'est pas appliquée en production** : l'écran Système y affichera une
latence vide (et le message « aucune mesure ») jusqu'à son application.
