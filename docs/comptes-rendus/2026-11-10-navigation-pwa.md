# Phase 1 — navigation et PWA, jalon partiel

## 1. Livré

- Dépendances Tailwind CSS 4, Lucide, Radix Slot et base de composant Button dans `src/ui/components/button.tsx` (inspirée des conventions shadcn/ui, **pas** un catalogue shadcn complet).
- `navigation.config.ts`, source unique de **8 sections / 44 entrées**, avec permission requise et disponibilité par feuille. Seule `Vue d'ensemble → /espace` est `ready` ; les 43 autres sont désactivées « Bientôt », jamais des liens morts.
- Navigation responsive : sidebar dépliable, rail à largeur intermédiaire, tiroir mobile, Tout ouvrir/Tout fermer, ouverture multiple, page active, mémorisation locale, flèches Haut/Bas, Début/Fin, Échap et retour du focus. Barre supérieure indiquant honnêtement qu'aucune boutique n'est connectée ; recherche et notifications désactivées.
- Thème clair/sombre/système par jetons CSS, suivi de la préférence appareil et mémorisation locale ; `prefers-reduced-motion` respecté. Manifest PWA et icônes locales 192/512 générées. Aucune donnée métier fictive.
- États `loading.tsx` et `error.tsx` pour l'espace privé ; le rendu privé requiert une session côté serveur.
- CI préparée avec un job Playwright bureau et mobile 375 px après les jobs qualité et migrations.

## 2. Tests exécutés

- `npm run lint` : succès ; `npm run typecheck` : succès ; `npm run build` : succès.
- `npm test` : **111/111 tests**, 16 fichiers : configuration 8/44, absence de liens morts, filtrage permissions, menu, tiroir/Échap, thème et contrôle `axe` sur le DOM (contraste non vérifiable dans jsdom).
- `npm run test:e2e` : **6/6 parcours Chromium réels en local**, bureau et mobile 375 px : connexion visible sans débordement horizontal, espace privé refusé sans session, pas de chiffre métier inventé. Chromium exécuté avec des bibliothèques système téléchargées localement dans un cache non versionné. Le premier essai avait échoué faute de bibliothèques `libnspr4.so` ; après installation locale, les 6 parcours ont réussi. Un autre essai a détecté une prévisualisation Next.js périmée après un build ; le serveur a été arrêté et Playwright utilise désormais son propre port 3100.

## 3. Décisions et écarts

- Une entrée n'est `ready` **qu'après** existence d'une page et de ses contrôles serveur ; la liste « ready en fin de P1 » du design system reste une cible, pas un état actuel.
- La recherche et le sélecteur de boutiques ne prétendent pas fonctionner sans données réelles. Les boutons désactivés sont clairement annoncés.
- Le manifest n'installe aucun service worker et ne met en cache aucune information privée : c'est une base PWA, **pas** une expérience hors ligne terminée.

## 4. Limites connues

- Les tests E2E portent sur la page de connexion publique et le refus d'accès ; **aucun parcours E2E authentifié** ou test visuel du menu sur un vrai navigateur faute de base et de compte de test. Le test du menu `axe` sous jsdom désactive le contrôle du contraste ; WCAG AA reste à vérifier au navigateur.
- Mémorisation actuelle via `localStorage`, pas encore par cookie/serveur ; possibles écarts visuels à l'hydratation.
- Navigation 44 entrées en place, mais 43 fonctionnalités non livrées ; aucune ne doit être considérée « terminée » à ce titre.
- Le pipeline GitHub **n'a pas encore exécuté** le nouveau job Playwright : le dernier workflow vert connu porte sur le code précédent.
- Aucun hébergement n'est identifié ; pas de HTTPS ni restauration de sauvegarde.

## 5. Points à vérifier

- Publier une version regroupée une fois le jalon de sécurité/interface stabilisé ; constater les trois jobs CI verts (qualité, migrations PostgreSQL 16, navigateur).
- Valider l'expérience mobile 375 px **de l'espace connecté** quand une base de démonstration et un compte de test seront disponibles en staging.

## 6. Suite

- Parachever L5/L6 (parcours utilisateur authentifié et permissions complètes) puis rendre disponibles les pages d'administration/boutiques réelles ; vérifier les écrans connectés en E2E. L11 dépendra d'un hébergement choisi plus tard. **Phase 1 non terminée.**
