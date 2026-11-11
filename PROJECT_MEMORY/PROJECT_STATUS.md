# Phase 1 — lot recherche limitée en attente de CI

| Élément | État vérifié |
|---|---|
| Base publiée | `061a368b08333ce8a0f0b88f5504aa26c0f19d6a` sur GitHub `main`, run `43021881652` : **4 jobs verts**, artifact code présent mais non restauré depuis GitHub. |
| Nouveau lot recherche | Page `src/app/espace/recherche/page.tsx`, service `src/modules/identity/directory-search.ts`, entrée navigation : boutiques sous RLS + comptes si droit global ; **non encore publié**, CI/E2E du nouveau SHA en attente. |
| Tests locaux ciblés | mémoire, lint, types, **9/9 tests ciblés** réussis ; build local non validé. |
| Suite locale | **NON VERTE** : 18 fichiers/20, 153 tests passés/163 ; workers auth-service/bootstrap-owner tués par OOM (confirmé dmesg), même avec `--maxWorkers=1`; bootstrap-owner isolé 3/3 ; auth-service isolé tué. Aucune conclusion sur ce lot via un test complet local. |
| Schéma / métier | 10 migrations inchangées ; aucune donnée Jumia réelle, module MIMI ni produit financier. |
| Exploitation | archive code temporaire GitHub uniquement ; aucune sauvegarde chiffrée extérieure/restauration de données commerciales ni déploiement production validés. |

**Validation attendue** : commit puis quatre jobs verts sur le **nouveau** SHA, y compris suite complète, build et E2E. Ne pas attribuer le succès de la CI précédente au présent lot.
