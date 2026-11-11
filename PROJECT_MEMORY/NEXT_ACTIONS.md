# Actions suivantes — Phase 1 interface et administration (L10)

1. **Tri boutiques (sous-lot local)** : relire diff/mémoire, vérifier tri SQL fixe, RLS/droits inchangés, q/état/pagination/états vides conservés ; ne pas déclarer PGlite ajouté ou E2E verts localement (sandbox OOM précédemment). Types/lint, 26 tests unitaires et découverte 10 E2E OK.
2. Commit descendant de `d721595`, snapshot après exporté/vérifié hors sandbox et archive GitHub Desktop restaurable contrôlée par SHA/`git fsck`/arbre propre. Publication propriétaire normale sans force push ; vérifier **quatre jobs CI sur le nouveau SHA**, dont PG16 et E2E bureau/mobile.
3. Poursuivre L10 réel selon plan : utilisateurs/invitations avec SMTP réel et stratégie sûre, rôles/accès, paramètres généraux à valider, toutes boutiques, autres exports et états d'interface. Ne pas annoncer L10 terminé après le tri. L11 HTTPS/sauvegarde et L12 sécurité/démo restent nécessaires avant fin P1.
4. Windows en pause explicite du propriétaire ; aucune vraie donnée avant sécurité, backup chiffré externe et restauration testée. GitHub/Drive/Arena ne sont pas production ni backup PostgreSQL.
