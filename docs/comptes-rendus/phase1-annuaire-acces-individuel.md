# L10 — accès individuel à l'annuaire global

## Base et décision

Base `c3d8f4181430dbabace760c888c5a5f9dade78ac`, publiée et validée par le [run 43942671568](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43942671568) : quatre jobs verts, 18 parcours navigateur. Artifact visible non restauré depuis GitHub.

Le propriétaire a choisi : les délégués géreront seulement les membres déjà présents dans leurs boutiques autorisées ; il conserve l'annuaire complet et les rôles globaux ; un accès à l'annuaire complet doit être accordé explicitement à une personne, au cas par cas. Les permissions existantes par rôle sont partagées et ne suffisent donc pas pour représenter cette décision.

## Périmètre de ce sous-lot

- Une nouvelle table `user_directory_access` enregistre un accord individuel. Depuis la fiche d'un compte existant, le propriétaire global peut confirmer l'accord ou le retrait ; contrôle de session, rôle propriétaire global et `roles:manage` côté serveur ; compte propriétaire, soi-même et invitations protégés. CSRF et Origin stricts, réponse `no-store`, comparaison de la valeur attendue, verrouillage du compte, audit et mutation atomiques, sans secret. Les droits de rôle ne sont pas modifiés.
- La consultation globale des comptes exige le rôle global `users:read` **et** l'accord individuel, sauf pour le propriétaire global qui conserve son accès sans accord séparé. Les API de liste et fiche, la recherche transversale et l'interface utilisent cette règle côté serveur ; un accès boutique n'est ni ajouté ni modifié. Un accord est conservé si un compte est suspendu ; aucune session suspendue ne fonctionne, mais l'accord redevient utilisable après réactivation si les autres conditions sont réunies.
- Par prudence, la gestion **globale** des comptes (`users:write`) et l'export global d'utilisateurs CSV/Excel/PDF restent réservés au propriétaire. L'accord individuel porte sur la consultation et n'autorise pas l'export massif. Les autres droits (notamment Système) gardent leurs contrôles propres.
- **Changement de comportement important :** dès migration, les non-propriétaires qui disposaient de `users:read` global perdent l'accès à l'annuaire complet tant que le propriétaire ne leur a pas donné l'accord individuel ; l'export et la modification globale ne leur sont plus accessibles même avec un rôle auparavant autorisé. La table initiale est vide, aucun accord n'est créé automatiquement. Ce changement impacte aussi la recherche de comptes et les consommateurs API ; il doit être communiqué avant tout déploiement réel. Ce n'est pas une migration de données utilisateurs.
- La migration 0015 ajoute la table et une policy d'insertion d'audit étroite. Son rollback supprime la table **et les accords individuels qu'elle contient** : ne pas revenir en arrière sur un environnement réel sans sauvegarde indépendante vérifiée et plan de restauration. L'audit global n'est toujours pas consultable dans le journal boutique sous RLS.

## Limites et tests

La délégation des rôles boutique et la liste limitée aux membres ne sont pas encore développées. Le service existant continue d'exiger un propriétaire pour attribuer les rôles boutique ; aucune nouvelle capacité n'est affichée comme disponible. La fiche utilisateur n'expose plus les contrôles réservés au propriétaire à un non-propriétaire disposant de `roles:manage` global.

Local : 353 Vitest (dont rôle applicatif non-BYPASSRLS sur PGlite), lint, types, build et audit high réussis ; 7 vulnérabilités modérées de développement, aucune en production. Les tests couvrent accord individuel, autre compte non affecté, refus sans droit de rôle global, refus de gestion/export, protection propriétaire, conflit, annulation si audit échoue, restrictions RLS, CSRF et UI simulée. 18 E2E listés ; le nouveau test navigateur vérifie notamment la protection du compte propriétaire et le refus sans CSRF, pas une mutation réelle d'accord. Navigateur et PostgreSQL 16 réels de ce nouveau SHA non exécutés localement ; quatre jobs CI à vérifier après publication. Windows reste en pause ; L10 et Phase 1 incomplets.
