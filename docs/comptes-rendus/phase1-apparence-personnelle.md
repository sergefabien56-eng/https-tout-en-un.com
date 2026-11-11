# Phase 1 — préférences personnelles d’apparence

## Base et périmètre

Le run GitHub `43110029953` du SHA `75ee3b26c76282b41fa99d2c5b06e83560e72358` a terminé **success avec quatre jobs verts**, artifact code présent mais non téléchargé/restauré. Ce run valide les actions rapides, **pas** le nouveau lot Apparence.

Le propriétaire a demandé de continuer la programmation sans reprendre l’installation Windows 10/WSL, qui reste en pause à sa demande. Nouveau lot : page privée `/espace/apparence`, lien « Apparence » dans la navigation personnelle, trois choix explicites **Système / Clair / Sombre**. Le choix continue d’utiliser le stockage local du navigateur déjà utilisé par le bouton de la barre supérieure (`toutenun.theme`) ; l’écran et le bouton se synchronisent immédiatement par événement local, y compris après navigation/rechargement. « Système » retire la préférence et laisse la règle CSS `prefers-color-scheme` faire effet. Il n’y a ni API ni écriture en base ni partage du choix entre navigateurs/appareils.

Le menu « Paramètres » généraux de l’administration demeure **bientôt** : ce lot ne prétend pas livrer fuseau, devise, notifications ou paramètres de production. Aucun changement des droits, du schéma, des sessions, des données réelles ou de l’hébergement.

Tests ajoutés : interaction de l’écran et synchronisation avec le bouton de thème ; parcours E2E authentifié bureau/mobile avec choix Sombre→Clair→Système→Sombre, rechargement, accessibilité, et refus de la page sans session. Typage/lint, 34/34 tests ciblés et découverte de 10 E2E réussis localement ; vrais E2E non exécutés localement. La vraie CI navigateur du **nouveau SHA** reste nécessaire avant validation. Snapshot de code avant lot exporté et SHA vérifié hors dépôt. Aucun backup PostgreSQL réel ni production vérifiés.
