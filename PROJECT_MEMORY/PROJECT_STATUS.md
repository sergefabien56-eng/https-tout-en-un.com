# Phase 1 — palette enrichie en attente de CI

| Élément | Statut vérifiable |
|---|---|
| Base publiée | `a64593b08e1dbd0adf22c5381565fe0916a5ce73`, run `43024089653` : **4 jobs verts**, artifact code présent mais non restauré depuis GitHub. |
| Présent lot | Palette `Ctrl/Cmd+K` garde les boutiques autorisées et ajoute les comptes visibles **seulement** avec `users:read` global ; API `/api/search` réutilise le service serveur/RLS de la page existante. **Non encore publié/validé en CI.** |
| Tests locaux | Mémoire, lint, types, **35/35 tests ciblés** (UI, API refus, catalogue RLS) verts ; build/total Vitest/E2E du nouveau SHA non validés localement, vérifier la CI. |
| Schéma | 10 migrations inchangées ; aucun SQL ou donnée Jumia/financière nouvelle. |
| Production | Aucune sauvegarde PostgreSQL réelle chiffrée hors serveur ni déploiement de production validés. Artifact GitHub code temporaire uniquement. |

Le précédent run vert ne valide pas les modifications de la palette. La CI et l'artifact du nouveau SHA sont la prochaine preuve exigée ; voir `BUGS_AND_ISSUES.md` pour les limites mémoire locales.
