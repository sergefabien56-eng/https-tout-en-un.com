# Phase 1 — actions rapides de l’espace privé

## État précédent et décision

GitHub `main` `0f0491467d07973daad85c4fdc72400dcffe8418`, run `43082146651` : **quatre jobs verts** pour le lot périodes rapides du journal, artifact GitHub présent mais non restauré. Le propriétaire a décidé d'interrompre l'installation locale sur Windows 10 après l'erreur WSL `0x80070641` et l'absence du service `msiserver` : **aucune application installée, aucune vraie donnée saisie ni sauvegarde de données testée**. Il a demandé de reprendre la programmation Phase 1. L'aperçu Arena et la copie Drive des sources ne sont pas un hébergement de production.

## Périmètre du lot

Ajout d’un menu « Actions rapides » dans la barre supérieure (bureau/mobile) : sessions, recherche, boutiques, journal de la boutique sélectionnée, utilisateurs, notifications, invitation à venir. Les six liens ne sont affichés que si les permissions pertinentes existent ; l'accès aux utilisateurs exige le droit **global** et le journal exige la vérification serveur du droit `audit:read` **sur la boutique effectivement sélectionnée**. Sans accès audit à cette boutique, une indication non cliquable invite à la sélectionner. L’invitation, non développée et dépendante d’un flux sécurisé/SMTP, est explicitement désactivée, sans faux formulaire ni lien mort. Lien vers sessions disponible pour tout compte connecté. Fermeture via Échap, clic extérieur, perte du focus ou sélection d’un lien ; focus dirigé vers la première action et rendu adapté à 375 px.

Pas de mutation, de changement de schéma, d'ouverture réseau, de données Jumia, de levée de permission ou de suppression de navigation existante. Les routes et API restent protégées côté serveur. Le menu n'est qu'un raccourci, pas une nouvelle autorisation.

Tests unitaires UI : propriétaire avec boutique et droits globaux, compte restreint sans boutique/audit autorisé, accessibilité des actions non cliquables et fermeture clavier. E2E ajouté dans les parcours authentifiés bureau/mobile, à vérifier **sur le SHA de ce lot** en CI. Snapshot avant lot exporté et SHA vérifié. Typage/lint, 24/24 tests ciblés, découverte 10 E2E et mémoire/diff OK localement ; vrais E2E non exécutés localement. Commit/snapshot après/publication restent à constater ; ne pas attribuer le run vert de la base à ce changement.
