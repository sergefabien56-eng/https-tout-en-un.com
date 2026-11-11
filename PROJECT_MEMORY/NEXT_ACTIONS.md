# Prochaines actions ordonnées

1. **Publication du jalon mémoire** : vérifier `git rev-parse HEAD`, `git status --short`, `node scripts/project-memory.mjs check` ; si GitHub est encore à v34, pousser le commit descendant sans force via GitHub Desktop. Vérifier les 3 jobs et les tests sur le **nouveau** SHA ; actualiser `PROJECT_STATUS.md` et `RESUME_HERE.md` avec l'URL du run. Les ZIP et bundle sont des sauvegardes locales : les copier hors sandbox.
2. **Protéger l'exploitation** : choisir un domaine et un VPS, un SMTP, une destination externe chiffrée, clés distinctes hors Git ; établir RPO/RTO, rétention, surveillance et restauration testée sur environnement isolé. `docs/sauvegarde-restauration.md` précise pourquoi le script CI n'est pas utilisable en production.
3. **Planifier prochain petit lot P1** avec le propriétaire à partir de `docs/phase-1-plan.md`, en comparant les objectifs au code réel ; recommandation : réduire les écarts de docs obsolètes et clarifier les parties admin/notifications avant d'ajouter des fonctions. Snapshot avant changement.
4. **Avant P2/finance** : accès Jumia réel via canal sécurisé et validation des paramètres financiers ; ne pas introduire de vrais secrets dans le chat, les ZIP ni Git.

À chaque jalon : check → snapshot avant (commit propre) → changement + tests → mise à jour `PROJECT_STATUS.md`, `NEXT_ACTIONS.md`, `RESUME_HERE.md` → check → commit → snapshot après → transfert hors machine → CI distante si publiée.
