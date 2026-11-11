# Prochaines actions — erreur d'archive identifiée

1. Simulation du correctif sur clone propre **réussie** (3 fichiers, empreintes et restauration), YAML/check/lint/typage/161 Vitest OK. Commit descendant de `c882cb4`, sauvegarde après commit et fournir archive GitHub Desktop ; ne pas confondre ce test local avec un upload GitHub réussi.
2. Publier **sans force push**, vérifier SHA `main`, quatre jobs verts du nouveau run et l'artifact `code-valide-<sha>` **effectivement présent**. Télécharger et vérifier SHA256 + bundle et restaurer dans un clone isolé. La réussite locale seule ne prouve pas l'upload GitHub.
3. Télécharger et transférer une copie indépendante du code vers un lieu durable (artifacts GitHub : 30 jours demandés). Demander sans secrets la configuration du serveur PostgreSQL et du stockage séparé ; planifier puis tester la sauvegarde chiffrée des données avant production. Ne jamais utiliser le script CI de fixture sur une base réelle.
4. Reprendre le prochain petit lot Phase 1 seulement après validation du correctif ; garder `RESUME_HERE.md`, `PROJECT_STATUS.md`, `NEXT_ACTIONS.md` à jour, snapshot avant/après, tests distincts des fonctions non testées.
