# Phase 1 — contrôles d’accessibilité dans Chromium réel

## 1. Référence
Lot précédent v28 (`8c48ce9`) : CI PostgreSQL 16 verte, 10 tests Playwright. Décision maintenue : développement et tests uniquement, sans hébergement ni données commerciales réelles.

## 2. Réalisation
Ajout d’axe-core exécuté dans le navigateur Chromium depuis la dépendance locale (aucun CDN) : les violations **serious** et **critical** font échouer les tests sur `/`, `/connexion`, notifications, utilisateurs, rôles et boutiques, en bureau et à 375 px. Corrections des contrastes des petits textes et états « Bientôt », du lien dans le texte et du nom accessible du lien de marque. Les règles Axe n’ont pas été désactivées. Pas de changement de schéma ni de données métier.

## 3. Tests exécutés
Lint, vérification TypeScript, build et **159/159 tests Vitest** réussis. Premier parcours public Chromium : 4 échecs d’accessibilité réels sur 6, corrigés ; nouvelle exécution : **6/6 réussis**. PostgreSQL 17 local jetable, compte et boutique fictifs, rôle sans BYPASSRLS et contrôle RLS exécuté. Un premier essai administrateur sur le serveur de développement a échoué après interruption du serveur ; nouvelle exécution avec le build de production : **4/4 parcours administratifs réussis** en bureau et à 375 px. Ces résultats locaux ne remplacent pas la CI PostgreSQL 16 : vérifier son run après publication du lot.

## 4. Limites
Axe est un contrôle automatisé, pas une certification WCAG AA : navigation clavier, lecteurs d’écran et parcours non couverts exigent des vérifications complémentaires. Le contrôle Axe est limité aux pages et états visités par les tests ; il ne couvre ni tous les thèmes ni toutes les interactions et écrans. PostgreSQL local est en version 17, non 16. Pas de déploiement HTTPS, de sauvegarde de production restaurée ou de SMTP réel vérifié.

## 5. Validation attendue
Publier l’archive descendante du `main` v28 via GitHub Desktop, sans force push ; vérifier les trois jobs CI et **10 tests Playwright** bureau/mobile sans violation serious/critical, sur PostgreSQL 16. Si la CI échoue, corriger les défauts ; ne pas annoncer une conformité globale sur la seule base des tests Axe.

## 6. Suite
Étendre progressivement la couverture aux états interactifs, thème sombre, clavier et technologies d’assistance ; poursuivre les petits lots Phase 1, sans simuler de données commerciales en production.
