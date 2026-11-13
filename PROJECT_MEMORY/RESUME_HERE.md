# Reprendre ici — accès des comptes à rôle global

## Base publiée et validée

GitHub `main=611cecbe1cbc55f08b733be75bfa3405a58040a1`, [run 43508600243](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43508600243) : quatre jobs verts (qualité, PG16, navigateur, archive). Vérification sur la page publique GitHub : graphe HTML `completed successfully` pour chacun ; API anonyme limitée (403). Un artifact présent, non restauré. Preuve `/home/user/continuity-backups/verification-publication-611cecb.md`. Les runs précédents restent rouges dans l'historique.

## Lot préparé — CI propre à vérifier

Ce commit administre les accès des comptes à rôle global : le Propriétaire attribue ou retire explicitement une boutique sans modifier les rôles, audit atomique et Origin/CSRF ; un rôle boutique présent continue de protéger la ligne d'accès. Voir `docs/comptes-rendus/phase1-acces-comptes-role-global.md`. Local : 220 Vitest, lint, types et build réussis ; E2E navigateur découverts mais non exécutés ici. Publication et CI de ce commit non présumées.

Cycle : snapshot → ZIP Drive privé → publication du propriétaire sans force → fournir immédiatement le lien CI après « publié » → vérifier **quatre jobs du SHA** avant tout lot suivant. Lire `AI_HANDOVER.md`, `PROJECT_STATUS.md`, `NEXT_ACTIONS.md` et le plan. Invitations SMTP et autres critères L10 encore à faire ; Phase 1 non terminée, Windows en pause, ne publier aucun secret ou donnée réelle. MIMI après L10 souhaitée ; ordre avec L11/L12 à préciser.
