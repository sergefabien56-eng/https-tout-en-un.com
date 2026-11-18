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
