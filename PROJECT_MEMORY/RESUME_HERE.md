# Reprendre ici — Phase 1 L10, accès boutiques indépendants

## GitHub vérifié

GitHub `main=0c07ff0e9afb50f52331ad345a2e122ae843826a` (« attribuer rôles limités aux boutiques »), [run `43477886804`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43477886804) **completed success**, quatre jobs verts vérifiés via l'API GitHub le 2026-11-13 (qualité, migrations PG16, navigateur bureau/mobile, archive 30 jours). Le lot attribution/retrait de rôle boutique est donc publié et validé ; archive CI non restaurée. Preuve hors dépôt : `/home/user/continuity-backups/verification-publication-0c07ff0e.md`.

## Nouveau lot local (publication et CI en attente)

Accès boutiques explicites sur la fiche utilisateur : le Propriétaire global voit chaque ligne `user_shop_access` avec sa provenance réelle (rôle boutique, rôle global, ou indépendant) et peut révoquer les lignes **indépendantes** résiduelles ; suppression + audit avant/après atomiques dans la transaction scopée RLS, route DELETE exigeant Origin et double-submit CSRF, 409 si l'accès provient d'un rôle, idempotence sans faux audit, protections soi/Propriétaire/invitation/boutique non autorisée conservées. Rôles globaux modifiables, accès des comptes à rôle global, invitations SMTP, paramètres/devise/notifications, santé réelle, Excel/PDF et validation restent non livrés. Voir `docs/comptes-rendus/phase1-acces-independants-boutiques.md`. Snapshots avant/après dans `.project-backups/` et copies `/home/user/continuity-backups/`, empreintes vérifiées. Local : types/lint OK, **suite complète Vitest 204/204 sérielle** dont 5 nouveaux tests (2 unitaires, 3 intégrations PGlite RLS), découverte 10 E2E ; build local et parcours navigateur du futur SHA à valider par la CI. Suite : publication par le propriétaire (push sans force), puis vérifier **quatre jobs CI du nouveau SHA** avant tout autre lot.

## Cadre

Maquette `/home/user/maquette-interactive-l10.html` fictive distincte. Propriétaire veut finir les vrais critères L10 sans menu de micro-améliorations, puis souhaite MIMI ; préciser si L11/L12 passent avant ou après MIMI. Phase 1 reste incomplète sans HTTPS/restauration chiffrée réelle/sécurité/démo. Cycle convenu : code → archive Drive → il publie → quatre jobs CI → lot suivant. Windows/WSL/Docker en pause ; aucune production, donnée réelle, sauvegarde PostgreSQL réelle restaurée ni installation PC. Ne jamais publier de secret, `.env`, dump ni jeton.

**Reprise** : « Lis `RESUME_HERE.md`, `AI_HANDOVER.md`, `NEXT_ACTIONS.md` ; compare Git/code/CI/docs. `0c07ff0e` quatre jobs verts ; lot accès indépendants local non publié à livrer, puis CI de son propre SHA obligatoire avant le lot suivant. »
