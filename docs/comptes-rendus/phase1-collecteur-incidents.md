# Collecteur d'incidents — déblocage de l'écriture (migration 0019)

**Date** : 18 novembre 2026 · **Décision du propriétaire** : option B — règle d'écriture ciblée,
plutôt qu'un second compte base de données.

## Le problème

`recordIncident()` échouait **en silence**. La policy `system_events_isolation` (0007) exige un
contexte `app.shop_id` pour écrire ; or un incident système survient précisément quand ce
contexte n'existe pas : panne de base, export qui casse, erreur de route avant toute
identification. L'écran Système affichait donc un tableau d'incidents vide, en l'annonçant
honnêtement, sans que rien ne signale que la collecte ne fonctionnait pas.

Une idée fausse a été écartée : connecter des boutiques (Jumia) ne changerait rien. Le contexte
`app.shop_id` n'est pas « avoir des boutiques », c'est une variable posée par transaction
(`set_config('app.shop_id', …, true)`), absente au moment d'une panne. Lui donner une boutique
arbitraire aurait produit un incident **faux**.

## La règle accordée (0019)

Le rôle applicatif peut désormais **insérer** un incident, et seulement si les six conditions
suivantes sont réunies :

1. `shop_id IS NULL` — jamais un incident de boutique ;
2. `code` ∈ {`export_failure`, `database_failure`, `route_failure`, `application_failure`} ;
3. `severity` ∈ {`warning`, `critical`} ;
4. `category` ∈ {`export`, `database`, `route`, `application`} ;
5. `acknowledged_at` et `acknowledged_by` nuls — un incident ne naît jamais acquitté ;
6. aucun contexte boutique actif — sinon il relèverait de la policy 0007.

Rien d'autre n'est accordé : ni `SELECT`, ni `UPDATE`, ni `DELETE` par cette policy. La lecture
reste réservée au Propriétaire (0018), l'acquittement reste son acte (0018), et aucun rôle
applicatif ne peut supprimer un incident.

## Ce qui prouve que la porte est étroite

Sept tests d'intégration sur PostgreSQL réel (PGlite, rôle applicatif restreint, RLS active) :

- un incident global du catalogue est **accepté** ;
- un code inventé, une sévérité `info`, une catégorie libre sont **refusés** ;
- un incident rattaché à une boutique existante est **refusé**, même avec un code valide ;
- un incident créé déjà acquitté est **refusé** ;
- lecture, modification et suppression restent **sans effet** (0 ligne touchée) ;
- la liste de codes figée dans la policy est **comparée** à `INCIDENT_CODES` : une divergence
  rendrait la collecte muette pour un code ajouté côté TypeScript, sans aucun signal ;
- un incident réel est tracé de bout en bout : collecteur → base → écran Propriétaire.

## Vérifications

`tsc` 0 · `eslint` 0 · **434 tests / 80 fichiers** · `next build` 0.

## Conséquence visible

Le message de l'écran Système ne dit plus que l'écriture est réservée à un compte
d'administration — ce n'est plus vrai. Il précise désormais les quatre codes enregistrés et le
fait que l'application peut ajouter un incident, jamais le modifier ni l'effacer.
