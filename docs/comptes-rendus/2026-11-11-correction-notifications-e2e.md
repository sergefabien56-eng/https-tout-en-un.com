# Phase 1 — correction du scénario navigateur des notifications

## 1. Constat
- Run GitHub `42935127575` du commit `a7113ca` : **échec**. Qualité et migrations PostgreSQL 16 (y compris restauration avec 9 migrations) ont réussi ; navigateur bureau/mobile échoué.
- Playwright exigeait un titre « Nouvelle connexion » unique. Les connexions réussies des deux projets et leurs retries écrivent chacune une notification réelle pour le même propriétaire CI ; plusieurs titres identiques sont attendus. Le sélecteur strict échouait. Un retry atteignait aussi la limite globale de 30 s du parcours multi-pages.

## 2. Correction
- Vérifier que **la première notification existe**, puis contrôler également l’API et son type `security_login` ; ne pas imposer l’unicité de l’intitulé.
- Timeout **de ce seul scénario** porté à 90 s pour couvrir les pages et requêtes PostgreSQL sur bureau et mobile. Aucun délai des autres tests, code d’authentification, écriture des notifications ou politique RLS n’a été affaibli.

## 3. Tests exécutés
- Local : lint, typage, **153/153 tests** et build verts. Le parcours Playwright authentifié n’a pas encore été rejoué sur PostgreSQL CI après cette correction.

## 4. Limites
- Le succès du job migrations du run échoué ne valide pas automatiquement le navigateur corrigé. Ne pas déclarer v18 vert. Phase 1 non terminée.

## 5. Validation attendue
- Publier un descendant du commit `a7113ca`, vérifier les trois jobs et les deux projets navigateur. En cas de nouvel échec, examiner le premier échec plutôt que les effets secondaires des retries.

## 6. Suite
- Après CI verte, poursuivre notifications d’incident réellement produites, état lu/non lu sécurisé et autres exigences Phase 1.
