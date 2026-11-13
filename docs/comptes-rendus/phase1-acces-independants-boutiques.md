# L10 — accès boutiques indépendants : provenance et révocation explicite

## Base et périmètre

GitHub `main=0c07ff0e9afb50f52331ad345a2e122ae843826a` (« attribuer rôles limités aux boutiques ») : [run `43477886804`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43477886804) completed success, **quatre jobs verts** vérifiés via l'API GitHub (qualité, migrations PG16, navigateur bureau/mobile, archive 30 jours). Le lot précédent « attribution rôle boutique » est donc publié et validé ; les documents de mémoire qui le disaient « local non publié » sont corrigés dans ce lot.

Depuis la fiche d'un utilisateur, un **Propriétaire global** voit désormais toutes les lignes `user_shop_access` du compte avec leur **provenance réelle** : issu d'un rôle boutique, issu d'un rôle global, ou **indépendant** (aucun rôle ne porte cet accès — ligne résiduelle conservée par le retrait d'un rôle). Seules les lignes indépendantes peuvent être révoquées ici : suppression + audit avant/après **atomiques** dans la transaction scopée RLS de la boutique, route DELETE exigeant Origin et double-submit CSRF. Les accès issus d'un rôle boutique renvoient 409 « retirez d'abord ce rôle » ; ceux issus d'un rôle global renvoient 409 (la gestion des accès de rôles globaux reste non livrée). Protections conservées : propre compte, compte Propriétaire cible, invitations, boutique non autorisée/inexistante, non-Propriétaire (403), session absente (401). La révocation est idempotente : sans ligne, aucun changement ni faux audit. Le listing lit les accès sous la policy catalogue avec le contexte de la cible, puis les noms de boutiques sous le contexte Propriétaire — aucune lecture hors RLS, aucune donnée sensible projetée.

Aucune migration, aucune policy modifiée, aucun SMTP, aucun rôle touché : ce lot n'administre que les lignes d'accès indépendantes. Les rôles globaux modifiables, les invitations et la gestion des accès pour comptes à rôle global restent à livrer (voir `NEXT_ACTIONS.md`).

## Fichiers

- `src/modules/identity/shop-access.ts` (nouveau) : `classifyShopAccessOrigin`, `listUserShopAccess`, `revokeIndependentShopAccess`.
- `src/app/api/admin/users/[id]/shop-access/route.ts` (nouveau) : DELETE protégé Origin/CSRF, corps strict `{shopId}`.
- `src/ui/revoke-shop-access-button.tsx` (nouveau) : bouton confirmé, états occupé/erreur.
- `src/app/espace/utilisateurs/[id]/page.tsx` : carte « Accès boutiques » avec provenance et révocation des lignes indépendantes.
- `tests/unit/shop-access.test.ts` (nouveau), `tests/integration/shop-access.test.ts` (nouveau, PGlite + vraies policies), `tests/e2e/authenticated-admin.spec.ts` (carte absente sur compte protégé + DELETE sans CSRF → 403).

## Contrôles

Local : TypeScript OK, lint ciblé OK, **suite complète Vitest 204/204 en 30 fichiers (sérielle)**, dont 5 nouveaux tests (2 unitaires, 3 intégrations PGlite avec RLS/audit/idempotence/refus), découverte Playwright 10 E2E OK. Build local et parcours navigateur du futur SHA non garantis localement (sandbox 2 Go) : à valider par la **CI du nouveau SHA**. Snapshot avant/après via `scripts/project-memory.mjs`, empreintes vérifiées, ZIP transféré sur Google Drive privé. Pas de production, pas de données réelles, Windows en pause ; L10 et Phase 1 restent incomplets.
