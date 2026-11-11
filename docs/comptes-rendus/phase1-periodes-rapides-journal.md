# Phase 1 — périodes rapides du journal d’audit

## Périmètre

Les filtres module, acteur et dates UTC ainsi que liste/API/export existent déjà au SHA `ae540ecea575097cb61e4dc05386390ad9087f07`, validé par quatre jobs verts sur le run `43073364514`. Le propriétaire a choisi d'ajouter uniquement des raccourcis **7 derniers jours** et **30 derniers jours** au journal, pas de dupliquer les filtres existants.

Les raccourcis génèrent une plage de journées UTC entières, aujourd'hui inclus. Ils remplacent `from`/`to`, conservent boutique, recherche, module et acteur, et reviennent à la première page. Les dates personnalisées demeurent modifiables. La liste et le CSV continuent d'utiliser le filtre serveur existant, l'accès `audit:read`, la boutique autorisée, la RLS et la permission `reports:export` pour le CSV. Aucun changement de schéma ni de logique d'autorisation ; pas de recherche multi-boutiques, pas de secrets/before/after exposés.

Tests ajoutés : calcul UTC et franchissement de mois bissextile ; parcours E2E bureau/mobile vérifiant sélection de boutique, recherche préservée, intervalles de 7 puis 30 jours et dates 7 jours transmises à l'export. Types/lint, 15 tests ciblés et découverte de 10 E2E OK localement ; vrais E2E non exécutés localement. Le vrai E2E PostgreSQL 16 du **nouveau SHA** reste à vérifier en CI après publication. Cette fonctionnalité et l'archive du code ne constituent pas un hébergement de production ni un backup de données réelles.

## Sauvegarde et validation du lot précédent

Run `43073364514` de `ae540ec` : quatre jobs verts. Sources du même SHA déposées en archive privée Google Drive (`code-source-ae540ecea575097cb61e4dc05386390ad9087f07.zip`) avec taille/MD5 distant conformes, ZIP local restauré et comparé aux 267 fichiers suivis ; **artifact GitHub et octets Drive non téléchargés/restaurés**. Voir `/home/user/continuity-backups/verification-sauvegarde-code-ae540ec.md` (hors dépôt). Snapshot avant nouveau lot copié hors dépôt ; suite à committer et CI à vérifier.

## CI du premier SHA et correctif de synchronisation E2E

Le run `43077689648` sur `f05f8b732ad07424e1352e257afd2d4ff9ea9b07` est **completed failure** : qualité/build et migrations PG16 success ; navigateurs 9 passés/1 flaky (bureau), archive skipped, artifact `e2e-traces` seulement. Annotation du premier essai : après clic 30 jours, le test attendait un écart de 29 jours mais lisait encore **6 jours**, la période précédente. Le test utilisait `toHaveURL(/\/espace\/journal\?/)`, déjà vrai *avant le clic* : course de navigation, pas preuve que l'API calcule mal les dates. Le retry est passé. Correctif descendant local : capturer le `href` de chaque raccourci et attendre que les paramètres `from`/`to` de l'URL naviguée correspondent à cette destination, pour **7 et 30 jours**, avant assertions métier ; pas d'augmentation de délai ni suppression de contrôle. L'application reste inchangée. CI du futur SHA obligatoire.
