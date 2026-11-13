# Reprendre ici — Phase 1 L10, rôles globaux

## Dernière base publiée et validée

GitHub `main=2572013d1cd622c542e1bf0ad3fbddf04249916a`, run `43487610108` : quatre jobs verts (qualité, migrations PG16, navigateur, archive) ; artifact présent mais non restauré. Preuves `/home/user/continuity-backups/verification-publication-2572013.md`.

## Lot suivant préparé localement — à publier et valider

Ce commit ajoute attribution/retrait par le Propriétaire d'un rôle global non-owner, avec audit atomique et migration réversible 0011. Aucun accès boutique créé implicitement. Voir `docs/comptes-rendus/phase1-roles-globaux.md`. Local : 209 tests, lint complet, types et build réussis ; contrôles PostgreSQL 16 réels et Playwright ajoutés non exécutés localement. Ne pas confondre ces résultats avec la CI du présent commit.

Relever le SHA local et vérifier `git ls-remote` : cycle imposé ZIP GitHub Desktop sur Drive privé → publication du propriétaire sans force push → vérifier **quatre jobs CI de ce SHA** avant tout autre lot. En l'absence de publication, attendre ; si échec, diagnostiquer et corriger.

## Suite et cadre

Lire `AI_HANDOVER.md`, `PROJECT_STATUS.md`, `NEXT_ACTIONS.md` et comparer le code au plan. Prochain lot après validation : accès des comptes à rôle global (lever le 409 de manière explicite). Invitations SMTP bloquées par prérequis serveur SMTP ; paramètres/devise/notifications, santé réelle, Excel/PDF et validation restent à faire. MIMI souhaitée après L10, ordre avec L11/L12 à préciser. Phase 1 non terminée ; Windows/WSL/Docker en pause ; aucune production ou donnée réelle. Ne jamais publier secret, `.env`, dump ni jeton.
