# Actions suivantes — L10 après le run 44278561288

Base publiée **`c8100b0f7c0d2e56cff59b54748361c93f3acc47`**, [run 44278561288](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/44278561288) : quatre jobs verts.
Livrés et validés en CI : accessibilité des six écrans (point 7) et la file de limitation de connexion (point 3).
**L10 et Phase 1 restent incomplets.**

## Chantiers L10 encore ouverts (aucun commencé)

1. **Invitations sécurisées + SMTP réel** — le statut `invited` existe (refus d'activation), le jeton d'invitation
   et l'envoi n'existent pas (aucune référence `smtp` dans `src/`). Menu « Inviter un utilisateur · bientôt ».
   Bloqué côté envoi réel : aucun SMTP fiable fourni.
2. **Supervision, collecteur d'erreurs, alertes propriétaire** — `/api/health/deep` et `src/modules/monitoring/deep-health.ts`
   existent ; l'écran Système déclare explicitement l'absence de collecteur et de file de tâches. Aucun envoi d'alerte.
3. **Écran Système** — *file de limitation de connexion* **livrée et validée en CI** par le run 44278561288.
   **Restent non livrés** : worker et file de tâches, collecteur d'erreurs, latence par route, tâches
   planifiées. Toujours affichés « indisponible ». Rapport : `docs/comptes-rendus/phase1-systeme-limitation-connexion.md`.
4. **Paramètres d'organisation complets (L10 §103)** — notifications par e-mail et section apparence d'organisation
   non livrées (l'apparence reste une préférence **locale au navigateur**, non synchronisée entre appareils).
5. **Notifications métier / temps réel** — seules les notifications personnelles existent (connexion, sécurité).
6. **Recette utilisateur** — jamais faite ; J3 non prononcé. Aucune validation par une personne réelle hors CI.
7. ~~**Poste accessibilité — 6 écrans sans contrôle `axe`**~~ → **livré et validé en CI** par le run 44269439637
   (étapes 11 et 13 vertes). Rapport : `docs/comptes-rendus/accessibilite-ecrans-admin.md`.
8. **Règles XOF** (taux, conversions, arrondis, commissions) — **non définies par le propriétaire, donc non inventées**.
   La devise de référence est seulement enregistrée ; aucun calcul.

## Hors L10 mais blocage de la Phase 1 (L11/L12)

Déploiement (domaine, VPS, HTTPS, préproduction isolée) ; sauvegarde PostgreSQL chiffrée hors site avec restauration
testée (RPO/RTO) ; démonstration de validation et compte rendu. Windows en pause. Snapshot code ≠ sauvegarde base.
