# Reprendre ici — matrice des permissions modifiable

Base publiée `f9f310914101cee5697c41baac59fae5a9f95297` ; [CI 43937792327](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43937792327) : quatre jobs verts, 18 parcours navigateur. Artifact visible non restauré depuis GitHub.

Sous-lot local L10 : propriétaire global seul à modifier les permissions des quatre rôles non-owner, confirmation, protections serveur, audit atomique et conflit sur valeur périmée ; permissions Système et gestion des rôles délégables, mais affectation des rôles en boutique reste pour l'instant réservée au propriétaire. Le propriétaire souhaite ensuite déléguer cette attribution dans les seules boutiques autorisées, sans propriétaire cible ni droits supérieurs au délégué. Ce comportement n'est pas encore livré. Voir `docs/comptes-rendus/phase1-matrice-roles-modifiable.md`.

ZIP Arena → publication sans force → lien CI dès « publié » → quatre jobs verts avant autre lot. Ne partager aucun secret ou trace privée. L10 et phase 1 incomplets ; Windows en pause.

Choix confirmés : XOF référence consolidée, mais taux et formules à valider ; alertes critiques au propriétaire uniquement avec détection réelle ; permissions des rôles modifiables par le propriétaire et délégation boutique sous garde-fous à implémenter ; export Système réservé au propriétaire. Domaine, VPS et SMTP non disponibles : le propriétaire prévoit de les fournir à la fin de la programmation ; déploiement, e-mail réel et restauration de production restent bloqués. Les trois compteurs globaux Système restent `null`/indisponibles à cause de la RLS, sans faux zéro.

Lire `AI_HANDOVER.md` et `NEXT_ACTIONS.md`. ZIP Arena → publication sans force → lien CI immédiatement à « publié » → vérifier les quatre jobs avant autre lot. Ne jamais partager secrets, traces ou cookies. Snapshot code ≠ sauvegarde DB. L10 et phase 1 incomplets ; Windows en pause.
