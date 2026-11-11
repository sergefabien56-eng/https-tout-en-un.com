# Phase 1 — recherche rapide des boutiques autorisées

## 1. Référence
v24 (`99ae32d`), CI `42977828926` : trois jobs verts, dont migrations/restauration PostgreSQL 16 et 8 parcours navigateur bureau/mobile. VPS absent ; SMTP disponible chez l’opérateur mais pas encore testé par l’application.

## 2. Réalisation
Bouton de loupe fonctionnel pour les comptes ayant la permission `shops:read`. `Ctrl/Cmd+K` ouvre un dialogue clavier, `Échap` le ferme et restitue le focus. Dès deux caractères, la recherche interroge **l’API de boutiques existante** : session valide, filtrage serveur par droits et RLS. Les cinq premiers résultats ouvrent la liste de boutiques déjà autorisée, avec lien vers tous les résultats de la recherche. États saisie insuffisante, chargement, aucun résultat, erreur. Aucun endpoint de recherche métier/Jumia inventé. Guide utilisateur actualisé.

## 3. Vérifications locales
Lint, typage, build, **158/158 tests** réussis. Test UI : raccourci, focus, API, lien, fermeture Échap, permission absente ; catalogue déjà testé avec séparation des boutiques. Scénario Playwright authentifié étendu sur bureau/mobile, mais **non exécuté localement sur PostgreSQL 16**.

## 4. Limites
Il s’agit d’une **recherche de boutiques seulement**, pas d’une recherche globale utilisateurs/audit/commandes. Aucun résultat Jumia n’existe encore. Nouvelle interface non encore publiée ni validée en CI ; Phase 1 non déployée.

## 5. Validation attendue
Publier une archive descendante du commit `99ae32d` sans force push, puis vérifier les trois jobs, l’isolation RLS et la démonstration clavier sur navigateur bureau/mobile.

## 6. Suite
Étendre progressivement la recherche aux données Phase 1 avec contrôle des permissions par catégorie, puis préparer les tests SMTP sur staging séparé quand un hébergement sera disponible.
