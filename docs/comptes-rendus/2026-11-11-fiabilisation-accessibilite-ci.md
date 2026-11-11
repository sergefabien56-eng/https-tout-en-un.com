# Phase 1 — corriger les deux retries de la CI accessibilité

## 1. Référence
v29 `e6e066e`, run CI `42998246132` : trois jobs verts, mais **deux tests Playwright « flaky »** (8 réussis directement, 2 après retry). Le résultat n’est donc pas interprété comme 10/10 sans retry.

## 2. Réalisation
Axe attend désormais le titre via `page.title()` avant d’auditer une navigation App Router : la règle `document-title` reste activée et l’attente échoue si le titre n’arrive pas. Le bouton « Marquer comme lue/non lue » est désactivé pendant l’hydratation, pour ne pas autoriser un clic sans gestionnaire React. Le parcours E2E attend un bouton actif et la réponse HTTP de la mutation ; un échec de la requête ne peut plus passer inaperçu. Aucun changement de schéma.

## 3. Tests exécutés
Lint, TypeScript, **159/159 tests Vitest**, build réussis. PostgreSQL 17 local jetable : migrations, rôle sans BYPASSRLS, contrôle RLS, propriétaire 2FA et boutique fictifs. Après correction de la configuration locale de clé de test (une clé de 29 octets avait été saisie par erreur, contre 32 attendus), le **parcours Chromium complet : 10/10 tests réussis sans retry**, en bureau et mobile 375 px, avec le build de production. Le contrôle final sur PostgreSQL 16 et sur les ressources CI doit encore être exécuté pour ce correctif.

## 4. Limites
Un test automatisé sans violation grave n’établit pas une conformité WCAG AA globale ; états, thèmes, lecteurs d’écran et navigation clavier restent à approfondir. L’échec initial de v29 et son caractère flaky restent visibles dans l’historique. Rien n’a été déployé en production ; aucune donnée commerciale réelle n’a été utilisée.

## 5. Validation attendue
Publier une archive descendant de `e6e066e` via GitHub Desktop, sans force push ; vérifier trois jobs verts et annotation navigateur **« 10 passed » sans « flaky »** sur PostgreSQL 16. Si un retry persiste, investiguer avant de déclarer ce lot stabilisé.

## 6. Suite
Étendre les audits aux états interactifs, au thème sombre et aux contrôles manuels d’accessibilité, par petits lots indépendants.
