# Phase 1 — actualiser les notifications sans promettre du temps réel

## 1. Référence
v33 `c4bc72f`, run `43006881509` vérifié : trois jobs verts, migrations PostgreSQL 16 et « 10 passed (58.5s) » sans flaky. Décision : développement/tests uniquement. Une prévisualisation temporaire des pages publiques et une maquette distincte sont disponibles, sans données commerciales réelles ni hébergement de production.

## 2. Réalisation
L’écran **Mes notifications** indique explicitement que la liste n’est pas actualisée automatiquement et propose un lien natif **Actualiser les notifications**. Celui-ci déclenche une navigation complète vers la même page, avec `filter` et `page` validés déjà conservés dans l’URL : le serveur relit uniquement les notifications de la session. Aucun polling, API supplémentaire ni donnée simulée. Le guide utilisateur décrit cette limite.

L’accueil public affichait encore des textes du lot initial (notamment « 7 migrations » et connexion/navigation à venir). Ils ont été remplacés par des indications à jour : fonctions *implémentées et testées en CI*, hébergement réel indisponible, santé conditionnée par la base, aucune donnée Jumia réelle. Cela évite de présenter la prévisualisation comme un déploiement professionnel.

## 3. Tests et démonstration
Lint, typage, build et **159/159 tests Vitest** réussis. PostgreSQL 17 jetable local : migrations, rôle sans BYPASSRLS, contrôle RLS, propriétaire 2FA et boutique fictifs. Sur build de production, **10/10 parcours Playwright** bureau/mobile 375 px : mutation réelle d’une notification, lien d’actualisation, état relu sur le serveur, filtre et page conservés. Après correction de l’accueil, **6/6 tests publics Chromium** supplémentaires, contrastes clair/sombre inclus, puis build refait. Les deux aperçus temporaires répondent en HTTP 200 dans le sandbox ; la base de test a été arrêtée et aucun compte n’est accessible dans l’aperçu public.

## 4. Limites
Le bouton requiert une action manuelle ; aucune notification push ou mise à jour en direct n’est fournie. L’exécution locale authentifiée utilise PostgreSQL 17 et non 16 ; la CI de **ce lot** n’a pas encore été exécutée. Les maquettes restent fictives et ne sont pas l’application fonctionnelle ; la prévisualisation Arena n’est ni stable ni adaptée aux données commerciales ou aux secrets de production.

## 5. Validation attendue
Publier une archive descendante de `c4bc72f` via GitHub Desktop sans force push ; vérifier trois jobs CI verts, restauration/migrations PostgreSQL 16 et annotation navigateur **« 10 passed » sans « flaky »**. Tester manuellement l’actualisation sur un environnement de test avant d’étendre cette fonction.

## 6. Suite
Poursuivre les lots P1 d’administration et sécurité ; étudier séparément le besoin d’actualisation automatique, seulement après validation des exigences de charge, de confidentialité et de pertinence des notifications.
