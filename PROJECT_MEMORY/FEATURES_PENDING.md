# Fonctionnalités non terminées

- Phase 1 : URL permanente HTTPS, staging/production distincts, SMTP, sauvegardes de production chiffrées hors serveur et restauration mesurée ; approbation avant données réelles. L’archive de code dans GitHub Actions reste à vérifier sur le nouveau run ; même verte, elle expire et ne constitue pas une copie indépendante.
- Recherche globale complète, notifications métier/temps réel, paramètres et écrans admin complets, design system exhaustif, PWA et fonctions prévues mais non couvertes par le code. Vérifier unitairement chaque écart avec le plan avant estimation.
- Intégration réelle OAuth Vendor Center, découverte/synchronisation boutiques, commandes, produits, stocks, finance, rapports, MIMI : non livrés.
- Réponses aux questions `docs/questions-ouvertes.md`, validation `docs/formules-financieres.md` et des grilles tarifaires ; sans elles aucune marge crédible.

Une entrée de menu « bientôt » ou une maquette ne vaut jamais réalisation. Priorités de court terme : `NEXT_ACTIONS.md`.

- Filtres utilisateurs validés en CI aux SHA précédents ; télécharger/restaurer l’artifact du prochain SHA et conserver une copie durable hors GitHub.

- Valider sur la CI du prochain SHA la nouvelle page de recherche limitée ; recherche universelle commandes/produits/finance et MIMI ne sont pas livrées.

- Nouvelle API et palette de recherche : valider build, suite complète, E2E et artifact sur le prochain SHA ; les autres modules et MIMI restent à venir.
