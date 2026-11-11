# Phase 1 — filtre résultat du journal d’audit

## Base validée, décision, périmètre

Le SHA GitHub `410d4088de2b3f69da4929e852aa4b09954b3315` a le run `43112722746` **completed success**, quatre jobs verts (qualité/build, migrations PostgreSQL 16, navigateurs bureau/mobile, archive code). Cet ancien run valide l'écran Apparence, **pas** le présent filtre. Artifact GitHub présent mais non téléchargé/restauré. Le propriétaire choisit « filtre succès/échec du journal ». Installation Windows 10/WSL/Docker reste **en pause** à sa demande ; aucune donnée réelle ni hébergement durable.

Ajouter un choix **Tous les résultats / Succès / Échec** sur `/espace/journal`, paramètre `result=success|failure` ou absent. Valeurs refusées par Zod côté serveur (HTTP 400 API/CSV, page non trouvée), requête SQL paramétrée et partagée par liste et export, sous transaction boutique autorisée, RLS et `audit:read`. CSV exige toujours `reports:export` en plus ; sa ligne de métadonnées affiche le résultat filtré. Pagination, périodes rapides, recherche et autres filtres préservent le choix et la boutique. Aucun `before`/`after` ou secret exposé ; pas de multi-boutiques, migration ni permission changée.

Tests PGlite : deux boutiques avec même action d'échec fictive, manager limité à une boutique, recherche + module + résultat combinés, valeur invalide, liste/API/CSV, absence de secret. Fixture E2E CI jetable ajoute `fixture.denied` (`result='failure'`) ; navigateur bureau/mobile vérifie liste, CSV, API, période qui garde le résultat, puis retour à « Tous ». Les données CI restent fictives. Le vrai test E2E du **nouveau SHA** sera vérifié en CI après publication ; ne pas attribuer l'ancien run vert à ce changement.

Snapshot avant lot copié et SHA vérifié sous `/home/user/continuity-backups/` ; suite locale/commit/snapshot après/CI à consigner explicitement.

## Validations locales et limites

Typage/lint, 26/26 tests unitaires ciblés (filtres résultat, navigation, routes auth), découverte des 10 E2E et contrôle mémoire/diff réussis. Les tests PGlite d'isolation ajoutés **n'ont pas pu terminer localement** : deux tentatives distinctes (fork et thread, un worker) se terminent par kill du processus Node ; `dmesg` confirme OOM dans le sandbox ~1,9 Gio. Ne pas prétendre que ces tests d'intégration ou les vrais E2E ont passé ici ; la CI PostgreSQL 16 du futur SHA doit les exécuter avant toute validation. Ce blocage local n'autorise pas à supprimer ni désactiver les tests.
