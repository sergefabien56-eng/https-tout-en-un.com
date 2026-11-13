# Reprendre ici — Phase 1 L10, rôles boutique

## GitHub vérifié

GitHub `main=d5bed045fa1668d88cbf73faff37c396057d6eb3`, [run `43319039406`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43319039406) **completed success**, quatre jobs verts. Export CSV boutiques validé en CI, archive CI non restaurée. Commit documentaire de pause `fb082dd` local non publié mais descendant de `d5bed04` ; il fait partie de l'ascendance du présent lot.

## Nouveau lot local (publication et CI en attente)

Attribution/retrait par Propriétaire d'un rôle **boutique** à un compte existant, avec accès can_view sur attribution, RLS et audit atomique ; refuse rôle owner/global, auto-gestion, compte Propriétaire, invitation et boutique non autorisée. Recherche et pagination boutiques sur la fiche. Le retrait d'un rôle n'annule pas les autres rôles ni l'accès indépendant résiduel. Rôles globaux et gestion explicite des accès indépendants des rôles restent non livrés. Voir `docs/comptes-rendus/phase1-attribution-role-boutique.md`. Snapshot avant `fb082dd` vérifié hors dépôt. Types/lint ciblé, 8 tests unitaires ciblés, découverte 10 E2E, mémoire/diff OK ; intégration PGlite et E2E PG16 du futur SHA ajoutés mais non exécutés localement. Suite : commit, snapshot/ZIP après, transfert Drive privé, publication par propriétaire, vérifier **quatre jobs du nouveau SHA** avant autre lot.

## Cadre

Maquette `/home/user/maquette-interactive-l10.html` fictive distincte. Propriétaire veut finir les vrais critères L10 sans menu de micro-améliorations, puis souhaite MIMI ; préciser si L11/L12 passent avant ou après MIMI. Phase 1 reste incomplète sans HTTPS/restauration chiffrée réelle/sécurité/démo. Cycle convenu : code → archive Drive → il publie → quatre jobs CI → lot suivant. Windows/WSL/Docker en pause ; aucune production, donnée réelle, sauvegarde PostgreSQL réelle restaurée ni installation PC. Préserver ancien dépôt divergent `/home/user`.

**Reprise** : « Lis `RESUME_HERE.md`, `AI_HANDOVER.md`, `NEXT_ACTIONS.md` ; compare Git/code/CI/docs. `d5bed04` quatre jobs verts ; attribution rôle boutique locale et commit documentaire `fb082dd` descendants non publiés à livrer ensemble. CI du futur SHA obligatoire. »
