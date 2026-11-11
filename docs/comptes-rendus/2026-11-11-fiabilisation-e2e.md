# Phase 1 — fiabilisation du parcours navigateur authentifié

## 1. Constat
v26, commit distant `b240af8`, run `42991067297` : **trois jobs success**, mais une première tentative `mobile-375` du scénario authentifié a dépassé sa limite globale de 90 secondes ; retry réussi. La page publique ne révèle pas l'étape précise du délai : **cause exacte non établie**. Ne pas qualifier l'exécution de stable.

## 2. Correction ciblée
Le parcours monolithique est divisé en deux scénarios indépendants, avec conservation de ses assertions : (1) connexion 2FA, notifications et recherche utilisateurs ; (2) rôles, boutiques, journal et sessions. Chaque scénario dispose de son propre délai de 90 secondes et d'un nom distinct pour faciliter le diagnostic. La connexion utilise des codes de secours CI **distincts** selon scénario × bureau/mobile × tentative/retry, soit huit au maximum sur dix codes fictifs créés par le bootstrap. Aucun test, contrôle RLS ou vérification métier n'a été désactivé. Une ouverture de tiroir mobile devenue redondante après le découpage est retirée.

## 3. Tests exécutés
Local : lint, typage, build, **159/159 tests** réussis ; Playwright `--list` confirme 4 scénarios authentifiés (2 scénarios × 2 tailles d'écran). Pas de PostgreSQL 16 ni de navigateur authentifié exécutés localement ; nouvelle CI requise.

## 4. Limites
Le découpage ne prouve pas encore l'absence de lenteurs ni l'origine du timeout initial. Pas de serveur de production ; décision utilisateur de continuer code et tests sans hébergement ni données réelles.

## 5. Validation attendue
Publier une archive descendante de `b240af8` via GitHub Desktop, sans force push ; contrôler les trois jobs, les deux nouveaux scénarios sur bureau/mobile et **l'absence de retry/flaky**. Si timeout persiste, récupérer les détails du premier échec avant d'ajuster encore les délais.

## 6. Suite
Reprendre les fonctions Phase 1 après CI entièrement stable ; garder les fonctions non prêtes désactivées et ne pas simuler d'envoi SMTP ou de données Jumia.
