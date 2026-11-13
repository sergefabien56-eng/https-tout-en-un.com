# Reprendre ici — correctif navigateur CI

## GitHub et CI

`6a3ab80ef61ba4680c4a2b53a6963f5e28111d51` publié : [run `43506484096`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43506484096) completed failure. Qualité et migrations PG16 vertes (sauvegarde/restauration réussie) ; navigateur rouge, archive skipped. Annotations publiques : attendu 10 migrations, obtenu 11 sur test Système bureau/mobile ; scénario notifications bureau flaky à la navigation, succès au retry. Logs bruts/artifact inaccessibles sans droits. Preuve `/home/user/continuity-backups/verification-publication-6a3ab80.md`. Dernière base aux quatre jobs verts : `2572013` run `43487610108`.

## Correctif préparé

Ce commit ne change que les tests E2E : compte des migrations dérivé des fichiers SQL avec égalité stricte ; attente de fin de navigation de filtre avant rafraîchissement notifications. La cause exacte du flaky n'est pas prouvée. Voir `docs/comptes-rendus/phase1-correctif-ci-navigateur-0011.md`. Local : 209 Vitest, lint ciblé, types et découverte Playwright OK ; E2E navigateur non exécutés localement. Vérifier les **quatre jobs de son propre SHA** après publication.

Cycle : snapshot → ZIP Drive privé → publication propriétaire sans force → donner lien CI et vérifier les quatre jobs avant tout lot suivant. Lire `AI_HANDOVER.md`, `PROJECT_STATUS.md`, `NEXT_ACTIONS.md` et comparer code et plan. Ensuite seulement : accès des comptes à rôle global (409). Phase 1 non terminée, Windows en pause, aucun secret ni donnée réelle.
