# Questions ouvertes — réponses nécessaires

> Phase 0. Chaque question indique **pourquoi elle compte**, **ce qui se passe si elle reste sans réponse** et **la proposition par défaut** que j'appliquerai si vous me dites « prends la proposition ». Répondre dans la colonne de droite du tableau suffit.

---

## A. Les six questions du prompt maître

### Q1 — Quels pays Jumia sont concernés ?
**Pourquoi.** Un pays = une devise = un ensemble de taux (commission, TVA) = un fuseau pour interpréter les dates Jumia. L'API accepte : `CI, DZ, EG, GH, KE, MA, NG, SN, TN, UG, ZA` (**pas le Cameroun ni la Tanzanie**).
**Ce que je dois savoir.** (a) les pays où vous vendez **aujourd'hui**, (b) ceux prévus à 12 mois, (c) si plusieurs pays sont sous **un même compte** Vendor Center.
**Si pas de réponse.** Je paramètre CI + SN (zone XOF) et je laisse les autres pays configurables. Conséquence : si vous vendez déjà au NG, les montants NGN ne seront pas consolidables correctement.
**Proposition par défaut.** CI, SN (+ NG si vous confirmez). Devise de référence : XOF.

### Q2 — Quels accès API sont déjà disponibles ?
**Pourquoi.** C'est le seul point bloquant de la Phase 2 : sans application Vendor Center (Self Authorization) et un `refresh_token`, **je ne peux pas tester réellement** la connexion, le débit, les jetons, ni les relevés. Je peux développer contre la spécification, pas valider.
**Ce que je dois savoir.**
1. Avez-vous accès au **Vendor Center** (et pas seulement au Seller Center historique) ?
2. Une application **Self Authorization** y est-elle déjà créée ? Sinon, pouvez-vous en créer une (Settings → Applications → Create Application → Self Authorization → Generate Token) ?
3. Existe-t-il un accès **staging** (`vendorcenter-staging.jumia.com`) pour vos tests ?
4. Avez-vous un contact account manager (utile pour les questions de factures, webhooks, quotas) ?
**Si pas de réponse / pas d'accès.** P2 développée entièrement sur fixtures, **non déclarable terminée**, et je vous le dirai explicitement dans le compte rendu.
**Proposition par défaut.** Rien ne peut remplacer cet accès ; je ne simule pas.

### Q3 — Combien de boutiques et quel volume ?
**Pourquoi.** Ça fixe les index, la pagination, les agrégats, la stratégie de synchronisation et le dimensionnement du serveur. 3 boutiques et 100 boutiques ne se conçoivent pas pareil (le budget API est par Mastershop : 200 req/min, 4 req/s).
**Ce que je dois savoir.**
1. Nombre de boutiques (par pays) aujourd'hui / à 12 mois.
2. Volume de commandes par mois (ordre de grandeur) et nombre de produits par boutique.
3. Nombre d'utilisateurs simultanés.
4. Fréquence de synchronisation souhaitée (proposition : commandes 10 min, stocks 15 min, produits 60 min).
**Si pas de réponse.** Je dimensionne pour 100 boutiques / 100 k commandes par an (hypothèse haute) : plus coûteux en temps de développement, jamais faux.
**Proposition par défaut.** 100 boutiques, 20 k commandes/mois, 5 utilisateurs, fréquences ci-dessus.

### Q4 — Hébergeur, nom de domaine, localisation des données
**Pourquoi.** L'URL permanente, HTTPS et les sauvegardes hors site en dépendent. La localisation a un impact juridique (RGPD si données de clients européens, loi ivoirienne sur les données personnelles, conservation des données de facturation).
**Ce que je dois savoir.**
1. Nom de domaine acheté (lequel, et qui gère le DNS) ?
2. Hébergeur préféré (Hetzner Allemagne/Finlande, OVH, autre) et pays du serveur ?
3. Le serveur est-il déjà commandé (accès SSH) ?
4. Contrainte de localisation des données (ex. tout en Côte d'Ivoire) ?
5. Destinataire des sauvegardes hors site (S3 compatible, Backblaze B2, autre serveur) ?
**Si pas de réponse.** Développement local + staging sur un serveur temporaire ; P1 non déclarable terminée (pas d'URL permanente).
**Proposition par défaut.** Hetzner CX32 (Allemagne) + domaine `toutenun-business.com` + sauvegardes chiffrées chez Backblaze B2. Aucune donnée client transmise hors site autrement que par la sauvegarde chiffrée.

### Q5 — Quel fournisseur d'IA pour MIMI ?
**Pourquoi.** Cela détermine le coût, la qualité en français, et surtout **ce qui sortira de votre infrastructure** (des extraits de vos données agrégées et les messages). Ce choix n'arrête pas la P1, mais je préfère l'architecturer maintenant (interface `LlmProvider`).
**Ce que je dois savoir.**
1. Fournisseur préféré (OpenAI, Anthropic, Google, modèle auto-hébergé) ?
2. Acceptez-vous que des **données agrégées** (chiffres de ventes, noms de produits) soient envoyées à un service tiers ? Si non, faut-il prévoir un modèle local ?
3. Budget mensuel maximal pour MIMI (plafond dur configurable) ?
4. Clé API déjà disponible ?
**Si pas de réponse.** Aucune dépendance installée avant la P5 ; l'adaptateur reste neutre.
**Proposition par défaut.** Adaptateur multi-fournisseur, Claude ou GPT pour le raisonnement, plafond de coût mensuel paramétrable, **aucune donnée nominative client** envoyée, et un mode « sans IA » où MIMI est absente.

### Q6 — Règles de commission et de frais (le cœur du financier)
**Pourquoi.** Sans vos taux, toute marge affichée serait inventée. C'est la question la plus importante pour la crédibilité de l'application.
**Ce que je dois savoir.**
1. Taux de commission **par catégorie** (et par pays si différents). Une capture de votre grille Jumia suffit.
2. Assiette : commission calculée sur le prix de vente seul, ou prix + frais de port ? La remise Jumia est-elle supportée par vous ou par la plateforme ?
3. Frais de livraison : qui les paie (client / vous / Jumia) ? Y a-t-il des frais de livraison prélevés par Jumia différents de `shipmentFee` du relevé ?
4. Frais d'importation : montant forfaitaire, pourcentage, ou frais réels par conteneur ? Comment les répartir (par unité ou au prorata de la valeur) ?
5. Votre définition du **bénéfice confirmé** : ce que Jumia verse (relevé) moins coûts d'achat, ou faut-il aussi déduire les dépenses de structure ? Sur quelle période (mensuelle ?) ?
6. Les prix Jumia sont-ils TTC ou HT pour vous, et quel taux de TVA s'applique par pays ?
**Si pas de réponse.** Les écrans affichent « — » pour toute marge, avec la mention « commissions non paramétrées ». Je n'affiche jamais une marge calculée sur un taux supposé sans l'étiqueter « estimée » avec l'hypothèse visible.
**Proposition par défaut.** Aucune : ce sont vos règles. `docs/formules-financieres.md` contient une proposition structurée à corriger/valider.

---

## B. Questions issues de la conception (Phase 0)

| # | Question | Pourquoi ça compte | Proposition par défaut |
|---|---|---|---|
| Q7 | **Une boutique = (boutique Jumia × pays)** : confirmez-vous ? Si un même compte Vendor Center gère une boutique multi-pays, doit-elle apparaître comme une carte ou comme plusieurs ? | Détermine toute la clé `shop_id`, le sélecteur et les agrégats | Une ligne par couple (boutique Jumia, business client/pays). Un pays = une boutique dans l'interface |
| Q8 | Une **seule organisation** (vous) ou un produit **multi-clients** (SaaS revendable) ? | Si SaaS : ajout d'un niveau `organization_id`, facturation, isolation renforcée → décision à prendre **maintenant**, coûteuse après | Mono-organisation. Le schéma garde la porte ouverte (`organization_id` ajoutable) sans la complexité |
| Q9 | **Factures officielles Jumia** : savez-vous si vos factures sont téléchargeables depuis le Vendor Center ? Un endpoint existe-t-il côté Jumia (hors spec publique) ? | L'API publique n'expose **aucune** facture. Sans réponse, l'écran Factures affichera « Indisponible via l'API » + import manuel | Import manuel archivé avec empreinte, `is_official = true` ; question posée à votre account manager |
| Q10 | **Coût d'achat** : par produit ou par lot (coût moyen pondéré) ? | Change les formules de marge et le schéma de coûts | Coût par produit historisé (`cost_history`), avec support du coût moyen pondéré plus tard si besoin |
| Q11 | **Devise de référence** pour la consolidation | Somme multi-devises sans référence = chiffre faux | XOF, avec axe USD secondaire (Jumia expose `totalAmount` en USD) |
| Q12 | **Données personnelles clients** (adresses de livraison) : need-to-have ou à masquer ? | Impact RGPD/loi locale, permissions, exports | Stockées, accès restreint par permission `orders:read:pii`, jamais dans les exports par défaut |
| Q13 | **Rétentions** : audit 5 ans ? logs 90 j ? documents officiels illimités ? | Impact volumétrie et politique de sauvegarde | Audit 5 ans, logs 90 j, documents officiels sans suppression |
| Q14 | **Sentry ou équivalent** pour le suivi d'erreurs externe ? | Confort d'exploitation vs dépendance externe | Non en P1 (journal interne + `system_events`), ajoutable en une heure |
| Q15 | **Sauvegardes** : RPO 24 h suffit-il, ou faut-il 15 min (archivage WAL) ? | Coût d'exploitation et complexité | RPO 24 h + dump quotidien chiffré ; WAL si vous jugez l'enjeu critique |
| Q16 | **2FA** : obligatoire aussi pour Comptable et Assistant ? | Sécurité vs friction | Obligatoire Propriétaire + Gestionnaire ; recommandée (non imposée) aux autres |
| Q17 | **Politique de mot de passe** et rotation des accès : contraintes internes ? | Paramétrage de la P1 | 12 caractères min, pas de rotation forcée, verrouillage après 5 échecs |
| Q18 | **Emails transactionnels** : adresse d'envoi, fournisseur SMTP ? | Notifications critiques et invitations | SMTP générique, expéditeur `no-reply@<domaine>` |
| Q19 | **Langue** de l'interface : français uniquement, ou prévoir l'anglais (boutiques NG/GH/KE) ? | Architecture i18n à poser tôt si besoin | Français uniquement, libellés centralisés pour permettre l'ajout ultérieur |
| Q20 | **Qui utilise l'application au quotidien** et avec quels rôles ? (nombre, appareil principal : téléphone ou ordinateur) | Priorités d'écrans et de performance | 5 utilisateurs, ordinateur principal, téléphone pour consultation |

---

## C. Formulaire de réponse (le plus simple)

```
Q1  pays :
Q2  accès Vendor Center (oui/non, application créée, staging) :
Q3  boutiques / commandes par mois / produits / utilisateurs :
Q4  domaine / hébergeur / serveur prêt :
Q5  fournisseur IA / budget / clé disponible :
Q6  commissions (grille joint ?) / assiette / remise / frais / import / TVA :
Q7  granularité boutique :
Q8  mono-organisation ou SaaS :
Q9  factures Jumia depuis le Vendor Center :
Q10 coût d'achat :
Q11 devise de référence :
Q12 données personnelles :
Q13 rétentions :
Q14 Sentry :
Q15 RPO :
Q16 2FA périmètre :
Q17 mot de passe :
Q18 SMTP :
Q19 langue :
Q20 utilisateurs quotidiens :
```

Dès réception, je mets à jour les documents concernés (ils sont versionnés), et je démarre la P1 au lot L1.

---

## D. Ce que je ne ferai pas sans réponse explicite

- Afficher une marge calculée sur un taux que vous n'avez pas fourni (je l'étiquette « estimée » avec l'hypothèse visible, ou j'affiche « — »).
- Présenter un document interne comme une facture Jumia.
- Activer une écriture chez Jumia (prix, stock, publication) sans votre validation, même en cas de demande ultérieure de MIMI.
- Créer des tables ou des écrans « au cas où » : chaque table existe parce qu'un module l'utilise, chaque écran parce qu'il fonctionne.
