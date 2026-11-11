# Prochaines actions Phase 1 — sessions groupées

1. Vérifier et publier le lot local de **déconnexion de tous les autres appareils** descendant de `a78a901` : 43 tests ciblés/lint/types/découverte Playwright verts localement ; contrôle mémoire/diff/absence de secrets ; commit, snapshot après/empreintes et archive Desktop extraite/vérifiée. Ne pas publier depuis la copie d'aperçu `/home/user/preview-phase1/` ni écraser l'ancien Git divergent.
2. Après push normal sans force, confirmer sur **nouveau SHA** les quatre jobs GitHub (qualité/build/tous tests, PG16, E2E bureau/mobile sans flaky, archive) et artifact du bon SHA. Corriger échec plutôt que désactiver E2E. L'ancien run `43065395902` valide `a78a901` uniquement.
3. Télécharger/restaurer l'artifact GitHub dans un clone isolé et conserver une copie hors GitHub. Configurer plus tard, avec l'hébergement/stockage non secrets fournis par propriétaire, backup chiffré indépendant et restauration de la **vraie base PostgreSQL** ; actuellement non vérifié.
4. Après validation, choisir prochain petit lot P1 (invitations/accès, audit ou déploiement/SMTP). MIMI/Jumia hors P1.
