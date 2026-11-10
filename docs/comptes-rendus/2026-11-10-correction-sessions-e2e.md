# Phase 1 — correction du parcours Mes sessions

## 1. Constat
- Run GitHub `42917459840` du commit `2e23283` : **échec**. Jobs qualité et migrations PostgreSQL 16 réussis ; job navigateur échoué. Le contrôle RLS ne s'est pas signalé en échec.
- Sur bureau, Playwright trouve deux liens correspondant à « Propriétaire CI » : le nouveau lien du profil vers Mes sessions et celui de la ligne du tableau utilisateurs. Le sélecteur non limité au tableau déclenche une violation du mode strict.

## 2. Correction
- Cibler la **table des utilisateurs**, puis le lien de nom avec correspondance exacte. Aucun changement aux permissions, au contrôle RLS ou au rendu de la nouvelle page.
- Le nouveau parcours « Mes sessions » ne peut être considéré validé tant que la CI corrigée n'est pas verte.

## 3. Vérifications locales
- `npm run lint`, `npm run typecheck`, `npm test` **125/125** et `npm run build` réussis. Le navigateur authentifié avec PostgreSQL natif n'est pas disponible localement.

## 4. Limites
- Le scénario CI corrigé n'a pas encore tourné ; ne pas attribuer le statut vert au code non publié. Phase 1 toujours en cours.

## 5. Validation attendue
- Publication du prochain ZIP puis contrôle des trois jobs, en particulier du parcours connecté sur bureau **et** mobile.

## 6. Suite
- Après CI verte, poursuivre l'expiration glissante et la révocation auditée des autres sessions.
