# Recette L10 — permissions, isolation multi-boutiques, exports hostiles, mobile 375 px

Lot de **vérification**, pas de nouvelle fonctionnalité : il ne change aucun comportement métier.
Il transforme en contrôles automatisés exécutables les promesses L10 qui n'étaient jusque-là
garanties que par relecture.

> **Statut :** L10 et la phase 1 ne sont **pas** terminées. Ce compte rendu décrit un lot de
> recette parmi les chantiers encore ouverts (voir « Reste ouvert »).

## 1. Aucune surface non déclarée — `src/core/auth/route-permissions.ts`

Source de vérité unique des **52 routes API** : pour chacune, la méthode HTTP et la permission
exigée, ou `null` quand la route est publique. S'y ajoutent `PUBLIC_PAGES` (`/`, `/connexion`).

`tests/integration/route-coverage.test.ts` (7 tests) lit le **système de fichiers**, jamais une
liste recopiée à la main :

- la liste déclarée est **égale** à la liste réelle des `route.ts` — ajouter une route sans la
  déclarer fait échouer la CI ;
- format méthode / permission valide, et ensemble exact des routes sans permission ;
- pages publiques exactes, et `/espace/**` réellement gardé par `src/app/espace/layout.tsx`
  (`redirect('/connexion')` + cookie `toutenun_session`) ;
- toute route `admin/*` délègue à un module protégé par RLS (import direct ou un seul saut) ;
- toute route d'écriture hors `auth/` contient un contrôle d'origine/CSRF.

## 2. Isolation multi-boutiques prouvée sur PostgreSQL réel — `scripts/test-isolation-postgres.ts`

Exécuté avec le **véritable rôle applicatif** `toutenun_app` (`NOBYPASSRLS`), et non en superutilisateur
— un superutilisateur désactive la RLS, ce qui avait déjà produit de faux 503 sur les exports.
**10 vérifications, 10 OK** :

| Vérification | Résultat |
|---|---|
| Propriétaire lit le journal de la boutique A | OK |
| Propriétaire lit le journal de la boutique B | OK |
| Membre autorisé ouvre la boutique A (`shops:read`) | OK |
| Membre refusé sur la boutique B **malgré un droit valide** | OK |
| Droit métier absent refusé (`assistant` / `audit:read`) | OK |
| Permission insuffisante refusée (`assistant` / `roles:manage`) | OK |
| Session révoquée refusée | OK |
| RLS : contexte A ne voit aucune ligne de B | OK |
| RLS : aucun contexte = aucune ligne | OK |
| Identifiant de boutique invalide refusé avant requête | OK |

L'isolation est donc prouvée **dans les deux sens** : les chemins autorisés fonctionnent, et la
fuite est impossible par trois barrières indépendantes (vérification de session, permission métier
avec portée boutique, RLS PostgreSQL).

## 3. Exports hostiles — `tests/integration/hostile-exports.test.ts`

**21 routes d'export réelles** (CSV, XLSX, PDF : journal global, utilisateurs, rôles, paramètres,
système, boutiques, journal de boutique) × **15 charges hostiles**, soit **315 requêtes** :

recherche de 5 000 caractères, caractère NUL, injection d'en-tête CRLF, statut/tri/rôle hors
énumération, dates impossibles (`2026-02-30`, mois 13, période inversée), injection SQL dans le
module, `actorId` négatif / non numérique / au-delà de `bigint`, `result` hors énumération, plus
des identifiants de boutique hostiles dans le chemin et des cookies forgés.

Résultat : **aucune réponse 5xx**. Les refus sont des 4xx explicites (400 / 401 / 403), sans
aucune fuite de trace interne dans le corps d'erreur. Les caractères actifs restent neutralisés
(`'` préfixé devant `=`, `+`, `-`, `@`), et le BOM UTF-8 est vérifié **sur les octets**, pas sur la
chaîne décodée.

## 4. Mobile 375 px sans débordement — `tests/e2e/mobile-overflow.spec.ts`

Sur les **13 pages** de l'espace privé, dans **deux états** (tiroir de navigation fermé puis
ouvert) : le document ne dépasse jamais la largeur du viewport (`documentElement.scrollWidth`
≤ `innerWidth`). Le tiroir ouvert est ancré à gauche et tient dans 375 px ; fermé, il est hors
écran sans élargir la page.

Un tableau large est accepté **à condition de défiler dans son conteneur dédié**
(`overflow-x: auto`) : c'est le cas de `.users-list` et `.role-matrix`, et cela ne produit aucun
défilement de page. Le contrôle est donc strict sur ce qui compte — la page — sans exiger la
compression de tableaux qui doivent rester lisibles.

## Résultats d'exécution (environnement local, PostgreSQL 17 réel)

| Contrôle | Résultat |
|---|---|
| `npm run lint` | OK |
| `npm run typecheck` | OK |
| `npx vitest run` | **390 tests / 76 fichiers**, tous verts |
| `npm run build` | compilé, 14 pages statiques |
| `scripts/test-isolation-postgres.ts` | **10/10** |
| `tests/e2e/mobile-overflow.spec.ts` | **1 passed** (mobile), 1 skipped (bureau, sans objet) |

Les 12 tests ajoutés ce lot : 7 (couverture des routes) + 5 (exports hostiles), plus le parcours
navigateur mobile et la recette d'isolation hors Vitest.

## Outillage ajouté

- `scripts/e2e-locale.sh` : rejoue localement la séquence du job CI « e2e » (base neuve, migrations,
  rôle applicatif, propriétaire CI, fixtures) puis le test navigateur. Indispensable ici : les codes
  de secours TOTP sont à usage unique, une base neuve est donc nécessaire à chaque exécution.
- `playwright.config.ts` : la commande du serveur de test peut être remplacée par `PW_START_CMD`
  (build de production au lieu du serveur de développement). Valeur par défaut inchangée : la CI
  continue d'utiliser `npm run dev`.

## Ce que ce lot ne prouve pas

- Aucun contrôle sur une base de **production** : tout a été exécuté sur des bases jetables locales.
- Pas de test de charge, ni de montée en charge concurrente.
- Le mobile est vérifié à **375 px** uniquement, pas sur la gamme complète de largeurs.
- Les limites d'export (10 000 lignes CSV/XLSX, 1 000 lignes / 150 pages PDF) sont testées
  unitairement, pas avec un volume réel de production.

## Reste ouvert (L10 / phase 1)

Invitations sécurisées et SMTP réel ; supervision, collecteur d'erreurs et alertes critiques
réservées au propriétaire ; règles XOF (taux, conversions, arrondis, commissions — **non définies,
donc non inventées**) ; recette utilisateur ; déploiement (domaine, VPS, HTTPS, préproduction) ;
sauvegarde PostgreSQL chiffrée hors site avec restauration testée. Installation Windows : en pause.
