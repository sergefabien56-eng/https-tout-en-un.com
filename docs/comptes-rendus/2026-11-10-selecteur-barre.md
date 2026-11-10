# Phase 1 — sélecteur dans la barre supérieure (L8, en cours)

## 1. Livré
- Bouton « Choisir une boutique » dans la barre supérieure, sur bureau et mobile. Ouvre un dialogue non modal avec recherche incrémentale côté serveur, résultats déjà filtrés par RLS, pagination de 50, états chargement/vide/erreur et option « Toutes les boutiques autorisées ».
- Sélection via le `POST /api/preferences/shop` existant : Origin et CSRF, permission et accès vérifiés côté serveur, cookie HttpOnly ; relecture de la préférence après choix. Sur la page journal, un changement de choix réoriente vers la bonne boutique.
- Clavier : focus envoyé à la recherche à l’ouverture ; Échap ferme et rend le focus au bouton. Sur mobile, le panneau se positionne dans la largeur du viewport.

## 2. Tests exécutés
- Local : `npm run lint`, `npm run typecheck`, `npm test` **138/138**, build réussi. Test UI : ouverture, focus, recherche serveur et fermeture Échap. Tests PGlite et sécurité du précédent lot conservés.
- Scénario Playwright bureau/mobile modifié pour sélectionner la boutique fictive CI depuis la **barre** plutôt que le tableau, puis vérifier préférence et journal. **Ce scénario modifié n’a pas encore été exécuté en CI.** Dernier run publié v13 `42925522389` vert pour l’ancien parcours.

## 3. Décisions
- Dialogue non modal utilisant des éléments HTML natifs et une recherche serveur ; pas de confiance dans un identifiant injecté dans le client. Chaque page métier vérifie son propre périmètre, indépendamment du libellé de préférence.

## 4. Limites
- Regroupements visuels par statut/plateforme, virtualisation des lignes et tests de performance navigateur >100 boutiques restent à réaliser. Une seule plateforme « Jumia » est prévue par le schéma actuel ; ne pas inventer d’autres plateformes. Pas d’application en ligne ; Phase 1 non terminée.

## 5. Vérification attendue
- Publier le prochain paquet, contrôler les trois jobs et le parcours connecté sur les deux tailles d’écran ; corriger tout échec.

## 6. Suite
- Compléter clavier/accessibilité et tests de charge, puis filtres du journal, exports sécurisés, invitations et sauvegardes/restauration.
