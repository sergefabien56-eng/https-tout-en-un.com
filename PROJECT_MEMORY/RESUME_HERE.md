# Reprendre ici — Phase 1 L10, rôles globaux

## GitHub vérifié

GitHub `main=2572013d1cd622c542e1bf0ad3fbddf04249916a` (« administrer accès boutiques indépendants »), [run `43487610108`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43487610108) **completed success**, quatre jobs verts vérifiés via l'API GitHub le 2026-11-13 (qualité, migrations PG16, navigateur bureau/mobile, archive 30 jours). Artifact `code-valide-2572013…` présent (1 350 021 octets, expiration 2026-12-13), **non restauré**. Preuves hors dépôt : `/home/user/continuity-backups/verification-publication-2572013.md` et `verification-publication-0c07ff0e.md`.

## Lot publié et validé

Accès boutiques explicites : provenance réelle de chaque ligne `user_shop_access` (rôle boutique, rôle global, indépendant) sur la fiche utilisateur et révocation des seules lignes indépendantes (DELETE Origin/CSRF, transaction scopée RLS, audit atomique, 409 si l'accès provient d'un rôle, idempotence). Les E2E ajoutés ont été exécutés pour la première fois par le job navigateur du run `43487610108`. Voir `docs/comptes-rendus/phase1-acces-independants-boutiques.md`.

## Suite documentée (rien d'engagé si ce fichier est lu sur un arbre propre à `2572013` + commit documentaire)

Prochain lot selon `NEXT_ACTIONS.md` : **rôles globaux** — attribution/retrait par le Propriétaire d'un rôle global non-owner (Gestionnaire, Responsable des stocks, Comptable, Assistant) sur la fiche utilisateur, audit atomique à `shop_id NULL`, puis gestion des accès des comptes à rôle global (aujourd'hui 409 « non géré sur cet écran »). Ensuite : invitations SMTP (bloquées par prérequis serveur SMTP), paramètres/devise/notifications, santé réelle, Excel/PDF et validation.

## Cadre

Maquette `/home/user/maquette-interactive-l10.html` fictive distincte. Propriétaire veut finir les vrais critères L10 sans menu de micro-améliorations, puis souhaite MIMI ; préciser si L11/L12 passent avant ou après MIMI. Phase 1 reste incomplète sans HTTPS/restauration chiffrée réelle/sécurité/démo. Cycle convenu : code → archive Drive → il publie → quatre jobs CI → lot suivant. Windows/WSL/Docker en pause ; aucune production, donnée réelle, sauvegarde PostgreSQL réelle restaurée ni installation PC. Ne jamais publier de secret, `.env`, dump ni jeton.

**Reprise** : « Lis `RESUME_HERE.md`, `AI_HANDOVER.md`, `NEXT_ACTIONS.md` ; compare Git/code/CI/docs. `2572013` quatre jobs verts (run `43487610108`) ; prochain lot rôles globaux, CI de son propre SHA obligatoire après publication. »
