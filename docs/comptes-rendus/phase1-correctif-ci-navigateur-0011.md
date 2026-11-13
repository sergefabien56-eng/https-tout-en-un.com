# Correctif CI — navigateur et migrations 0011

## Constat

La publication `6a3ab80ef61ba4680c4a2b53a6963f5e28111d51` a lancé le [run 43506484096](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43506484096) : **qualité et migrations PostgreSQL 16 vertes**, y compris sauvegarde/restauration ; navigateur rouge, archive non exécutée. Les annotations publiques du job navigateur montrent deux scénarios bureau/mobile échoués au même endroit : `migrationsApplied` attendu 10, reçu 11, y compris au retry. Un autre scénario bureau est flaky : `waitForNavigation` du rafraîchissement des notifications a expiré tandis que les navigations observées restaient sur le filtre ; il a réussi au retry. CI configurée pour échouer sur les flaky. Les logs bruts exigent des droits (403) et l'artifact `e2e-traces` exige l'authentification (401), non téléchargé.

## Correctif

Dans `tests/e2e/authenticated-admin.spec.ts` uniquement :

- Comparer le nombre de migrations du health check au nombre non nul de fichiers `drizzle/*.up.sql` plutôt qu'à 10. La vérification d'égalité reste stricte.
- Pour le filtre des notifications, attendre explicitement la fin de la navigation document native et vérifier sa réponse HTTP 200 **avant** de cliquer sur Actualiser. La navigation et le contenu après actualisation restent vérifiés. La concurrence avec la navigation précédente est une hypothèse plausible, pas une cause prouvée : les annotations ne permettent pas d'établir la cause précise.

Aucun code métier, sécurité, RLS ni migration n'a changé. Local : 209 tests Vitest en 32 fichiers, TypeScript, lint ciblé et découverte des 10 tests Playwright OK. Les E2E PostgreSQL 16/Chromium du correctif ne sont pas exécutés localement et doivent être validés par la CI du SHA publié. Attendre les quatre jobs verts avant le lot suivant. Pas de données réelles, pas de production, Windows en pause ; Phase 1 incomplète.
