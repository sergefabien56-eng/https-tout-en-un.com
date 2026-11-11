# Phase 1 — thème sombre et états interactifs en Chromium

## 1. Référence
v30 `a75e38b`, CI `43000349312` vérifiée : trois jobs verts (dont PostgreSQL 16), annotation Playwright « 10 passed (2.0m) », sans retry indiqué. Décision maintenue : développement/tests uniquement, aucune donnée commerciale réelle.

## 2. Réalisation
Les contrôles Axe `serious`/`critical` s’exécutent désormais aussi dans le thème sombre sur les pages publiques `/` et `/connexion`, sur les boutiques et le journal après changement de thème puis navigation, ainsi que sur la recherche rapide et le sélecteur de boutique ouverts. Sur mobile, le tiroir ouvert est audité. Le retour de focus après Échap est vérifié pour ces trois états ; le défilement horizontal du journal au clavier est testé à 375 px.

Le test a trouvé puis permis de corriger trois défauts réels : couleur des liens trop peu contrastée sur fond sombre, nom accessible du sélecteur boutique incohérent après sélection, et zone de tableau défilant non focalisable au clavier sur mobile. Une variable dédiée `--link-color` sert aux liens clairs/sombres ; les conteneurs de tableaux horizontaux ont un nom de région, un point de focus et un contour visible. Les règles Axe n’ont pas été désactivées. Pas de migration ni de fonction métier simulée.

## 3. Tests exécutés et démonstration
Lint, TypeScript, build et **159/159 tests Vitest** réussis. PostgreSQL 17 local jetable : migrations, propriétaire 2FA et boutique fictifs, rôle applicatif non BYPASSRLS et contrôle RLS. Chromium réel sur build de production : **10/10 parcours réussis sans retry**, bureau et mobile 375 px, avec audits clair/sombre et dialogues ouverts. Le test mobile confirme l’ouverture du tiroir, sa fermeture Échap avec retour au bouton, puis le déplacement horizontal du journal avec la touche fléchée. Premières exécutions rouges conservées comme constat des défauts, puis correctifs vérifiés.

## 4. Limites
Contrôle automatisé partiel, sans certification WCAG AA : lecteur d’écran, autres états, toutes tailles, autres navigateurs et audit manuel restent à faire. Les tests locaux utilisent PostgreSQL 17 ; la validation PostgreSQL 16 et la CI pour **ce lot** sont encore à exécuter après publication. Aucun déploiement, SMTP ou sauvegarde de production réels ne sont revendiqués.

## 5. Validation attendue
Publier l’archive descendante de `a75e38b` avec GitHub Desktop, sans force push ; vérifier les trois jobs CI verts et l’annotation navigateur **« 10 passed » sans « flaky »** sur PostgreSQL 16. En cas de défaut, corriger avant de déclarer le lot validé.

## 6. Suite
Poursuivre les petits lots P1 : audit clavier/lecteur d’écran des parcours essentiels, états restants et composants du design system, sans annoncer la Phase 1 achevée avant validation des prérequis d’infrastructure.
