# Phase 1 / L10 — export de l’instantané Système

## Périmètre décidé et contrôle d’accès
CSV, Excel et PDF de l’instance : même contrôle de base que `/api/health/deep`, version, environnement déclaré, date UTC de contrôle, migrations et durée de requête. Droits vérifiés côté serveur dans la même transaction : session valide, rôle **owner global**, permissions globales `system:manage` et `reports:export`. Un autre rôle même doté de ces permissions ne peut exporter. Lien masqué si non autorisé, route néanmoins protégée indépendamment. Réponses `no-store`, `nosniff`, erreurs internes neutres. Export au téléchargement, pas nécessairement au même instant que la page consultée précédemment.

Projection explicite uniquement ; aucun détail d’événement, boutique, secret ni URL de base. Données fictives et chaînes à préfixes de formule neutralisées dans les trois formats, aucune formule Excel active. PDF : police DejaVu Sans embarquée ; police et licence tracées dans la sortie autonome, limite 254 caractères, contrôles/glyphes non disponibles et dépassement de page refusés. Aucune donnée n’est inventée.

## Correctif d’intégrité : compteurs indisponibles
Un test en rôle applicatif sans BYPASSRLS a mis en évidence un défaut antérieur : `system_events` est protégé par la policy `0007`, qui exige un contexte boutique même pour lire des lignes globales. Dans un contexte global sans boutique, un `COUNT` renvoyait zéro **bien que des événements globaux existent**. L’ancien test utilisait un rôle privilégié et ne l’avait pas révélé.

Ce lot ne contourne ni n’assouplit la RLS : les trois compteurs sont désormais **indisponibles** dans l’écran, l’export et `/api/health/deep`. Leurs champs JSON restent présents mais valent `null` au lieu d’un nombre : **changement de contrat à signaler aux clients automatisés**. Les tâches, la file et le collecteur d’erreurs sont aussi indisponibles, sans faux statut OK. L’implémentation ultérieure de compteurs réels exige une conception sécurisée et des tests avec le rôle applicatif réel. Aucun événement de boutique ne doit fuiter. Le contrôle de base ponctuel ne prouve ni la disponibilité continue, ni l’hébergement, ni les sauvegardes.

## Vérifications locales et CI
325 Vitest réussis, dont formatage hostile, erreurs, rôles/double droit, test PGlite sous rôle NOBYPASSRLS prouvant la différence entre 3 événements globaux réels et 0 visible sans contexte, et refus même à un non-propriétaire possédant les deux droits. Lint, types, build et audit high réussis ; 7 vulnérabilités modérées. PDF fictif relu avec PyMuPDF et aperçu inspecté ; police et licence tracées. 14 scénarios Playwright listés ; navigateur réel et PostgreSQL 16 de ce nouveau lot **non exécutés localement** : à vérifier en CI.

Base publiée `393573ef0263e817bc3861bdbf44200dca8bb748`, [run 43762590007](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43762590007) quatre jobs verts, 14 tests navigateur ; artifact non restauré. ZIP Arena → publication sans force → lien CI dès « publié » → quatre jobs verts avant le prochain lot. L10 et phase 1 incomplets ; Windows en pause.
