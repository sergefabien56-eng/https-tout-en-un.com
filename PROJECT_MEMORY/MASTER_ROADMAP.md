# Feuille de route maîtresse (état, non promesse)

1. **Phase 0** : conception/spec API Jumia, architecture, modèle financier proposé (`docs/`). Réalisé comme documentation ; validations produit encore ouvertes.
2. **Phase 1 / socle** : migrations/RLS, sécurité compte, navigation, boutiques, journal, notifications personnelles, tests CI : partiellement implémentés sur v34 ; recherche globale complète, paramétrage, notifications métier, rôles/UX avancés, SMTP, déploiement durable et sauvegardes de production restent à réaliser/valider. Voir `docs/phase-1-plan.md` pour les lots L1–L12, qui sont des *objectifs*, pas un tableau de livraisons.
3. **Phase 2 / Jumia** : autorisation OAuth Self Authorization, rotation atomique des jetons, découverte des boutiques, synchronisation sécurisée, tests avec accès réel ; bloqué par accès opérateur, **non implémenté**.
4. **Phases métier** : commandes, produits, stocks, retours, finance, rapports puis MIMI ; à cadrer/implémenter, règles de commission et coût à valider avant toute marge.
5. **Production** : staging isolé, HTTPS, observabilité, SMTP, backup externe chiffré, restauration testée avec RPO/RTO ; ne jamais activer avec données réelles avant validation.

Chaque jalon : snapshot propre avant changement, changement incrémental, migrations contrôlées, tests ciblés + CI, mise à jour des trois fichiers prioritaires, snapshot propre après commit, transfert hors sandbox.
