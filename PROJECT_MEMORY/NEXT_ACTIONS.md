# Actions suivantes — L10 après le correctif 898e13b

## Décision prise
Collecteur d'incidents : **option B** retenue par le propriétaire (règle d'écriture ciblée,
pas de second compte base). La migration `0019_incident_write` l'applique. L'écran Système
collecte désormais réellement les incidents, sans pouvoir les modifier ni les effacer.

## Immédiat (côté propriétaire)
1. **Publier `898e13b`** depuis l'archive prête (`TOUT-EN-UN-898e13b-a-publier.zip`, Drive
   `PRET-A-POUSSER`, id `1hSFKMs_43L8SbL2dJfB5A4CXtWSiIpli`) : avance rapide sur `1417f3e`.
2. **Appliquer la migration 0018** en production (`drizzle/0018_route_latency_incidents.{up,down}.sql`),
   sinon l'écran Système y affichera « aucune mesure » et des incidents vides.
3. **Appliquer aussi 0019** (même migration groupée) : sans elle, les incidents ne s'écrivent pas.
4. **Armer la mesure** en production : `LATENCY_INSTRUMENTATION=on` dans l'environnement du
   serveur (sans cette variable, aucune mesure n'est écrite — c'est voulu et documenté).
4. Suivre le run CI du push : le job navigateur doit passer (serveur prêt en une poignée de
   secondes au lieu de 90 s d'attente).

## Historique — après le run 44301784481

Base publiée **`204fb87e32b58259eb69fee20aa4a24e5b85e527`**, [run 44301784481](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/44301784481) : quatre jobs verts, 0 instable.
Livrés et validés en CI : accessibilité des six écrans (point 7), file de limitation de connexion (point 3)
et apparence — nom, icône provisoire, logo commun (point 4).
**L10 et Phase 1 restent incomplets.**

## Chantiers L10 encore ouverts (aucun commencé)

1. **Invitations sécurisées + SMTP réel** — le statut `invited` existe (refus d'activation), le jeton d'invitation
   et l'envoi n'existent pas (aucune référence `smtp` dans `src/`). Menu « Inviter un utilisateur · bientôt ».
   Bloqué côté envoi réel : aucun SMTP fiable fourni.
2. **Supervision, collecteur d'erreurs, alertes propriétaire** — `/api/health/deep` et `src/modules/monitoring/deep-health.ts`
   existent ; l'écran Système déclare explicitement l'absence de collecteur et de file de tâches. Aucun envoi d'alerte.
3. **Écran Système** — *file de limitation de connexion* validée en CI (run 44278561288) ; **latence par
   route et incidents applicatifs livrés localement, non publiés** (`docs/comptes-rendus/phase1-systeme-latence-incidents.md`).
   **Restent non livrés** : worker et file de tâches, tâches planifiées, et **écriture** des incidents
   par l'application (le rôle applicatif n'a pas le droit d'écrire dans `system_events` : RLS 0007).
   Décision à prendre : compte d'administration dédié au collecteur, ou écriture via une policy
   `INSERT` globale restreinte. Rapports : `phase1-systeme-limitation-connexion.md`, `phase1-systeme-latence-incidents.md`.
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

## Piège documenté : ne pas découper le parcours admin (18/11/2026)

Le découpage en trois tests a été **essayé puis abandonné** : 6 tests × 2 projets + 1 = **13 connexions**
du compte propriétaire par job navigateur, alors que `rate_limits` plafonne à **10 par e-mail et par
15 minutes**. La CI serait rouge par construction, et les 24 codes de secours sont déjà tous réservés.
Voir `DECISIONS_LOG.md` (entrée du 18/11). Correctif de référence conservé : `204fb87`
(`setTimeout(180_000)` + `waitUntil: 'domcontentloaded'`), validé par le run 44301784481.
