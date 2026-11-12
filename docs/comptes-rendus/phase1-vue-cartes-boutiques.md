# Phase 1 L10 — vue en cartes des boutiques autorisées

## Périmètre

La page réelle `/espace/boutiques` conserve **son tableau opérationnel par défaut** et permet de passer aux **cartes repliables** (`<details>/<summary>` accessibles au clavier) via des liens de navigation. Le mode choisi est un paramètre GET `view=table|cards`, refusé en 404 s'il est inconnu ; recherche, état, tri et page restent dans les liens, le formulaire et la pagination. Chaque carte réutilise exclusivement les lignes autorisées renvoyées par `listOwnShops` (même RLS/permissions, même pagination serveur 50 entrées). À l'ouverture : pays, devise, état, ventes/commandes « — · Indisponibles : aucune donnée Jumia », vraie commande de sélection de boutique et lien vers son journal autorisé. Le `summary` n'imbrique pas de bouton ou lien ; les actions sont dans le panneau ouvert.

Aucune métrique Jumia simulée, aucun changement de schéma, permission ou API. Les données fictives ne sont utilisées que pour les tests. La vue tableau et ses liens restent présents, sans suppression de fonctionnalité.

## Contrôles et limites

Typage, ESLint, 27/27 tests unitaires ciblés, découverte des 10 E2E et mémoire/diff : OK localement. E2E ajouté au scénario propriétaire bureau/mobile : commutation tableau/cartes, dépliage, indication d'absence de données métier, maintien du tri après formulaire, retour tableau, 404 paramètre invalide, et contrôle accessibilité. Ces vrais E2E **non exécutés localement** faute de base/test complet dans le sandbox ; CI du futur SHA indispensable. Ce lot ne termine pas L10 ni la Phase 1 (invitations/SMTP et paramètres généraux, autres exports et critères restent à faire).

Base publiée validée au début : code `d5e8215` (run `43122127408`, quatre jobs success). Le commit local documentaire `cc7e49f` est descendant de cette base mais non publié ; le nouveau code doit être validé **sur son propre SHA**, pas sur le run ancien.
