# L10 — compteurs d'événements globaux sur l'écran Système

## Avant le lot

GitHub `main=cc0335dae85935fba4bb2358a26d8a79ce29f56e` : [run `43290713784`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43290713784) **completed success**, quatre jobs verts (qualité/build, migrations PostgreSQL 16, navigateur bureau/mobile 375 px, archive). Ceci valide les sous-lots Paramètres et export CSV rôles en CI ; archive CI non restaurée, aucune production/installation PC.

## Portée du nouveau sous-lot

`/api/health/deep` et l'écran propriétaire Système exposent des nombres réels, bornés à la table `system_events` et uniquement aux lignes **globales** (`shop_id IS NULL`) : total enregistré, critiques non acquittés, avertissements non acquittés. Autorisation serveur `system:manage` globale conservée ; requête explicite sans shop + RLS en défense. Aucune description/message/contexte de ces événements ne quitte le serveur, pas de fuite boutique. L'écran dit clairement que zéro entrée n'est **pas** une preuve d'absence d'erreurs et que les événements boutique ne sont pas agrégés. File de tâches, tâches en attente, collecte d'erreurs et surveillance continue restent indisponibles ; aucun faux état OK. Latence DB conserve sa définition antérieure (durée de la seule requête migrations). Aucun schéma ni migration modifié.

## Vérifications et limites

Snapshot avant `cc0335d` exporté hors dépôt sous `/home/user/continuity-backups/`, empreintes et bundle vérifiés. Local : TypeScript, ESLint ciblé, 6 tests unitaires ciblés, découverte des 10 E2E, contrôle mémoire/diff OK. Test d'intégration enrichi de lignes globales et boutique et assertions de projection et de refus ; **non exécuté localement** dans le sandbox à mémoire limitée. Parcours navigateur et build du nouveau SHA non exécutés localement ; CI à vérifier après publication. L10/P1 incomplets, Windows en pause.
