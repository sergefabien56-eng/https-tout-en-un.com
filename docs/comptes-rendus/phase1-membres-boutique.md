# L10 — liste des membres par boutique

## Base

`df6ed79f3cca213b5a14d3b196ffb9fd22a2dcbc` est publié et validé par le [run 43971381747](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43971381747) : quatre jobs verts, 18 parcours navigateur. Artifact visible non restauré depuis GitHub. L'accord individuel sur l'annuaire global a été publié précédemment ; le propriétaire conserve l'annuaire et les rôles globaux.

## Périmètre

Nouvelle page `Membres de la boutique`, à partir d'une boutique sélectionnée ; API de lecture `GET /api/shops/:shopId/members`. Chaque requête impose session active, boutique existante et autorisée, permission `roles:manage` effective sur cette boutique, contexte RLS et filtre SQL explicite. La navigation est visible lorsqu'un rôle possède `roles:manage`, mais elle ne remplace pas les vérifications serveur. Pour utiliser le sélecteur habituel, le compte doit aussi pouvoir voir la boutique via `shops:read` et son accès.

La liste, paginée à 20, comprend seulement les comptes actifs ou suspendus ayant une ligne `user_shop_access` active pour cette boutique ; elle affiche nom, e-mail, statut et rôles de **cette** boutique. Elle ne montre ni invitations, ni accès désactivés, ni comptes d'autres boutiques, ni rôles globaux ou rôles d'autres boutiques. Un rôle global, y compris le propriétaire global, ne fait pas apparaître une personne comme membre si aucune ligne d'accès active à cette boutique n'existe ; l'accès implicite du propriétaire reste inchangé. Aucun mot de passe ou jeton n'est projeté. Les personnes ayant accès par un rôle global peuvent apparaître avec « Aucun rôle boutique », car leurs rôles globaux ne sont pas exposés dans cette vue.

Cette étape est **en lecture seule** : aucun ajout d'accès ou changement de rôle. La délégation d'attribution/retrait des rôles demeure réservée au propriétaire jusqu'à son propre sous-lot et ses contrôles anti-escalade. Le propriétaire a choisi que la future délégation ne porte que sur des comptes déjà membres des boutiques autorisées et n'octroie pas de droits supérieurs aux siens. Aucune nouvelle migration et aucun changement des droits d'annuaire global.

## Vérifications et limites

Local : 357 Vitest, lint, types, build et audit high réussis ; sept vulnérabilités modérées de développement, zéro en production. Tests PGlite avec rôle non-BYPASSRLS : séparation A/B, refus permission/session, rôles d'autres boutiques et globaux non divulgués, accès désactivés/invitations exclus, pagination et `no-store` API. 20 tests Playwright listés ; deux parcours ajoutés vérifient le refus sans session et la page/liste vide propriétaire sur données CI fictives. PostgreSQL 16 et navigateur du nouveau SHA n'ont pas été exécutés localement ; à valider avec les quatre jobs CI après publication.

L10 et Phase 1 ne sont pas terminés. Windows en pause ; archive code ≠ sauvegarde de base. Le futur test des mutations déléguées devra couvrir les permissions réellement gagnées, les rôles globaux préexistants, la concurrence, la révocation d'accès et l'audit ; une liste isolée ne prouve pas l'anti-escalade.
