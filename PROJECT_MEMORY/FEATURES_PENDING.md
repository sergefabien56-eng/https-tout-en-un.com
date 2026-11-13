# Fonctionnalités non terminées

- Phase 1 : URL permanente HTTPS, staging/production distincts, SMTP, sauvegardes de production chiffrées hors serveur et restauration mesurée ; approbation avant données réelles. L’archive de code dans GitHub Actions reste à vérifier sur le nouveau run ; même verte, elle expire et ne constitue pas une copie indépendante.
- Recherche globale complète, notifications métier/temps réel, paramètres et écrans admin complets, design system exhaustif, PWA et fonctions prévues mais non couvertes par le code. Vérifier unitairement chaque écart avec le plan avant estimation.
- Intégration réelle OAuth Vendor Center, découverte/synchronisation boutiques, commandes, produits, stocks, finance, rapports, MIMI : non livrés.
- Réponses aux questions `docs/questions-ouvertes.md`, validation `docs/formules-financieres.md` et des grilles tarifaires ; sans elles aucune marge crédible.

Une entrée de menu « bientôt » ou une maquette ne vaut jamais réalisation. Priorités de court terme : `NEXT_ACTIONS.md`.

- Filtres utilisateurs validés en CI aux SHA précédents ; télécharger/restaurer l’artifact du prochain SHA et conserver une copie durable hors GitHub.

- Page de recherche limitée validée sur `a64593b` ; recherche universelle commandes/produits/finance et MIMI non livrées.

- Palette/API de recherche validées sur `cbbe950` en CI (4 jobs) ; artifact du code non restauré depuis GitHub.

- Révocation d’une autre session : code et 38 tests ciblés locaux ; CI du futur SHA en attente. Déconnexion globale en un clic, gestion des invitations et sauvegarde PostgreSQL indépendantes restent à faire.

- Déconnexion de tous les autres appareils : code local, 43 tests ciblés, **CI du futur SHA en attente**. Déploiement durable, SMTP, invitations et backup PostgreSQL indépendant restent à faire.

- Recherche audit boutique sélectionnée : code local, 49 tests ciblés, CI du futur SHA en attente. Recherche audit multi-boutiques non livrée, pas de commandes/produits/Jumia/MIMI.

- Accès boutiques indépendants : publiés et validés (`2572013`, run `43487610108` quatre jobs verts). Restent non livrés : rôles globaux modifiables, accès des comptes à rôle global (révocation aujourd'hui 409) et invitations SMTP.
