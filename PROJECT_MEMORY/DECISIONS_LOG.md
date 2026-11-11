# Décisions et traçabilité

- Phase 0 : Vendor Center API OAuth (pas Seller Center historique) ; boutique = boutique Jumia × pays ; stock distant remplace la valeur observée ; marges estimées et confirmées distinctes ; aucune facture officielle fabriquée. Références `docs/jumia-integration.md` et `docs/README.md` (**propositions de conception ; validation utilisateur à confirmer**).
- P1 : PostgreSQL, SQL versionné + RLS, rôle applicatif sans BYPASSRLS, TOTP, audit immuable ; justifications dans `docs/architecture.md`, code/SQL dans `src/` et `drizzle/`.
- v34 : actualisation manuelle des notifications, aucune prétention temps réel, voir `docs/comptes-rendus/2026-11-11-actualisation-notifications.md`.
- Jalon mémoire : 13 documents dans `PROJECT_MEMORY/` + outil non destructif `scripts/project-memory.mjs` ; travailler sur clone descendant de v34 pour préserver `/home/user` ; snapshot Git+source avant/après jalon ; ne pas confondre backup de code avec backup de base.

Pour chaque nouvelle décision : date, auteur/validation, options, raison, impact, SHA et preuve de test. Changement de technologie ou suppression de fonction : demander validation explicite.

- Jalon Phase 1 archive : job Actions après trois validations sur push `main`, avec artifact temporaire de code sans secret et sans base ; aucune prétention de backup hors GitHub ni de backup production. Déploiement réel différé sans informations opérateur.

- Lot P1 administration : ajouter un filtre de statut validé côté serveur aux comptes existants, combinable à la recherche, sans migration, sans changer l'autorisation globale ni divulguer de secrets. Le SQL est paramétré ; les E2E doivent encore confirmer le navigateur réel.

- Après échec d'`upload-artifact@v4` sur `.project-backups/*` (`43016471668`), conserver le snapshot local ignoré par Git et copier uniquement les trois archives validées dans un dossier non caché pour l'upload ; ne pas activer l'option globale d'inclusion de fichiers cachés afin de ne pas élargir le périmètre par inadvertance.

- Lot P1 filtre rôle : cinq rôles système fixés en 0003 ; `EXISTS` sur `user_roles` permet de retrouver une attribution globale ou boutique sans multiplier les utilisateurs. Le filtre ne confère aucun nouveau droit, les valeurs sont validées, la requête est paramétrée ; pas de migration.

- Lot P1 recherche : page séparée boutique + utilisateur plutôt que recherche globale trompeuse ; réutilise les services existants sous RLS et `users:read` global, limite 5 résultats par catégorie, garde Ctrl/Cmd+K limité aux boutiques. Pas de SQL non autorisé, pas de MIMI ni donnée Jumia.

- Lot palette P1 : conserver comportement boutique et clavier de `Ctrl/Cmd+K`, enrichir via le **même service serveur** que la page de recherche ; catégorie comptes exige un droit global, limite 5 ; aucune donnée Jumia ni accès SQL direct client. Rendre le déclencheur accessible aux lecteurs de boutiques ou de comptes globaux.

- Choix du propriétaire : prochain petit lot P1 = **Sécurité des sessions**. Un appareil peut révoquer une autre session du même compte, jamais lui-même via cette action ; Origin/CSRF, filtre serveur et audit dans la transaction ; pas de bouton « tout révoquer » dans ce lot.

- CI sessions : les scénarios parallèles et retries produisent légitimement plusieurs sessions. Tester l’absence de bouton **sur la session courante**, pas zéro bouton global ; garder le refus serveur 404 et `failOnFlakyTests`.
