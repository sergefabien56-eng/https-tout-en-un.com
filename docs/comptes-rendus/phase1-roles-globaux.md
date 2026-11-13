# L10 — attribution et retrait des rôles globaux

## Base et périmètre

Base publiée : GitHub `main=2572013d1cd622c542e1bf0ad3fbddf04249916a`, run `43487610108` : quatre jobs verts. Ce lot est nouveau : sa propre publication et sa CI restent à vérifier.

Sur la fiche d'un compte existant, le Propriétaire global peut attribuer ou retirer un rôle global non-owner (Gestionnaire, Responsable des stocks, Comptable, Assistant). La mutation refuse les invitations, son propre compte et les comptes Propriétaire ; session valide, permission globale `roles:manage`, Origin et double-submit CSRF sont requis. L'opération est idempotente. Elle ne crée aucun accès boutique : hors Propriétaire, un rôle global ne donne accès qu'aux boutiques explicitement autorisées. Les rôles boutique et lignes d'accès sont préservés au retrait ; une ligne n'est indépendante que si aucun autre rôle global ou rôle pour cette boutique ne subsiste. L'administration des accès des comptes à rôle global reste à faire : la révocation y est encore refusée par un 409.

Mutation et audit `manage_global_role` à `shop_id NULL` sont atomiques. Migration réversible 0011 : policy INSERT limitée à cette action, ce module, ce type d'entité, `shop_id NULL` et acteur concordant avec le contexte local de transaction ; elle n'ouvre aucune lecture de journal sans boutique. Le réglage est positionné par le service après authentification et autorisation ; comme les autres réglages PostgreSQL de l'application, ce n'est pas une preuve cryptographique d'identité face à un accès SQL direct au rôle applicatif. Les permissions métier restent vérifiées côté serveur.

## Vérifications effectuées

- Suite complète locale : **209 tests Vitest en 32 fichiers**, dont PGlite avec vraies migrations et RLS, refus, idempotence, conservation, test du rollback lors d'une panne d'audit et limites de policy.
- Lint complet, TypeScript et build Next.js réussis. Audit dépendances au seuil high réussi : 7 vulnérabilités modérées signalées, non corrigées ici. Avertissements non bloquants : canvas non implémenté par jsdom et plugin Next.js absent de la configuration ESLint.
- Les 10 tests Playwright sont découverts ; **non exécutés localement**. Les nouvelles assertions sur compte protégé et absence CSRF attendent le job navigateur. Les contrôles RLS supplémentaires de `scripts/test-rls.mjs` attendent PostgreSQL 16 CI.
- Aucun SMTP, aucune donnée réelle, aucune installation Windows ni déploiement. L10 et la Phase 1 restent incomplets.

Après publication, vérifier les quatre jobs du SHA effectivement publié, puis seulement passer au lot d'accès des comptes à rôle global.
