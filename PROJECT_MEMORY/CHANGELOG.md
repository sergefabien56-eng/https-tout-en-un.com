## 2026-11-18 — Écran Système : latence par route et incidents applicatifs (local, non publié)

- Deux blocs qui affichaient « Indisponible » lisent désormais des mesures réelles. Migration `0018` :
  table `route_latency` (agrégats 5 min, rétention 24 h) et policies de lecture/acquittement des
  `system_events` globaux, réservées à `owner` **et** `system:manage`.
- Latence mesurée **sans toucher aux 52 gestionnaires** : écoute de `http.Server`. Deux approches
  ont été essayées et **échouent** — enveloppes dans `src/app/api/_measured/` (dossier `_` ignoré
  par Next, 0 route produite) et patch de `getRequestHandler` via `instrumentation.ts` (casse la
  compilation : `WebpackError is not a constructor`). Les deux échecs sont documentés dans le
  compte rendu pour ne pas être retentés.
- Lucide : 76 échantillons réellement écrits en e2e local. Aucune requête, aucun en-tête, aucune
  adresse : route normalisée, méthode, classe de statut, durées.
- Incidents : catalogue fermé de 4 codes, 30 jours, acquittement unique, incident de boutique
  jamais visible côté global (filtre SQL explicite en plus de la RLS).
- **Non livré et affiché comme tel** : worker et file de tâches ; collecteur automatique (le rôle
  applicatif ne peut pas écrire dans `system_events`, RLS 0007), décision d'un compte dédié à prendre.
- Sept défauts trouvés par les tests et corrigés (voir le compte rendu) : collision
  `admin/users/export` ↔ `[id]`, fenêtre sans borne haute, tranche en cours exclue, écriture
  non alignée, paramètre partagé en SQL, test qui croyait changer de rôle PostgreSQL, horodatage fixe.
- Vérifications : `tsc`, `eslint`, `build` OK ; **427 Vitest** (405 avant), 80 fichiers, tous verts.
  e2e local ordre CI : 19 passés / 5 sautés / 2 échoués, **les deux mêmes échecs que sur `204fb87`**
  (charge machine, `mobile-375` seulement).

## 2026-11-17 — correctif E2E : hydratation React avant le clic du tiroir (local, non publié)

- Run 44205074253 (commit `88dd21e`) : qualité et migrations vertes ; job navigateurs rouge sur **un seul test**, le nôtre. Les logs donnent la cause exacte : `aria-expanded` reste à `false` après le clic, sans erreur de clic.
- Diagnostic : en CI le serveur est `next dev` et la navigation se fait en `domcontentloaded` : le HTML est affiché **avant** que React n'attache ses gestionnaires, donc le clic est silencieusement perdu. Mon test local utilisait `next start` (production, hydratation immédiate) et masquait le défaut.
- Correctif : `waitForHydration()` attend une clé `__reactProps$` sur le bouton, puis le clic est rejoué sous `expect(...).toPass()` — un clic perdu avant hydratation est ainsi distingué d'un vrai défaut.
- Vérification : `✓` avec `next dev` sur les premières pages (le test avance bien plus loin qu'avant), et `✓` complet (13 pages, tiroir fermé et ouvert) avec le build de production. Les échecs restants en local sont un `Out of memory: Killed process next-server` constaté dans `dmesg` sur une machine à 2 Go, pas un défaut applicatif.
- 390 Vitest, lint et typecheck verts.

## 2026-11-17 — correctif E2E : codes de secours partagés (local, non publié)

- Run 44201672782 (commit `6ded693`) : jobs qualité et migrations verts, job navigateurs **rouge** à l'étape « Parcours publics et authentifiés ».
- Cause : `tests/e2e/mobile-overflow.spec.ts` réutilisait le **scénario 2** de `owner-codes.ts`, déjà consommé par `authenticated-admin.spec.ts`. Un code de secours est à usage unique : la seconde connexion échoue. Bug introduit par ce lot, invisible en exécution isolée.
- Correctif : scénarios **4 et 5** réservés au test mobile, fichier de codes porté de 16 à **24** (`scripts/extend-e2e-recovery.mjs` : 10 + 14), garde-fou `index >= 24` levé explicitement. Documentation de la règle dans `owner-codes.ts`.
- Vérifié sur base neuve, suite complète : le test mobile **passe** ; deux tests préexistants de la suite bureau restent intermittents en local, sur un lot d'échecs qui change d'un run à l'autre (instabilité machine, pas régression). La CI tranche.
- 390 Vitest, lint et typecheck verts.

## 2026-11-17 — audit des dépendances : blocage sur la production seulement (local, non publié)

- CI rouge sur `main` (`7e419827`, run 44161139878) **sans changement de dépendances** : avis `picomatch` GHSA-fc5q-39xc-vjpf (high) publié le 2026-10-19, **aucune version corrigée disponible** ; `npm audit fix --force` ne ferait que rétrograder vitest 4.x → 3.1.4.
- Décision du propriétaire (option B sur trois) : la CI bloque sur `npm audit --omit=dev --audit-level=high` (**0 vulnérabilité en production**) ; l'audit complet reste exécuté et affiché, non bloquant. Justification, limites et plan de retour : `docs/securite/audit-dependances.md`.
- Aucun paquet rétrogradé, aucun contrôle supprimé, aucune faille de production tolérée.

## 2026-11-18 — Navigateur : délai de navigation insuffisant en mobile (correctif du run 44297920494)

- Le run 44297920494 a échoué sur **un seul test**, en mobile 375 : `page.goto('/espace/recherche')` a atteint le budget de 120 s en attendant l'événement `load`. Le test a réussi à sa reprise, mais `failOnFlakyTests` est activé en CI — volontairement : un test instable n'est pas vert.
- **Aucun rapport avec le lot Apparence** : les 20 autres tests sont passés, dont l'import réel du logo et les aperçus clair/sombre.
- Correctif : budget porté à **180 s** sur les quatre parcours, et `waitUntil: 'domcontentloaded'` pour `/espace/recherche` (l'assertion suivante vérifie le titre rendu). Les attentes d'assertion restent à 20 s. Voir `docs/comptes-rendus/phase1-apparence-logo.md` §11.
- **Validé par le run 44301784481** sur `204fb87` : quatre jobs verts, **21 passés, 5 sautés, 0 instable**, étape 11 en **6,4 min** au lieu de 8,9 min avant expiration. Le diagnostic de délai est confirmé par la mesure, pas seulement par le raisonnement.

## 2026-11-18 — Apparence : nom « PRO », icône provisoire et logo commun (publié et validé par 35d40c8)

- **Nom** : `APP_NAME` = « TOUT EN UN BUSINESS MANAGER PRO », `APP_SHORT_NAME` = « TOUT EN UN PRO ». Source unique inchangée (`app.config.ts`), aucun nom recopié dans un écran — le test qui le vérifie passe toujours.
- **Icône de marque** : cinq formes (quatre boutiques reliées à un carré central), bleu marine et turquoise, dessinée en SVG sans fichier externe. **Deux pistes comparées le 18/11, la seconde retenue par le propriétaire** ; le SVG du dépôt reprend ce dessin exact en tracés. L'écran la déclare encore provisoire tant qu'il ne l'a pas déclarée définitive.
- **Logo commun** : import par le **Propriétaire seul**. Un seul fichier, adaptation automatique : `object-fit: contain` (proportions conservées) et plaque claire ajoutée en mode sombre seulement si les pixels sont sombres. Aperçu simultané en clair, en sombre et à 20 px, avant tout envoi.
- **Contrôle serveur** : type relevé sur les octets (SVG refusé), 1 Mio maximum, 32 à 2048 px, écart de proportions 1:4 maximum, ré-encodage `sharp` qui efface les métadonnées. Stockage en `app_settings`, aucun fichier sur disque.
- **Droits** : `settings:manage` ne suffit pas (le Gestionnaire le possède) — vérification du rôle `owner` dans le module. Prouvé par test d'intégration en appel direct, hors écran. La lecture est ouverte à tout compte connecté, y compris un membre limité à une boutique (défaut trouvé par test, corrigé).
- **Migration 0017** : la policy RLS du journal refusait l'audit du logo. Policy étroite ajoutée pour `update_organization_logo` et `remove_organization_logo`, sans ouvrir la lecture. Le journal ne contient jamais l'image.
- **Préférences individuelles** : le thème clair/sombre reste local au navigateur ; aucun code du logo n'y touche. Vérifié par test.
- Locaux : typecheck, lint, build, **405 Vitest / 77 fichiers**. Navigateur : import réel d'un logo sombre 300×200, aperçu clair/sombre, retrait. Échecs intermittents de navigation sur cette machine, également présents sans ce lot.
- **Publication validée** : [run 44292382777](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/44292382777) sur `35d40c8`, quatre jobs verts, étapes 11 et 13 vertes, « Traces en cas d'échec » sautée. Voir `docs/comptes-rendus/phase1-apparence-logo.md`.

## 2026-11-18 — Système : file de limitation de connexion et méthodes de routes (publié et validé par c8100b0)

- **Recette L10 Système (local, CI en attente)** : `DeepHealth.queue` passe de la chaîne `'indisponible'` à une mesure réelle de `rate_limits` (seaux actifs, tentatives, seaux au plafond, fenêtre de 15 min, plafond 10). Aucune empreinte ni adresse ne sort, prouvé par test. Un zéro sur base fraîche reste une lecture réussie ; une lecture impossible vaut `null` et l'écran affiche « Indisponible ». **Aucune file de tâches n'est créée** : le worker n'existe toujours pas et l'écran le dit.
- **Correction** : quatre routes déclaraient `PUT` alors qu'elles exportent `PATCH` ou `POST` (`admin/users/[id]/status`, `global-roles`, `shop-roles`, `shop-access`). Le test de couverture comparait les chemins, pas les méthodes. Un test lit désormais les exports réels ; prouvé par réintroduction volontaire de l'erreur.
- Locaux : typecheck, lint, build, **391 Vitest / 76 fichiers**. Navigateur dans l'ordre CI : test Système vert en bureau et mobile, mesure réelle observée (`activeBuckets: 1`, `attemptsInWindow: 3`). Échecs intermittents ailleurs, **également présents sans ce lot** (3 échecs sur une référence).
- **Publication validée** : [run 44278561288](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/44278561288) sur `c8100b0`, quatre jobs verts, étapes 11 et 13 vertes, « Traces en cas d'échec » sautée. Voir `docs/comptes-rendus/phase1-systeme-limitation-connexion.md`.

## 2026-11-18 — accessibilité : six écrans d'administration audités (publié et validé par 9069f1e)

- **Recette L10 accessibilité (local, CI en attente)** : six écrans sans aucun contrôle Axe (`roles`, `utilisateurs`, fiche compte, `systeme`, `sessions`, `journal/global`) passent désormais par `expectNoSeriousAccessibilityViolations`. Audit mené d'abord sans modification : aucune violation `serious`/`critical`, résultat prouvé par un témoin `image-alt` et par des assertions de contenu (un écran d'erreur serait « propre » aussi). Aucun code applicatif touché.
- Choix assumé : **instrumentation des parcours existants** plutôt que deux tests supplémentaires. Le login est limité à 10 tentatives par adresse et par fenêtre de 15 minutes (compteur persistent `rate_limits`, mesuré à 16 localement) ; un fichier de deux tests supplémentaires aurait fait basculer la suite au-delà du quota. Tests inchangés à 26, codes de secours inchangés à 24.
- Locaux : typecheck, lint, **390 Vitest / 76 fichiers** ; suite navigateur dans l'ordre exact de la CI (deux vagues, fixtures semées entre les deux) : 21 + 4 passés, **0 échec, 0 flaky**.
- Limite : sur cette machine (2 Go), les navigations échouent par intermittence **même sur le code non modifié** (2 échecs sur une exécution de référence) ; la stabilité réelle ne sera établie que par la CI.
- **Publication validée** : [run 44269439637](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/44269439637) sur `9069f1e`, quatre jobs verts, étapes 11 et 13 du navigateur vertes en une seule tentative, « Traces en cas d'échec » sautée. Voir `docs/comptes-rendus/accessibilite-ecrans-admin.md`.

## 2026-11-17 — recette L10 : routes, isolation, exports hostiles, mobile (local, non publié)

- `src/core/auth/route-permissions.ts` : source de vérité des 52 routes API (méthode + permission ou `null` publique) et des pages publiques.
- `tests/integration/route-coverage.test.ts` (7 tests) : liste déclarée == liste réelle sur disque, pages `/espace/**` gardées, routes `admin/*` déléguées à un module RLS, écritures hors `auth/` protégées par origine/CSRF.
- `scripts/test-isolation-postgres.ts` : 10 vérifications sur PostgreSQL 17 réel sous rôle `toutenun_app` non-BYPASSRLS — autorisations qui fonctionnent et fuites impossibles dans les deux sens.
- `tests/integration/hostile-exports.test.ts` (5 tests) : 21 routes d'export × 15 charges hostiles = 315 requêtes, aucun 5xx, refus 4xx explicites, BOM vérifié sur les octets.
- `tests/e2e/mobile-overflow.spec.ts` : 13 pages à 375 px, tiroir fermé et ouvert, aucun défilement horizontal de page ; tableaux larges admis dans leur conteneur `overflow-x:auto`.
- `scripts/e2e-locale.sh` et `PW_START_CMD` : recette navigateur locale rejouable (base neuve, fixtures, build de production) ; la CI garde `npm run dev`.
- 390 Vitest / 76 fichiers, lint, typecheck et build verts.

## 2026-11-17 — export du journal global (local, non publié)

- Routes `GET /api/admin/audit/global/export/{csv,xlsx,pdf}` : propriétaire global + `reports:export` global, RLS et policy vérifiées, `shop_id IS NULL` uniquement, sans before/after/request_id ; 10 000 lignes (CSV/Excel), 1 000 (PDF).
- Trois liens d'export filtrés sur `/espace/journal/global`.
- 378 tests Vitest (+7), lint, types et build verts ; PostgreSQL 17 réel sous rôle non-BYPASSRLS avec téléchargements réels 200.

- **L10 devise de référence XOF (local, CI en attente)** : Lot L10 local : paramètre XOF enregistré explicitement et audité, seul XOF accepté ; exports nom/fuseau/devise, aucune conversion. Migration 0013 réversible et policy audit limitée. 334 Vitest, lint/types/build/audit high OK (7 modérées), PDF fictifs relus ; navigateur et PostgreSQL 16 réels du nouveau SHA à vérifier en CI (14 E2E listés). Voir `docs/comptes-rendus/phase1-devise-reference-xof.md`. Base publiée `61931b07ccd45f5db00ed361c401b641143421ec` ; [CI 43926512820](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43926512820) : quatre jobs verts, dont 14 tests navigateur ; artifact non restauré.

- **Liste des membres par boutique (locale, CI en attente)** : vue/API en lecture seule, RLS et `roles:manage` boutique, membres à accès actif, pagination, rôles d’autres boutiques et globaux non exposés ; 357 tests locaux. Délégation de mutation non livrée. Base `df6ed79` validée par CI `43971381747` (quatre jobs, 18 navigateurs). Voir `docs/comptes-rendus/phase1-membres-boutique.md`.

- **Accès individuel à l’annuaire (local, CI en attente)** : propriétaire seul à accorder/révoquer, en plus de users:read global ; export et écriture globaux réservés au propriétaire, migration 0015, 353 tests locaux. Les délégués ne gèrent pas encore les membres boutique. Base `c3d8f41` validée par CI `43942671568` (quatre jobs, 18 navigateurs). Voir `docs/comptes-rendus/phase1-annuaire-acces-individuel.md`.

- **Matrice des rôles modifiable (locale, CI en attente)** : propriétaire seul, rôle owner protégé, confirmation, audit/rollback, contrôle de valeur antérieure ; permission Système et rôles délégables mais attribution boutique déléguée pas encore implémentée. Base `f9f3109` validée par run `43937792327` (quatre jobs, 18 navigateurs). Voir `docs/comptes-rendus/phase1-matrice-roles-modifiable.md`.

- **Correctif CI sans session (local, CI en attente)** : run XOF `43933906412` rouge navigateur flaky, archive sautée ; trace vérifiée, cumul de navigation/requêtes et timeout global. Scénario découpé en trois sans retirer assertions, modifier limites ou désactiver failOnFlakyTests ; 334 Vitest et contrôles locaux verts, 18 E2E listés. Quatre jobs à valider après publication ; voir `docs/comptes-rendus/correctif-ci-smoke-ccf3912.md`.

- **L10 export Système et correction faux zéro (publié et validé par 61931b0)** : propriétaire seul, CSV/Excel/PDF, compteurs masqués par RLS indisponibles/`null` ; [CI 43926512820](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43926512820) quatre jobs verts et 14 tests navigateur ; artifact non restauré.

- **L10 PDF paramètres (publié et validé par 393573e)** : seuls nom et fuseau, droits globaux ; [run 43762590007](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43762590007) quatre jobs verts et 14 tests navigateur ; artifact non restauré.

- **L10 PDF journal (publié et validé par 6cf8be7)** : mêmes filtres, RLS et droits que CSV/Excel, fin UTC incluse, données sensibles exclues, pagination bornée ; 299 Vitest locaux. [Run 43761332925](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43761332925) quatre jobs verts et 14 tests navigateur ; artifact non restauré.

- **Correctif CI parcours boutiques/journal/sessions (publié et validé par f3ac2f2)** : base `1005473` publiée, [run 43757504110](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43757504110) qualité/PG16 verts, navigateur rouge, archive sautée ; les deux traces montrent un cumul jusqu'à 120 s. Découpage en deux tests autonomes, assertions et sécurité conservées, 16 codes fictifs CI ; 291 Vitest/lint/types/build/audit high OK, 7 modérées, 14 E2E listés. [run 43759955270](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43759955270) quatre jobs verts et 14 tests navigateur.

- **L10 PDF boutiques (publié en 1005473, validé avec correctif f3ac2f2)** : mêmes filtres/tri, RLS et droits que CSV/Excel, indisponible « — », pagination bornée, police embarquée ; 290 Vitest/lint/types/build/audit high OK, 7 modérées, PDF fictifs relus ; navigateur et PostgreSQL 16 réels du nouveau SHA à valider (12 E2E listés). Base `d80d195` publiée, [run 43755748145](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43755748145) quatre jobs verts ; artifact non restauré.

- **L10 PDF utilisateurs (publié et validé par d80d195)** : mêmes filtres et droits globaux que CSV/Excel, pagination bornée et police embarquée ; 283 Vitest/lint/types/build/audit high OK, 7 modérées, PDF fictifs relus ; [run 43755748145](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43755748145) quatre jobs verts, dont navigateur et PostgreSQL 16 ; artifact non restauré. Base `98eaee8` publiée, run `43744750704` également vert.

- **L10 PDF matrice des rôles (publié et validé par 98eaee8)** : même matrice et droits globaux que CSV/Excel, pagination et bornes documentées, police embarquée avec licence, caractères non pris en charge refusés. 278 Vitest/lint/types/build/audit high OK, 7 modérées, PDF fictifs relus indépendamment ; `npm ci` local interrompu sur argon2, compilation manuelle puis tests/build réussis ; installation propre, navigateur et PG16 validés au [run 43744750704](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43744750704), quatre jobs verts. Base `5afc9a9` publiée, run `43742241101` quatre jobs verts.

- **L10 export paramètres d’organisation (publié et validé par 5afc9a9)** : CSV/Excel des seuls nom et fuseau, droits `settings:read` et `reports:export` globaux, valeurs hostiles neutralisées, périmètre/date/période. 273 Vitest/lint/types/build/audit high OK, 7 modérées ; 12 E2E listés, navigateur et PG16 réels à valider. Base `63df5cf` publiée, run `43649987828` quatre jobs verts.

- **Correctif CI durée parcours (publié et validé par 63df5cf)** : `5be4476` publié, run `43646861790` qualité/PG16 verts, navigateur flaky rouge et archive sautée ; trace montre limite globale de 120 s atteinte après accumulation d'étapes, dernière requête non prouvée responsable. Découpage du parcours, sessions indépendantes, codes fictifs CI supplémentaires ; assertions et `failOnFlakyTests` conservés. 262 Vitest/lint/types/build/audit high OK, 7 modérées ; SQL sur PGlite, 12 E2E listés, navigateur et PG16 réels à valider.

- **L10 métadonnées CSV (publié en 5be4476, CI navigateur rouge)** : instantané explicite sur rôles/utilisateurs/boutiques ; journal dates UTC fin incluse et filtres module/acteur ; colonnes de métadonnées ajoutées, attention aux consommateurs automatiques. 259 Vitest/lint/types/build/audit high OK, 7 modérées ; E2E et PG16 réels du nouveau SHA à valider. Base `4cf4822` publiée, run `43645700922` quatre jobs verts.

- **L10 Excel journal boutique (publié et validé par 4cf4822)** : mêmes filtres, RLS et droits que CSV, textes hostiles neutralisés, before/after exclus ; 257 Vitest/lint/types/build/audit high OK, 7 modérées, E2E et PG16 réels du nouveau SHA à valider. Base `4c55ea5` publiée, run `43644540811` quatre jobs verts.

- **L10 Excel utilisateurs (publié et validé par 4c55ea5)** : mêmes filtres et droits globaux que CSV, texte hostile neutralisé et aucun secret exporté ; 250 Vitest/lint/types/build/audit high OK, 7 modérées, E2E et PG16 réels du nouveau SHA à valider. Base `c6aeddd` publiée, run `43643492681` quatre jobs verts.

- **L10 Excel boutiques (publié et validé par c6aeddd)** : mêmes filtres, RLS et droits d'export que CSV, valeurs tableur neutralisées, données Jumia absentes « — », 244 Vitest/lint/types/build/audit high OK, 7 modérées, E2E et PG16 réels du nouveau SHA à valider. Base `adcdaa3` publiée, run `43642226784` quatre jobs verts.

- **Correctif transport API des tests CI (publié et validé par adcdaa3)** : `14d046e` publié, run `43639821115` qualité/PG16 verts, navigateur rouge ECONNRESET flaky, archive sautée ; cause non prouvée. `Connection: close` sur appels API directs des tests sans retry ni modification du navigateur ; simulation de reset artificiel, 238 Vitest/lint/types/build/audit high locaux OK, 7 modérées. E2E et PG16 réels du nouveau SHA à valider en CI.

- **L10 Excel matrice des rôles (publié, CI navigateur rouge)** : format XLSX, contrôles d'export globaux, neutralisation des formules et limites, 235 Vitest/lint/types/build/npm ci/audit high locaux OK (7 modérées), navigateur et PG16 réels du nouveau SHA non exécutés localement. Base `6fe9e95` publiée et validée, run `43638313462` quatre jobs verts, artifact non restauré. ZIP Arena demandé par le propriétaire ; L10 et P1 incomplets.

- **Correctif audit paramètres (depuis validé par 6fe9e95)** : run `43636585803` de `dc803d9` navigateur rouge (PUT nom HTTP 503), archive sautée. Reproduction en rôle non privilégié : refus RLS d'audit global ; migration 0012 étroite et contexte d'acteur transactionnel pour nom/fuseau, 231 Vitest/lint/types/build OK, navigateur et PG16 du nouveau SHA non exécutés localement. Livraison Arena au lieu de Drive à la demande du propriétaire.

- **L10 nom de l’organisation (publié, run navigateur rouge ; correctif en attente)** : paramètre général explicite, droits globaux, Origin/CSRF, audit atomique et idempotence. 229 Vitest, lint/types/build locaux OK, navigateur réel non exécuté localement. Base `aa5bdab` publiée et validée sur le run `43519659898` (quatre jobs verts), artifact non restauré. Phase 1 incomplète, Windows en pause.

- **Délais E2E (historique ; depuis validé par aa5bdab)** : `4148ac6` publié, run `43518057115` navigateur rouge (1 flaky fiche utilisateur, attente URL 5 s), archive sautée. Hypothèse délai insuffisant ; cause exacte inconnue. Assertions Playwright par défaut 20 s et scénario long 120 s, strictes et flaky toujours bloquant ; 220 Vitest, lint/types locaux réussis, E2E réel non exécuté. Phase 1 incomplète, Windows en pause.

- **Correctif CI sessions (local, CI en attente)** : `2584616` publié, run `43511441768` navigateur rouge (1 flaky) et archive sautée. Trace propriétaire : navigation sessions HTTP 200 en ~5,1 s, délai titre 5 s expiré. Test attend désormais URL et titre avec marge, sans masquer flaky ni retirer assertions ; 220 Vitest, lint/types locaux réussis, E2E réel non exécuté. Phase 1 incomplète, Windows en pause.

- **L10 accès des comptes à rôle global (local, CI en attente)** : attribution/révocation d’accès par boutique sans modification des rôles, audit atomique, RLS et CSRF ; 220 tests, lint/types/build locaux réussis ; navigateur non exécuté localement. Base `611cecb` publiée et validée sur run `43508600243`, quatre jobs verts observés sur graphe GitHub public, artifact non restauré. Phase 1 incomplète ; Windows en pause.

- **Validation accès boutiques indépendants** : `2572013` publié sur `main`, run `43487610108` completed success, quatre jobs verts vérifiés via l'API GitHub le 2026-11-13 ; artifact `code-valide-2572013…` présent (30 jours), non restauré. ZIP Drive MD5 concordant. Prochain lot : rôles globaux. Pas de production ni données réelles ; Windows en pause.

- **Correctif E2E (local, CI en attente)** : run `43506484096` de `6a3ab80` qualité/PG16 verts, navigateur rouge (compte migrations figé à 10 ; flaky notifications). Compte dynamique strict et attente navigation filtre ajoutés ; cause exacte du flaky non prouvée.

- **Correctif CI restauration (local, CI en attente)** : `3e41b85` publié, run `43490763384` échec à la restauration ; hypothèse nombre de migrations figé à 10, adapté au nombre de fichiers up ; logs détaillés inaccessibles, diagnostic à confirmer.

- **L10 rôles globaux (local, CI en attente)** : attribution/retrait non-owner par le Propriétaire, audit atomique et migration 0011 ; 209 tests, lint/types/build locaux réussis. Base `2572013` validée par quatre jobs ; navigateur/PG16 du nouveau SHA en attente.
- **L10 accès boutiques indépendants (local, CI en attente)** : fiche utilisateur — provenance réelle de chaque ligne `user_shop_access` (rôle boutique, rôle global, indépendant) et révocation des seules lignes indépendantes : DELETE Origin/CSRF, transaction scopée RLS, audit avant/après atomique, 409 si l'accès provient d'un rôle, idempotence sans faux audit. Aucune migration/policy changée. Types/lint OK, suite complète Vitest 204/204 sérielle dont 5 nouveaux, découverte 10 E2E ; build/E2E du futur SHA attendus en CI. Base `0c07ff0e` validée.
- **Validation attribution rôle boutique** : `0c07ff0e` publié sur `main`, run `43477886804` completed success, quatre jobs verts vérifiés via l'API GitHub le 2026-11-13 ; artifact archive non restauré. `fb082dd` (notes de pause) inclus dans l'ascendance publiée. Pas de production ni données réelles ; Windows en pause.
- **Correctif E2E cartes boutiques (local, CI en attente)** : run `43272897889` de `4be5473` rouge (qualité/PG16 verts, navigateur bureau/mobile rouge, archive skipped). Test attendait HTTP 404 pour `notFound()` Next streamé ayant transport 200 ; vérifier fallback 404 visible, absence tableau et retour catalogue, sans retirer test ni toucher code produit.
- **L10 rôle boutique (local, CI en attente)** : propriétaire attribue/retire rôle non-owner par boutique avec RLS, accès à l’attribution et audit atomique ; autres rôles/accès résiduels préservés. Types/lint/8 unitaires OK, intégration/E2E du futur SHA en attente. Base GitHub `d5bed04` run `43319039406` quatre jobs verts ; commit pause `fb082dd` local dans ascendance.
- **Validation export boutiques CSV** : `d5bed04` publié, run `43319039406` completed success quatre jobs verts ; archive CI non restaurée. Pause nocturne demandée ; maquette autonome fictive `/home/user/maquette-interactive-l10.html` créée, HTML hors dépôt, JS vérifié ; aucun nouveau code produit ni production.
- **Validation statut utilisateurs** : `1dd5c4f` publié, run `43316483281` completed success quatre jobs verts ; archive CI non restaurée, pas de production.
- **L10 export boutiques CSV (local, CI en attente)** : RLS + droit `reports:export` par boutique, filtres/tri/toutes pages bornées, neutralisation formules et agrégats « — ». Types/lint/7 unitaires OK ; intégration/E2E du futur SHA attendus.
- **Validation compteurs Système** : `6ef965c` publié, run `43314247752` completed success quatre jobs verts ; ancien run `43293637526` de `62fe694` reste rouge. Archive CI non restaurée, pas de production.
- **L10 statut utilisateurs (local, CI en attente)** : suspension/réactivation hors owner/soi/invitation, droits globaux `users:write`, Origin/CSRF, sessions révoquées et audit transactionnel ; types/lint/7 unités OK, intégration et E2E du futur SHA attendus.
- **Correctif E2E Système (local, CI en attente)** : run `43293637526` sur `62fe694` rouge uniquement navigateur bureau/mobile : h1 « Système » et nouveau h2 rendent le sélecteur ambigu. Ciblage exact h1 ; aucune permission/migration/code produit changé. Dernier SHA validé `cc0335d` ; correction non publiée.
- **Validation CI des paramètres + export rôles** : GitHub `cc0335d`, run `43290713784` completed success, quatre jobs verts ; archive CI non restaurée, pas de production.
- **L10 Système (local, CI en attente)** : compteurs globaux enregistrés/non acquittés de `system_events` sans contenu événement ni fuite boutique ; zéro distinct de preuve de santé, tâches/erreurs toujours indisponibles. Types/lint/6 tests unitaires OK, intégration/E2E/CI futurs non exécutés.
- **L10 export rôles CSV (local, CI en attente)** : matrice réelle avec droit global `reports:export`, en-tête périmètre/date UTC, neutralisation des formules et 6 tests unitaires ciblés OK ; E2E/intégration ajoutés, pas exécutés localement. Base paramètres `68bac8b` non publiée/validée CI.
- **L10 paramètres d’organisation (local, CI en attente)** : fuseau de référence explicite, droits globaux lecture/gestion, Origin/CSRF, écriture et audit atomiques ; devise/SMTP non configurés, aucune application implicite aux dates. Types/lint ciblé/nav OK ; intégration PGlite ajoutée mais worker local tué, build/E2E/CI à valider sur futur SHA.
- **Validation CI cartes boutiques** : `e6f087d` publié sur `main` ; run `43274481957` completed success avec quatre jobs verts, dont navigateur bureau/mobile et archive. Ancien run `43272897889` de `4be5473` demeure failure. Archive CI non restaurée ; L10/Phase 1 restent incomplets, Windows en pause.
- **L10 vue cartes boutiques (local, CI en attente)** : tableau préservé, cartes repliables, métadonnées réelles autorisées, ventes/commandes « — », mode et filtres/pagination conservés. Base publiée `d5e8215` validée run `43122127408` ; commit docs local `cc7e49f` non publié.
- **Continuité fin de session (documentation uniquement, publication/CI du futur commit à distinguer)** : correctif tri boutiques `d5e8215` publié et validé sur run `43122127408` quatre jobs verts. Maquette interactive autonome créée hors code ; vrai code lancé ponctuellement sur base PostgreSQL 17 fictive, aperçu arrêté et base/session jetables supprimées. Windows reste en pause ; L10/P1 inachevés.
- **Correctif tri boutiques (local, CI en attente)** : run `43120844550` du SHA `3fd31f8` rouge sur E2E bureau/mobile (état vide GET rejeté, tableau absent), qualité/PG16 verts, archive skipped ; `status=''` devient absence de filtre, statuts inconnus toujours refusés, tests renforcés.
- **L10 tri boutiques (local, CI en attente)** : page/API boutique autorisée, tri SQL whitelist nom A–Z/Z–A ou récent, filtres/pagination et RLS conservés. Base export utilisateurs `d721595` validée run `43119275267` (quatre jobs verts), P1 toujours inachevée.
- **L10 export utilisateurs (local, CI en attente)** : CSV de la liste filtrée de l’organisation, autorisations globales combinées, 10 000 lignes max, neutralisation des formules et projection sans secret. Base Système `6013a16` validée run `43117594559` (quatre jobs verts) ; Phase 1 non terminée, Windows en pause.
- **L10 Système (local, CI en attente)** : écran et API propriétaire alignés sur version du code, environnement déclaré, migrations et durée mesurée de requête ; file toujours indisponible, pas de secret. Base filtre journal `075be6e`, run `43115169737` quatre jobs success ; Phase 1 non terminée, Windows en pause.
- **Filtre résultat journal (local, CI non validée)** : Tous/Succès/Échec sur page/API/CSV boutique, contrôle Zod/SQL/RLS existants, tests PGlite/E2E fictifs ; base Apparence `410d408` validée run `43112722746` quatre jobs verts. Windows toujours en pause.
- **Correctif tests navigation Apparence (local)** : run `43111774881` rouge qualité (45 feuilles attendues au lieu de 46 ; route nouvelle absente de la liste de tests), PG16 vert, navigateur/archive skipped ; attentes corrigées sans affaiblir tests.
- **Préférence d’apparence personnelle (locale, non validée CI)** : page privée Système/Clair/Sombre, lien navigation, synchronisation avec bouton barre et persistance navigateur ; aucun changement métier/DB. Base `75ee3b2` validée run `43110029953` quatre jobs verts. Installation Windows en pause à la demande du propriétaire.
- **Actions rapides P1 (local)** : menu vers pages réellement prêtes selon droits, journal boutique sélectionnée vérifié serveur, invitation désactivée ; aucun code métier/Jumia ajouté. Run précédent `43082146651` de `0f04914` quatre jobs verts (périodes rapides), nouveau lot non validé. Installation Windows en pause sur demande du propriétaire.
- **Diagnostic E2E notifications (local)** : run `43079138718` rouge 1 flaky bureau malgré périodes OK au retry ; après lien rafraîchir, attendre navigation document exacte et statut 200 pour distinguer navigation manquante/retardée. Cause précise non établie, application inchangée.
- **Correctif synchronisation E2E périodes (local)** : après clic 7/30 jours, attendre `from`/`to` de l'URL destination ; run `43077689648` de `f05f8b7` rouge 1 flaky bureau, qualité/PG16 verts ; code métier inchangé.
- **Périodes rapides journal (local, non validé CI)** : raccourcis 7/30 jours UTC, autres filtres et boutique préservés ; tests unité/E2E ajoutés. Le précédent lot audit est validé sur `ae540ec`, run `43073364514` (4 jobs) ; sources copiées sur Drive privé, MD5 conforme ; restauration depuis Drive et artifact GitHub non vérifiés.
- **Correction test E2E recherche audit** (locale, futur SHA) : fixture module `ci`, pas `shops` ; assertions API/palette/page alignées, aucun code métier modifié. Run diagnostic `43071602554` rouge uniquement navigateur, qualité/PG16 verts, archive skipped.
- **Diagnostic palette audit** (local, futur SHA) : E2E contrôle le fetch réel du navigateur et texte UI ; `213dca6` a échoué en navigateur (2 scénarios), qualité/PG16 verts, archive skipped. Aucune fonction supprimée.
- **Phase 1 — recherche audit boutique sélectionnée** (lot local, futur SHA) : catégorie limitée au shop autorisé sous RLS/droit audit:read, API/page/palette ; 49 ciblés/lint/types verts, build/E2E du futur SHA en attente.
- `9055afb` publié et validé en CI `43067657827` : quatre jobs verts et artifact code présent, non restauré depuis GitHub.
- **Phase 1 — déconnecter tous les autres appareils** (lot local, SHA à relever) : service transactionnel/audit, route Origin+CSRF, UI confirmée et 43 tests ciblés/lint/types verts ; build/E2E/CI du futur SHA en attente. Aucun SQL.
- `a78a901` : CI `43065395902` quatre jobs verts, artifact code présent mais non restauré depuis GitHub.
- **Correctif filtres notifications** (local, futur SHA) : filtres via navigation document native, E2E `href` + attente 15 s ; `e4c4678` avait qualité/PG16 verts et 1 flaky E2E notifications, archive skipped ; validation du futur SHA en attente.
- **Correction E2E sessions** (local, SHA futur) : remplacer assertion globale 0 boutons par assertion sur session courante ; attente URL/fiche utilisateur 15 s après flaky. Run précédent `43053514712` : 2e tentative E2E failure (2 failed, 1 flaky, 7 passed), qualité et PG16 verts, archive skipped.
- **Phase 1 — révocation ciblée des autres sessions** (lot local ; CI du nouveau SHA en attente) : route Origin/CSRF, propriétaire + appareil courant protégés, audit atomique, UI confirmée ; 38 tests ciblés/lint/types OK. Aucun schéma modifié.
- `cbbe950` publié et validé par le run `43026793436` : 4 jobs verts, artifact code présent mais non restauré depuis GitHub.
- **Phase 1 — Ctrl/Cmd+K enrichi** (présent lot, SHA à relever) : API recherche protégée, palette boutiques + comptes selon permission globale ; 35 tests ciblés/lint/types OK ; build/suite complète/E2E du nouveau SHA à vérifier en CI. Aucun schéma, Jumia ni MIMI.
- **Validation `a64593b`** : run `43024089653` quatre jobs verts, artifact code présent, non téléchargé/restauré depuis GitHub.
- **Phase 1 — recherche limitée boutiques/comptes** (`a64593b`, validé CI `43024089653`) : service composé de deux contrôles d’accès existants, page, menu et tests ciblés 9/9 ; lint/types OK. Suite complète locale NON VERTE par OOM (153/163, 18/20), build/E2E locaux non exécutés ; CI du SHA `a64593b` depuis réussie (4 jobs). Aucun schéma/Jumia/IA.
- **Validation `061a368`** : run `43021881652` terminé success, quatre jobs verts, artifact code présent ; téléchargement/restauration de cet artifact non effectués.
- **Phase 1 — filtre rôle utilisateurs** (`061a368`, validé CI `43021881652`) : combiné à statut/recherche, pagination et droits globaux conservés ; check/lint/types/162 Vitest réussis localement ; build local non validé (dépendances/sandbox), CI et E2E depuis réussis sur `061a368`.
- **Validation `d1d4088`** : run `43018013858` quatre jobs verts, artifact code présent ; archive GitHub non encore restaurée depuis le téléchargement.
- **Phase 1 — correctif upload artifact** (SHA à relever) : échec CI `43016471668` isolé au dossier caché, archive créée et vérifiée mais non envoyée ; préparation dans dossier visible ; simulation locale en clone propre/empreintes/restauration OK, lint/types/161 Vitest OK ; nouveau run et téléchargement de l'artifact encore en attente. Aucun code métier ni migration modifiés.
- **Phase 1 — filtre de statut utilisateurs** (présent lot, SHA à relever) : recherche combinée à statut, API et page, pagination conservée, tests PGlite et E2E ajoutés ; check/lint/types/161 Vitest/build locaux OK, E2E du nouveau SHA et CI distants en attente. Aucun schéma changé.
# Journal des jalons

- **Journal global propriétaire (local, CI en attente)** : lecture limitée et filtrée, migration 0016 resserrant RLS boutique, aucune colonne before/after, 371 tests locaux, PostgreSQL 17 réel et 4 E2E fictifs. La CI `44046217087` valide uniquement la base `33ff179`. Voir `docs/comptes-rendus/phase1-journal-global-proprietaire.md`.

- **Délégation des rôles boutique (locale, CI en attente)** : permissions bornées à celles du délégué, membres à accès actif, audit atomique, protections et tests de concurrence ; 363 Vitest et deux parcours réels PostgreSQL 17 bureau/mobile avec session fictive. CI `43974576655` valide uniquement la base `9fa2b45`. Voir `docs/comptes-rendus/phase1-delegation-roles-boutique.md`.

- **Phase 1 — archive CI du code** (présent jalon, SHA à relever dans Git) : job après qualité, migrations et E2E verts, seulement pour push `main` ; bundle Git + ZIP source + SHA256 publiés comme artifact GitHub de 30 jours demandés. Aucun changement du code métier/SQL ; YAML parsé, check, Node syntaxe, lint, types, 159 Vitest OK localement ; build/DB/E2E non relancés, publication et validation GitHub de ce nouveau job **en attente**. Docs et mémoire synchronisées.
- **Mémoire de continuité `bf706f1`** : 13 fichiers et script de contrôle/snapshot ; GitHub run `43013341355` success, 3 jobs verts.
- **v34 `0226bd0`** : notifications actualisables manuellement, accueil clarifié ; run `43009896449` success.

Après chaque fonctionnalité : noter SHA, fichiers/tests/problèmes et résultats réels, jamais seulement un résultat supposé.
