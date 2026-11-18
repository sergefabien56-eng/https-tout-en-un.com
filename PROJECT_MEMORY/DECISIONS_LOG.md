## 2026-11-18 — Découpage du parcours admin : ABANDONNÉ (plafond de connexion)

Le parcours « connexion 2FA, notifications et recherche utilisateurs » durait 8 min 54 s au
navigateur en CI. Un découpage en trois tests a été tenté puis **abandonné sur décision du
propriétaire**, pour une raison mesurée et non esthétique :

- `src/core/auth/service.ts` compte **10 tentatives maximum par couple e-mail × fenêtre de
  15 minutes** (`rate_limits`, bucket `login-email`, `if (count > 10) return null`). Le plafond
  est un mécanisme de sécurité **volontaire**, pas un réglage de confort.
- Le job navigateur exécute deux projets (`bureau`, `mobile-375`). La suite actuelle fait
  **9 connexions** du compte propriétaire (4 tests × 2 projets + 1 test mobile) : sous le plafond.
- Le découpage en 6 tests porterait ce total à **13 connexions** : la 11ᵉ et les suivantes sont
  refusées, donc **la CI serait rouge par construction**. Constaté en local : `rate_limits`
  à 13, connexion refusée, message d'erreur générique (voulu : pas d'énumération).
- Un second obstacle indépendant : un code de secours est **à usage unique** et les scénarios
  `owner-codes.ts` sont épuisés (0-3 administration, 4 mobile, 5 accessibilité → 24 codes).
  Découper exigerait deux scénarios de plus et un fichier porté à 32 codes.
- **Décision** : ne pas découper. Le dépassement de délai du run 44297920494 est déjà corrigé
  autrement et validé (run 44301784481, `204fb87`, 4 jobs verts, 0 instable). La marge de 180 s
  et `waitUntil: 'domcontentloaded'` restent le correctif de référence.

Effet de bord à connaître pour tout futur lot : **toute addition de test qui se connecte en tant
que propriétaire** doit respecter à la fois (a) le plafond de 10 connexions par fenêtre de
15 minutes pour l'ensemble du job navigateur, et (b) la réservation d'un code de secours unique.
La modification du test a été annulée : l'arbre de travail est **propre** sur `12ee000`, base
publiée `204fb87`.

## 2026-11-18 — Icône de marque : deuxième piste retenue

Deux pistes graphiques ont été produites et présentées côte à côte. Le propriétaire a retenu la
seconde : carré central turquoise plein, quatre liens pleins vers quatre carrés clairs, sur fond
bleu marine. Le SVG de `src/ui/brand.tsx` reproduit ce dessin **en tracés**, sans image bitmap,
pour rester net de 20 px à 512 px. L'icône reste **provisoire** dans l'interface : seul le
propriétaire peut la déclarer définitive. Aucune marque existante n'a été copiée, aucun favicon
ni image de partage n'est généré.

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

- Après `e4c4678` : ne pas supprimer `failOnFlakyTests` pour obtenir une CI verte ; les filtres des notifications passent par navigation document normale après `router.refresh()` afin de conserver une URL/périmètre serveur cohérents. Examiner traces si échec persistant.

- Choix du propriétaire : après révocation ciblée, ajouter « Déconnecter tous les autres appareils » sans déconnecter l'appareil courant ; audit agrégé par nombre et transaction, 0 idempotent ; ne pas exécuter de mutation groupée dans des scénarios E2E parallèles partageant le compte fictif.

- Choix du propriétaire : prochain lot P1 = recherche dans journal. Aucun audit multi-boutiques : `toutenun_shop` sélectionné doit être valide et autorisé `audit:read` ; sinon catégorie vide sans révéler boutique. Réutiliser `listShopAudit` et exclure `before`/`after`.

- Accès indépendants (L10) : révoquer une ligne `user_shop_access` sans rôle la **supprime** (pas `can_view=false`) avec audit avant/après scopé ; un accès porté par un rôle boutique ou global renvoie 409 — les rôles restent l'unique voie d'administration de leurs propres accès. Listing en deux contextes RLS locaux (cible puis Propriétaire) dans la même transaction d'identité, jamais hors RLS ; aucun nom de boutique supprimée divulgué (nom `null` si `deleted_at`).
