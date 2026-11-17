# L10 — export du journal global du propriétaire

## Base

`84db68b5a90803e37968151a981d18942a05cfa8` est publié : [CI 44102180390](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/44102180390), quatre jobs verts (qualité, PostgreSQL 16 réel, navigateurs bureau/mobile, archive). Le lot décrit ici est **local et non couvert par cette CI**.

## Périmètre

Ajout de l'export du journal global, cohérent avec le lot précédent qui l'avait volontairement exclu :

- `GET /api/admin/audit/global/export/csv`, `/xlsx`, `/pdf` : téléchargements directs, `no-store`, `X-Content-Type-Options: nosniff`, nom de fichier fixe `journal-global-proprietaire.*`.
- Trois liens sur `/espace/journal/global`, **reprenant les filtres actifs** (q, module, acteur, dates, résultat).
- Module `src/modules/audit/export-global-audit.ts` : mêmes conditions que la lecture, dans cet ordre — session active (`withAuthorizedGlobalTransaction`) → **rôle `owner` global** → droit **global** `reports:export` → vérification `row_security_active` + policy `audit_global_owner_read` → `set_config('app.audit_global_user_id')` → requête `shop_id IS NULL` uniquement.
- Une liste vide n'est donc jamais présentée si la RLS est inactive ou la policy absente : erreur 503 « Export global indisponible ».

## Colonnes et exclusions

Métadonnées : périmètre, version, environnement déclaré, date UTC d'export, période, recherche, module, acteur, résultat, colonnes exclues, nombre d'événements.
Colonnes : identifiant, date UTC, acteur (ID), module, action, entité, résultat.
**Exclus** : `before`, `after`, `request_id`, code d'erreur et toute donnée de boutique. Valeurs de détail limitées à 254 caractères, caractères de contrôle refusés (400).

Bornes : CSV/Excel 10 000 événements (requête `LIMIT 10001`), PDF 1 000 événements / 150 pages. CSV préfixé du BOM et cellules neutralisées (une action `=cmd|calc` devient `'=cmd|calc`) ; Excel assaini pour XML 1.0 ; PDF rendu avec la police embarquée déjà utilisée par les exports boutique.

## Vérifications réelles

- `npm test` : **378 tests verts** (contre 371 avant le lot), dont 7 nouveaux dans `tests/integration/global-audit-export.test.ts` (périmètre, refus délégué/boutique/session révoquée/absence de session, filtres, neutralisation de formule, classeur et PDF valides, refus si policy absente, en-têtes et statuts des trois routes).
- `lint`, `typecheck` et `npm run build` verts ; les trois routes apparaissent dans le build.
- PostgreSQL 17 réel (binaire local) avec le **rôle applicatif non-BYPASSRLS** `toutenun_app`, propriétaire CI fictif + TOTP : `test-rls.mjs` vert, API de lecture 200, puis **téléchargements réels 200** — CSV (`text/csv`, BOM), Excel (`spreadsheetml`, signature `PK`), PDF (`application/pdf`, `%PDF`), et page `/espace/journal/global` servie avec les trois liens.
- Constat utile pour l'exploitation : avec un compte **superutilisateur** PostgreSQL, `row_security_active()` renvoie false et l'application refuse le journal global — comportement voulu (pas de faux journal), mais l'accès applicatif réel doit utiliser le rôle restreint.

## Limites

- PostgreSQL 16 et la suite navigateur complète ne sont pas rejoués ici ; ils restent à valider par la CI du prochain SHA publié.
- Aucun test navigateur dédié à ces trois liens n'est ajouté : la couverture E2E repose sur la page existante. Une vérification manuelle authentifiée a été faite localement (téléchargements réels).
- Le décompte des événements exportés reste celui du journal effectif ; il ne prouve pas l'exhaustivité des actions journalisées par le produit.
- Pas de secret, pas de donnée réelle, aucune publication effectuée. Windows reste en pause. L10 et la phase 1 restent incomplets (invitations/SMTP réels, surveillance et alertes propriétaire, règles XOF, recette, déploiement et sauvegarde PostgreSQL testée).
