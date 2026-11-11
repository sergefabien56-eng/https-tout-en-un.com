# État Phase 1 — filtres d'administration, publication attendue

| Élément | État et preuve |
|---|---|
| v34 notifications | `0226bd0`, run `43009896449` : 3 jobs verts, 10 E2E passés |
| Mémoire publiée | `bf706f1` sur `main`, run `43013341355` : 3 jobs verts |
| Archive automatique du code | commit local `8833d4c` : nouveau job CI après 3 validations ; **non encore publié/vérifié sur GitHub**. Artifact temporaire 30 jours demandés, pas backup indépendant. |
| Filtre de statut utilisateurs | présent lot : `src/modules/identity/user-list.ts`, API et page, recherche combinée ; **check, lint, typecheck, 161 Vitest et build verts localement**. E2E ajoutés mais non encore exécutés sur ce SHA. |
| Schéma et sécurité | 10 migrations, autorisation globale `users:read` maintenue ; pas de schéma changé. Test base CI fictive, aucune sauvegarde chiffrée de données réelles. |
| Produit | application P1 partielle ; Jumia API, finance, worker, SMTP, domaine/VPS et restauration prod non validés. |

**Blocage immédiat** : publier le nouveau commit descendant et attendre quatre jobs verts sur le **nouveau** SHA, puis restaurer artifact ; ne pas réutiliser le succès de `43013341355` pour cette fonctionnalité. Le Git local historique `/home/user` diverge : travailler depuis un clone propre. Aucun identifiant réel dans Git.
