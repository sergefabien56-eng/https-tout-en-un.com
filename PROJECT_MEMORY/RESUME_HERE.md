# Reprendre ici — membres de boutique

Base `df6ed79f3cca213b5a14d3b196ffb9fd22a2dcbc` publiée ; [CI 43971381747](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43971381747) : quatre jobs verts, 18 parcours navigateur, artifact non restauré.

Sous-lot local : liste paginée des comptes ayant un accès actif dans une boutique autorisée avec `roles:manage`, sans autres boutiques ou rôles globaux, en lecture seule. 357 Vitest, lint/types/build/audit high OK, 20 E2E listés mais non exécutés localement ; voir `docs/comptes-rendus/phase1-membres-boutique.md`.

La délégation d'attribution/retrait n'est pas encore active. Le propriétaire a choisi les membres déjà autorisés uniquement, jamais ajout par le délégué ni droits supérieurs aux siens ; les rôles globaux restent au propriétaire. Les accords d'annuaire complet sont individuels. ZIP Arena → publication sans force → lien CI dès « publié » → quatre jobs verts avant autre lot. Ne partager aucun secret ni trace privée. L10 et phase 1 incomplets ; Windows en pause.

Choix confirmés : XOF référence consolidée, mais taux et formules à valider ; alertes critiques au propriétaire uniquement avec détection réelle ; permissions des rôles modifiables par le propriétaire et délégation boutique sous garde-fous à implémenter ; export Système réservé au propriétaire. Domaine, VPS et SMTP non disponibles : le propriétaire prévoit de les fournir à la fin de la programmation ; déploiement, e-mail réel et restauration de production restent bloqués. Les trois compteurs globaux Système restent `null`/indisponibles à cause de la RLS, sans faux zéro.

Lire `AI_HANDOVER.md` et `NEXT_ACTIONS.md`. ZIP Arena → publication sans force → lien CI immédiatement à « publié » → vérifier les quatre jobs avant autre lot. Ne jamais partager secrets, traces ou cookies. Snapshot code ≠ sauvegarde DB. L10 et phase 1 incomplets ; Windows en pause.
