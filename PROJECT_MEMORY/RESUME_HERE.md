# REPRENDRE ICI — Phase 1, recherche rapide sous permissions

**Base GitHub publiée vérifiée** : `main = a64593b08e1dbd0adf22c5381565fe0916a5ce73`. Run `43024089653` **completed success**, quatre jobs verts : qualité/build, migrations PostgreSQL 16, Playwright bureau/mobile, archive du code. Artifact `code-valide-a64593b08e1dbd0adf22c5381565fe0916a5ce73` présent, **pas téléchargé/restauré depuis GitHub**. Le présent lot « recherche rapide Ctrl/Cmd+K enrichie » est un commit **local descendant non publié**, dont build/E2E/CI du nouveau SHA restent à vérifier. Constater la réalité par `git rev-parse HEAD`, `git ls-remote origin refs/heads/main` et les jobs Actions, sans réutiliser la CI du commit précédent.

## Modifications exactes du présent lot
- `src/app/api/search/route.ts` : GET protégé par session, même service `searchAuthorizedDirectory(token,q)` que la page de recherche, réponses `private, no-store`, refus 401/400, pas d'identité confiée par le navigateur.
- `src/ui/directory-quick-search.tsx` (remplace `src/ui/shop-quick-search.tsx`) : conserve l'ouverture `Ctrl/Cmd+K`, le résultat boutique RLS, la fermeture Échap et le retour de focus ; ajoute les comptes visibles selon la permission **globale** `users:read`, cinq résultats maximum par catégorie et lien vers `/espace/recherche` ; pas de commandes/Jumia/MIMI. `src/ui/app-shell.tsx` rend la loupe aux lecteurs de boutiques ou de comptes globaux, jamais à partir de droits client non vérifiés.
- `tests/unit/app-shell.test.ts`, `tests/unit/auth-routes.test.ts` : résultats boutique/compte, focus, visibilité et 401/400 ; `tests/e2e/authenticated-admin.spec.ts` : appel API réel et palette navigateur ajoutés, **non exécutés localement** pour ce nouveau lot.
- `docs/guide-utilisateur.md`, `docs/comptes-rendus/phase1-recherche-rapide-permissions.md`, `PROJECT_MEMORY/` mis à jour. Schéma `drizzle/0001_*` à `0010_*` et autres fonctions métier inchangés.

## Tests réellement faits et précautions
Tests ciblés `app-shell`, `auth-routes`, `shop-catalog` **35/35**, contrôle mémoire, lint et typecheck réussis. Build local et suite complète Vitest du **nouveau lot non validés** (dans ce sandbox, une installation propre `npm ci` a été tuée par manque de mémoire et la compilation via symlink Next avait échoué sur la résolution interne ; le lot précédent avait 2 workers auth tués OOM, pas une preuve de bug du nouveau code). La CI du nouveau SHA doit confirmer **suite complète, build, E2E et quatre jobs** avant validation. Aucun secret ajouté au dépôt.

## Limites structurelles
La recherche reste limitée aux boutiques autorisées et aux utilisateurs dotés d'un droit global, pas une recherche de commandes/produits/finances. La palette ne confère aucun droit supplémentaire ; les contrôles sont serveur/RLS. MIMI/LLM n'est pas développée et doit rester hors Phase 1. Pas d'hébergement de production vérifié ni de sauvegarde chiffrée indépendante des données PostgreSQL réelles ; `scripts/test-backup-restore.mjs` ne teste qu'une base CI fictive. Artifacts de code GitHub temporaires (30 jours demandés), pas une copie hors hébergeur. Ancien `/home/user` : HEAD `aaa7740…`, historique divergent et travaux non suivis ; **ne pas reset/clean/force-push**. Les deux aperçus Arena ne sont pas une production.

## Prochaine tâche exacte
1. Commit descendant de `a64593b`, snapshot après commit, remettre archive GitHub Desktop. Après push normal (sans force), vérifier le nouveau `main`, quatre jobs verts et test navigateur de la palette ; si échec, corriger, ne pas déclarer validé.
2. Télécharger l'artifact GitHub, vérifier SHA256 et bundle, restaurer dans un clone isolé et comparer HEAD ; conserver une copie hors GitHub. Définir plus tard, avec les informations non secrètes du propriétaire, la sauvegarde chiffrée hors serveur de la base et sa restauration avant toute donnée réelle.
3. Choisir un nouveau petit lot Phase 1 en comparant code/plan ; ne pas présenter la recherche comme universelle ni MIMI comme prête.

**Prompt de reprise** : « Lis `PROJECT_MEMORY/RESUME_HERE.md` puis `AI_HANDOVER.md`, confronte code/Git/CI/docs, protège le travail local, reprends `NEXT_ACTIONS.md` sans recommencer. »
