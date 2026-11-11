# Phase 1 — badge de notifications non lues dans la barre supérieure

## 1. Référence
v23, commit GitHub `6550912`, CI `42975121641` : trois jobs verts, 10 migrations et restauration PostgreSQL 16 réussies, 8 scénarios navigateur réussis sur bureau/mobile. Le VPS n’est pas encore prêt ; SMTP disponible côté opérateur mais aucun envoi fonctionnel attesté.

## 2. Réalisation
Compteur calculé sur les **notifications non lues du compte authentifié**, dans une transaction identité avec contexte RLS local, sans ID de compte fourni par le navigateur. La cloche n’affiche pas de badge si le compteur est réellement nul ; elle montre `99+` si le nombre dépasse 99. Son nom accessible annonce ce nombre. Aucun total métier/Jumia simulé, aucune nouvelle migration. Guide utilisateur français ajouté dans le même lot.

## 3. Vérifications
Local : lint, typage, build et **157/157 tests** réussis. Intégration PostgreSQL WASM : compte A/B isolés, changement lu/non lu et plafonnement au-delà de 99 ; test UI d’accessibilité du libellé et du badge. Le parcours Playwright a été adapté au libellé accessible de la cloche, mais doit être exécuté en CI avec PostgreSQL 16 réel.

## 4. Limites
Pas de polling temps réel : le nombre est actualisé au rendu/rafraîchissement de la navigation, pas en continu. Le badge et le guide ne sont pas encore publiés ni validés en CI. Pas de serveur HTTPS, d’envoi SMTP vérifié ni de sauvegarde de production.

## 5. Validation attendue
Publier un descendant de `6550912` avec GitHub Desktop, sans force push ; contrôler les trois jobs et les deux tailles navigateur. Consulter le guide utilisateur avant diffusion.

## 6. Suite
Poursuivre les fonctions manquantes de la Phase 1 (recherche globale, administration et alertes critiques réelles) tout en maintenant les actions non prêtes désactivées. Ne pas annoncer la Phase 1 terminée sans VPS/HTTPS, SMTP effectivement testé et sauvegardes chiffrées hors serveur restaurées.
