# Recette L10 — écran Système : file de limitation de connexion

> État : **local, non publié**. Base `9069f1e` (run 44269439637, quatre jobs verts).

## 1. Le mensonge évité

L'écran Système affichait « File de tâches : indisponible » — exact, puisque le worker
n'existe pas. Mais une table `rate_limits` **existait déjà et était alimentée** par
`login()` : une ligne par empreinte d'adresse e-mail et par fenêtre de 15 minutes.
L'écran ne la lisait pas.

Le lot ne crée donc **aucune file de tâches**. Il lit une mesure réelle et refuse de
l'appeler autrement que ce qu'elle est : *limitation de connexion*.

## 2. Ce qui est livré

| Élément | Contenu |
|---|---|
| `readQueueSnapshot(db, now)` | Lit `rate_limits` sur la fenêtre courante : seaux actifs, tentatives comptées, seaux au plafond |
| `DeepHealth.queue` | Passe de la chaîne `'indisponible'` à un objet typé **ou `null`** |
| Écran Système | Nouveau bloc « Limitation de connexion » avec les quatre valeurs et leur explication |
| Exports CSV/Excel/PDF | Quatre lignes ajoutées, jamais d'empreinte |
| `/api/health/deep` | Expose les mêmes valeurs, sans clé de seau |

## 3. Ce qui n'est jamais exposé

- Aucune **empreinte** de seau (`key_hash`) — vérifié par test sur 32 caractères hexadécimaux.
- Aucune **adresse e-mail** en clair.
- Le compteur ne prétend ni surveiller les erreurs applicatives, ni remplacer une file de tâches :
  la phrase est portée par `queue.limits` et affichée à l'écran.

## 4. Un zéro qui est une preuve, un `null` qui est un aveu

Le dépôt refuse les faux zéros. Ici la distinction est explicite :

- **base fraîche** → `activeBuckets: 0` : c'est une lecture réussie, un zéro mesuré ;
- **lecture impossible** → `queue: null` : l'écran affiche « Indisponible » ;
- **test E2E après connexion** → `activeBuckets > 0` exigé strictement : la connexion du test
  vient d'écrire dans la table, un zéro serait donc un mensonge. Ce test échouerait si la
  lecture était factice.

## 5. Correction annexe : quatre routes déclaraient une fausse méthode

`route-permissions.ts` déclarait `PUT` pour quatre routes qui exportent en réalité :

| Route | Déclaré | Exporté | Corrigé |
|---|---|---|---|
| `admin/users/[id]/status` | PUT | PATCH | PATCH |
| `admin/users/[id]/global-roles` | PUT | POST | POST |
| `admin/users/[id]/shop-roles` | PUT | POST | POST |
| `admin/users/[id]/shop-access` | PUT | POST + DELETE | POST |

Le test de couverture comparait les **chemins**, pas les **méthodes** : l'erreur était invisible.
Un test ajouté lit désormais les exports réels de chaque `route.ts` et exige que la méthode
déclarée en fasse partie. Prouvé par réintroduction volontaire de l'erreur : le test échoue
avec `admin/users/[id]/status déclare PUT mais exporte PATCH`.

## 6. Preuves locales

- `npm run typecheck` : propre. `npm run lint` : propre. `npm run build` : réussi.
- `npx vitest run` : **391 tests / 76 fichiers** (390 avant, +1 test de cohérence des méthodes).
- Navigateur, dans l'ordre exact de la CI : le test Système passe en bureau et en mobile 375 px
  et lit une valeur réelle (`activeBuckets: 1, attemptsInWindow: 3` observés).

## 7. Limite du résultat local

Sur cette machine (2 Go de RAM), des échecs intermittents subsistent — **y compris sans ce lot**
(exécution de référence : 3 échecs). Ils portent sur des clics de navigation, pas sur l'écran
Système. Seule la CI tranchera.

## 8. Ce que ce lot ne fait pas

- **Aucune file de tâches**, aucun worker, aucune tâche planifiée, aucune reprise automatique.
- **Aucun collecteur d'erreurs** : le bloc reste « Indisponible », sans faux OK.
- Aucune alerte envoyée au propriétaire (dépend d'un SMTP absent).
- Aucune mesure de latence par route : seule la durée de la requête de contrôle est mesurée.
