# Statut — Phase 1

- Base `5afc9a9d7c1676021374dd23599dde0d5f8c8f39` publiée ; [run 43742241101](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43742241101) quatre jobs verts, 12 tests navigateur, artifact non restauré.
- Lot L10 local : PDF de la matrice des rôles, borné, mêmes droits que CSV/Excel. 278 Vitest/lint/types/build/audit high OK (7 modérées), PDF fictifs vérifiés ; `npm ci` local interrompu sur argon2, compilation manuelle puis tests/build réussis ; installation propre, navigateur et PG16 réels à vérifier en CI (12 E2E listés). Voir `docs/comptes-rendus/phase1-export-pdf-roles.md`.
- L10 et P1 incomplets : invitations SMTP, paramètres/devise/notifications, santé complémentaire, PDF des autres écrans, autres exports et validation ; ne pas figer la devise sans décision. Windows en pause, ZIP Arena, aucun secret ou trace en livraison.
