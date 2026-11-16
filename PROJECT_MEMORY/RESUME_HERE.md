# Reprendre ici — accès individuel à l’annuaire

Base `c3d8f4181430dbabace760c888c5a5f9dade78ac` publiée ; [CI 43942671568](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43942671568) : quatre jobs verts, 18 tests navigateur ; artifact non restauré.

Sous-lot local : annuaire complet disponible pour Propriétaire ou accord individuel + droit global de lecture. Gestion globale des comptes et export annuaire restent réservés au Propriétaire. Migration 0015, accords initialement absents, audit atomique et protections ; changement de comportement pour les non-propriétaires, voir `docs/comptes-rendus/phase1-annuaire-acces-individuel.md`. 353 tests, lint/types/build/audit high OK, 18 E2E listés mais pas exécutés localement ; CI du nouveau SHA en attente.

La délégation boutique n'est pas encore active. Le propriétaire a choisi membres déjà autorisés dans ses boutiques uniquement, pas d'ajout par le délégué, pas de droits supérieurs aux siens ; les rôles globaux restent au propriétaire. Voir `/home/user/continuity-backups/cadrage-delegation-roles-boutique.md` si disponible.

ZIP Arena → publication sans force → lien CI dès « publié » → quatre jobs verts avant autre lot. Ne partager aucun secret ni trace privée. L10 et phase 1 incomplets ; Windows en pause.

Choix confirmés : XOF référence consolidée, mais taux et formules à valider ; alertes critiques au propriétaire uniquement avec détection réelle ; permissions des rôles modifiables par le propriétaire et délégation boutique sous garde-fous à implémenter ; export Système réservé au propriétaire. Domaine, VPS et SMTP non disponibles : le propriétaire prévoit de les fournir à la fin de la programmation ; déploiement, e-mail réel et restauration de production restent bloqués. Les trois compteurs globaux Système restent `null`/indisponibles à cause de la RLS, sans faux zéro.

Lire `AI_HANDOVER.md` et `NEXT_ACTIONS.md`. ZIP Arena → publication sans force → lien CI immédiatement à « publié » → vérifier les quatre jobs avant autre lot. Ne jamais partager secrets, traces ou cookies. Snapshot code ≠ sauvegarde DB. L10 et phase 1 incomplets ; Windows en pause.
