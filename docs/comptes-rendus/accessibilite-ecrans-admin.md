# Recette L10 — accessibilité des six écrans sans contrôle Axe

> État : **local, non publié**. Lot suivant la base `acbd578` (run 44208729767, quatre jobs verts).
> Aucun changement applicatif : uniquement des contrôles de test ajoutés.

## 1. Le trou fermé

Avant ce lot, `expectNoSeriousAccessibilityViolations()` était appelée sur 10 écrans.
Six écrans de l'espace privé n'étaient contrôlés par **aucun** audit d'accessibilité :

| Écran | Route |
|---|---|
| Rôles et permissions | `/espace/roles` |
| Utilisateurs | `/espace/utilisateurs` |
| Fiche compte | `/espace/utilisateurs/[id]` |
| Système | `/espace/systeme` |
| Mes sessions | `/espace/sessions` |
| Journal global | `/espace/journal/global` |

## 2. Résultat de l'audit avant toute modification

Aucune violation `serious` ou `critical` sur les six écrans. Le résultat n'est pas un
test vide : un **témoin** injecte une image sans alternative dans la page et exige que
Axe détecte `image-alt` avant de conclure. Chaque page est aussi vérifiée non vide
(titre de niveau 1, contenu et tableau attendus) pour ne pas auditer un écran d'erreur.

## 3. Choix de mise en œuvre : instrumenter, pas ajouter

Une première tentative créait `tests/e2e/accessibilite-admin.spec.ts` avec deux tests
supplémentaires. Elle a été **abandonnée** : le login est limité à **10 tentatives par
adresse e-mail et par fenêtre de 15 minutes**, compteur persisté en base
(`rate_limits`, mesuré localement à 16 après une exécution complète). Deux connexions
de plus faisaient basculer la suite au-delà du quota et échouaient de façon réaliste.

Les audits sont donc placés **dans les parcours existants**, qui visitent déjà ces écrans :

- `authenticated-admin.spec.ts` — fiche compte (scénario 0), journal global (scénario 1) ;
- `global-audit.spec.ts` — journal global, session propriétaire fournie par cookie.

Aucune connexion supplémentaire, aucun code de secours supplémentaire (24 inchangés),
aucun test ajouté : le nombre de tests reste **26**.

## 4. Preuves locales

- `npm run typecheck` : propre. `npm run lint` : propre. `npx vitest run` : **390 tests / 76 fichiers**.
- Suite navigateur dans l'ordre exact de la CI (deux vagues, fixtures de délégation
  semées entre les deux, projet réel, 2 tailles d'écran, retries de la CI) :
  **vague 1 : 21 passés, 5 sautés · vague 2 : 4 passés · 0 échec, 0 flaky**.

## 5. Limite du résultat local — à ne pas masquer

Sur cette machine (2 Go de RAM), les clics de navigation échouent de façon intermittente
sous charge, **sur le code non modifié comme sur le code modifié** : deux exécutions de
référence sans ce lot ont produit 2 échecs, une exécution avec ce lot n'en a produit aucun.
Le résultat local ne prouve donc pas la stabilité : seule la CI, sur ses propres
ressources, tranchera.

## 6. Ce que ce lot ne fait pas

- Aucun test avec lecteur d'écran réel (NVDA, VoiceOver) : Axe ne remplace pas un usage humain.
- Le mobile est vérifié à 375 px uniquement.
- La navigation clavier complète (ordre de tabulation, piège de focus du tiroir) est
  contrôlée sur certains parcours seulement, pas sur les six écrans.
- Recette utilisateur toujours non faite.
