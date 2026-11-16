# L10 — permissions des rôles modifiables par le propriétaire

## Base

Le lot devise XOF et le correctif de test sont publiés à `f9f310914101cee5697c41baac59fae5a9f95297`. [CI 43937792327](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43937792327) : quatre jobs verts, dont 18 parcours navigateur. Artifact d'archive visible, non téléchargé/restauré depuis GitHub.

## Périmètre de ce sous-lot

Le propriétaire global peut confirmer l'ajout ou le retrait d'une permission pour les quatre rôles existants hors `owner`. Le rôle Propriétaire lui-même est non modifiable ; contrôle propriétaire et permission `roles:manage` côté serveur, session active, Origin et CSRF stricts. La lecture reste accessible selon `roles:manage`, y compris en cas de délégation, mais la mutation reste réservée au propriétaire. Les permissions de gestion des rôles et d'accès à Système peuvent être accordées aux autres rôles, conformément au choix du propriétaire ; l'export Système reste explicitement réservé au propriétaire. Aucun nouvel accès boutique n'est accordé automatiquement.

Une modification concerne tous les comptes possédant le rôle, qu'il soit global ou affecté à une boutique. L'autorisation effective demeure l'union de leurs rôles ; révoquer un droit dans un rôle ne l'enlève donc pas si un autre rôle le donne. Les accès boutique existants et contrôles de périmètre restent nécessaires. La page explique cet impact avant confirmation. Chaque mutation effective et son audit sont atomiques ; vérification optimiste de la valeur attendue et verrouillage du rôle pour éviter une écriture périmée. Une erreur d'audit annule la mutation. La migration réversible 0014 autorise uniquement l'insertion de cet audit global sous RLS ; elle n'autorise pas la lecture globale du journal. La consultation de ce journal global reste à concevoir.

**La délégation de l'attribution des rôles en boutique n'est pas encore active.** Le propriétaire a choisi qu'elle soit limitée aux boutiques autorisées, sans gestion des propriétaires ni attribution de droits supérieurs aux siens. Les services existants continuent de réserver l'attribution des rôles au propriétaire jusqu'à réalisation et tests spécifiques de ces protections anti-escalade. Les rôles globaux restent réservés au propriétaire. Ne pas présenter la permission `roles:manage` comme une délégation d'attribution déjà fonctionnelle.

## Vérifications et limites

Tests unitaires et d'intégration PGlite : refus non-propriétaire même avec droit délégué, protection owner, CSRF/Origin, changement et annulation, conflit, audit/rollback sous rôle non-BYPASSRLS, permission Système appliquée puis retirée à une session existante. UI : confirmation annulée, succès et conflit simulés ; parcours Playwright complété pour vérifier l'annulation sur les deux tailles, sans mutation concurrente de la base CI. Le parcours réel de mutation navigateur n'est pas encore exécuté dans cette recette. Aucun vrai compte ou donnée client utilisé.

CI du nouveau SHA à vérifier après publication : quatre jobs obligatoires, dont PostgreSQL 16 réel, navigateur et archive. Le code ne termine ni L10 ni Phase 1. Windows reste en pause. L'archive code n'est pas une sauvegarde de base.
