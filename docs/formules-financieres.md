# Formules financières — proposition à valider

> Phase 0. **Document de référence contractuel.** Aucune ligne de code financier ne sera écrite avant votre validation de ce document. Une fois validé, il devient la source de vérité : le module `finance` l'implémente tel quel, et tout écart est un bug (les tests cités en §9 le prouvent).
> Montants en unités mineures. Toute conversion de devise est explicite, datée et affichée.

---

## 1. Vocabulaire et conventions

| Terme | Définition retenue |
|---|---|
| **PV client** (`paidPrice`) | Montant effectivement payé par le client pour l'article, hors frais de port, **remises Jumia déduites** (champ Jumia `paidPrice`). C'est la base de tous les calculs de revenu. |
| **Prix affiché** (`itemPrice`) | Prix catalogue avant remise. Sert uniquement à mesurer l'effort promotionnel. |
| **Port client** (`shippingAmount`) | Frais de port payés par le client. Revenu ou refacturation selon le relevé — voir §5. |
| **Revenu net Jumia** | Ce que Jumia nous verse réellement pour une période : issu du **relevé de paiement** (`itemRevenue`, `otherRevenueTotal`, `feesTotal`, `refunds`, `feesOnRefundsTotal`). C'est la seule valeur **confirmée**. |
| **COGS** | Coût d'achat unitaire du produit **en vigueur à la date de la commande** (`cost_history.effective_from`), frais d'importation alloués inclus s'ils sont paramétrés ainsi. |
| **Marge estimée** | Calculée commande par commande, avec des taux de commission **hypothétiques**. Étiquette visible : *Estimée*. |
| **Bénéfice confirmé** | Calculé à partir des relevés Jumia, après clôture de la période. Étiquette visible : *Confirmé*. |
| **Bénéfice / perte** | Revenus − coûts. **Distinct** de la trésorerie (voir §6). |
| **Exposant de devise** | Nombre de décimales : `XOF`, `XAF`, `UGX` → **0** ; `NGN`, `KES`, `GHS`, `ZAR`, `MAD`, `DZD`, `EGP`, `TND`, `USD`, `EUR` → **2**. Table unique dans `money.ts`. |
| **Inconnu** | Affiché **« — »**, jamais `0`. Un montant non calculable (`COGS` manquant, taux inconnu) rend le résultat **indisponible**, pas nul. |

**Règle d'or.** Un agrégat n'est affiché que si **tous** ses composants sont disponibles ; sinon il est affiché avec une mention « incomplet » et la liste des éléments manquants (une valeur partielle présentée comme complète est un mensonge).

---

## 2. Unités mineures, arrondis, allocation

### 2.1 Conversion depuis l'API
L'API renvoie des nombres JSON (`double`). Conversion unique, dans `money.fromApiAmount(value, currency)` :
```
minor = round_half_up(value × 10^exposant)
```
- `round_half_up` (et non le `round` bancaire de JavaScript) ;
- conversion faite sur la **chaîne décimale** fournie (`String(value)` avec `toPrecision` sûr) pour éviter les artefacts binaires (`0.145 → 14.5 → 15`) ;
- le `raw_payload` JSONB conserve la valeur d'origine ;
- un écart de conversion est détectable : `fromApiAmount` est testée sur 10 000 valeurs aléatoires avec `value == minor / 10^exposant ± 1 unité mineure`.

### 2.2 Allocation d'un montant global sur des lignes (méthode du plus fort reste)
Utilisée pour répartir un montant **agrégé** (frais du relevé, frais d'importation, dépenses globales) sur des lignes, **sans jamais perdre ni créer d'unité** :
```
t = montant total (entier mineur)
poids_i = base d'allocation de la ligne i (valeur ou quantité)
exact_i = t × poids_i / Σ poids
alloc_i = floor(exact_i)
reste = t − Σ alloc_i
distribuer +1 aux `reste` lignes ayant les plus grandes parties fractionnaires
  (égalité tranchée par order_item_id croissant, pour la reproductibilité)
```
**Invariant testé** : `Σ alloc_i == t` **exactement**, quel que soit `t` et le nombre de lignes.

### 2.3 Opérations interdites
- Additionner deux montants de devises différentes **sans** `fx_rates` explicite ;
- Stocker un `float` pour un montant ;
- Utiliser un taux de change « du jour » pour réévaluer une marge passée (la marge historique est figée avec son taux ; seule la vue consolidée du jour utilise un taux courant, et elle l'affiche).

---

## 3. Paramètres à valider (ce sont vos règles, pas les miennes)

Tous ces paramètres sont **configurables**, versionnés et datés (`finance_parameters` : `code`, `value`, `effective_from`, `set_by`, `comment`). Aucun n'est codé en dur.

| Code | Signification | Valeur proposée par défaut | Votre décision |
|---|---|---|---|
| `COMMISSION_RATES` | Taux de commission Jumia **par catégorie et par pays** | table vide au départ → tout est « indisponible » tant que non saisi | ❓ **à fournir** |
| `COMMISSION_BASIS` | Assiette de la commission | `paidPrice + shippingAmount` (hypothèse) | ❓ |
| `COMMISSION_ROUNDING` | Arrondi de la commission | arrondi à l'unité mineure, `half_up` | ❓ |
| `VAT_RATE` | TVA par pays/catégorie | `CI: 18 %`, `NG: 7.5 %`, `KE: 16 %`, `MA: 20 %`, `EG: 14 %`, `GH: 15 %`, `SN: 18 %`, `TN: 19 %` (**à confirmer, non utilisé pour le calcul de marge si vos prix sont TTC**) | ❓ |
| `VAT_MODE` | Les prix Jumia sont-ils TTC ou HT ? | `TTC` (hypothèse) | ❓ |
| `IMPORT_COST_ALLOCATION` | Répartition des frais d'importation | `per_unit` (par unité) ou `per_value` | ❓ |
| `FULFILLMENT_FEE` | Frais de traitement par article (si Jumia en prélève hors `feesTotal`) | `0` tant que non constaté | ❓ |
| `RETURN_LOSS_RATE` | Provision de perte sur retour | `0` (pas de provision tant que non mesuré) | ❓ |
| `REFERENCE_CURRENCY` | Devise de consolidation | `XOF` (+ axe USD secondaire) | ❓ |
| `MARGIN_ALERT_THRESHOLD` | Seuil d'alerte de marge nette | `10 %` | ❓ |
| `CONFIRMED_DELAY_DAYS` | Délai avant de considérer un relevé comme définitif | `7 j` après `paid = true` | ❓ |

---

## 4. Formule 1 — Revenu net estimé d'une ligne de commande

Pour une ligne `i` d'une commande (devise de la boutique) :

```
revenu_brut_i        = paidPrice_i + shippingAmount_i
commission_est_i     = commissionRate(catégorie_i, pays, date_commande) × assiette_i
                       avec assiette_i = paidPrice_i + shippingAmount_i   (COMMISSION_BASIS)
frais_jumia_est_i    = commission_est_i + fulfillmentFee × quantité_i
revenu_net_est_i     = revenu_brut_i − frais_jumia_est_i
```

Puis :

```
marge_brute_est_i    = revenu_net_est_i − COGS_i
marge_nette_est_i    = marge_brute_est_i − quote_part_frais_fixes_i
taux_marge_est_i     = marge_nette_est_i / revenu_brut_i
```

où :
```
COGS_i = unitCost(product_i, date_commande_i) × quantité_i
       + quote_part_frais_import_i          (si IMPORT_COST_ALLOCATION ≠ aucune)
quote_part_frais_fixes_i = allocation du mois (dépenses opérationnelles) au prorata
                           du revenu_brut de la ligne (§2.2)
```

**Statut de disponibilité** de chaque ligne :

| Condition | Résultat affiché |
|---|---|
| `rate` de commission connu + `COGS` connu | **Marge estimée** (chiffre + étiquette « estimée ») |
| `rate` inconnu pour cette catégorie | `revenu_net_est = —` ; la ligne est listée dans « commissions non paramétrées » |
| `COGS` inconnu | `marge_est = —` avec lien « enregistrer un coût d'achat » |
| Article annulé (`CANCELED`) | Revenu **0** (pas une marge négative) ; les frais éventuels restent imputés s'ils sont confirmés |
| Article retourné (`RETURNED`) | Revenu et COGS neutralisés ; la perte réelle provient du relevé (§5) ; provision `RETURN_LOSS_RATE` seulement si activée |

**Exemple chiffré (à valider comme cas de test).** Boutique CI, XOF (exposant 0), article à 25 000 XOF, port payé 1 500 XOF, remise Jumia 2 000 XOF → `paidPrice = 23 000`, `shippingAmount = 1 500`. Taux de commission 12 % sur `paidPrice + shippingAmount` = 2 940. Frais de traitement 0. COGS = 15 000. Frais fixes alloués = 500.
```
revenu_brut  = 23 000 + 1 500 = 24 500
commission   = 12 % × 24 500 = 2 940
revenu_net   = 24 500 − 2 940 = 21 560
marge_brute  = 21 560 − 15 000 = 6 560
marge_nette  = 6 560 − 500 = 6 060
taux_marge   = 6 060 / 24 500 = 24,73 %
```
*⚠️ Hypothèse décisive : qui supporte la remise de 2 000 ? Si c'est le vendeur, la formule est correcte. Si Jumia la rembourse (voir `subsidy` dans le relevé), le revenu doit être recalculé sur `itemPrice`. C'est la question n°3 de `docs/questions-ouvertes.md`.*

---

## 5. Formule 2 — Revenu net **confirmé** d'une période (source : relevé de paiement)

Le relevé Jumia est agrégé par boutique et par période. On **n'invente aucune formule** : on enregistre les champs tels quels et on documente les seules identités que la spécification officielle énonce.

**Champs du relevé (unités mineures après conversion) :**
`openingBalance`, `itemRevenue`, `shipmentFee`, `shipmentFeeCredit`, `otherRevenueTotal`, `feesTotal`, `subtotal1`, `refunds`, `feesOnRefundsTotal`, `subtotal2`, `closingBalance`, `guaranteeDeposit`, `payout.amount`, `paid`, `paymentReference`, `subsidy`, `subsidyRefund`.

**Identités explicitement documentées par Jumia [C]** :
```
subtotal1 = itemRevenue + otherRevenueTotal − feesTotal
subtotal2 = subtotal1 − refunds
```
**Identités *non* documentées → hypothèses à vérifier sur relevés réels [I] :**
```
H1 : closingBalance = openingBalance + subtotal2 − feesOnRefundsTotal          (à confirmer)
H2 : closingBalance = openingBalance + subtotal2 − guaranteeDeposit − payout.amount   (à confirmer)
H3 : shipmentFeeCredit est déjà inclus dans otherRevenueTotal                  (à confirmer)
```
**Conséquence de méthode.** L'application affiche les champs du relevé **tels quels** (aucune recomposition), et un job de vérification teste H1/H2/H3 sur chaque relevé reçu. Si une identité est fausse, on obtient un écart tracé dans `reconciliation_findings` — pas un chiffre faux présenté comme juste.

**Bénéfice confirmé d'une période** (notre définition, à valider) :
```
revenus_confirmés      = Σ itemRevenue + Σ otherRevenueTotal + Σ shipmentFeeCredit(?)   → H3 à trancher
coûts_confirmés        = Σ feesTotal + Σ refunds + Σ feesOnRefundsTotal
COGS_période           = Σ COGS des articles des relevés (rapprochement par commande)
dépenses_opérationnelles = dépenses saisies sur la période (hors achats déjà comptés en COGS)
bénéfice_confirmé      = revenus_confirmés − coûts_confirmés − COGS_période − dépenses_opérationnelles
```
`subsidy` / `subsidyRefund` : traités comme **revenus** (subventions Jumia) si `subsidy > 0`, et affichés séparément pour ne pas gonfler artificiellement la marge commerciale.
`guaranteeDeposit` : **jamais** dans le bénéfice — c'est un dépôt de garantie (trésorerie).

**Rapprochement commande ↔ relevé.** Le relevé n'étant pas détaillé par commande, le lien se fait par période + boutique. Toute répartition par commande est donc **estimée** et doit être présentée comme telle. On n'écrit jamais « commission confirmée de la commande X ».

---

## 6. Formule 3 — Trésorerie (à ne pas confondre avec le bénéfice)

```
encaissements_confirmés = Σ payout.amount des relevés avec paid = true
créance_estimée         = Σ subtotal2 des relevés avec paid = false
variation_garantie      = Σ guaranteeDeposit
trésorerie_nette        = encaissements_confirmés + créance_estimée − variation_garantie − décaissements (dépenses payées, achats)
```
Le tableau de bord affiche **deux blocs séparés** : « Bénéfice » et « Trésorerie ». Un bénéfice positif avec une trésorerie négative est une situation normale (créances) et doit être lisible.

---

## 7. Formule 4 — Indicateurs dérivés

### 7.1 Chiffre d'affaires (définitions)
| Indicateur | Formule | Étiquette |
|---|---|---|
| CA commandé | `Σ paidPrice` des items non annulés, sur la date de commande | Réel (API) |
| **CA livré** | `Σ paidPrice` des items `DELIVERED` **moins** ceux passés `RETURNED`, sur la date de livraison si connue, sinon date de commande | Réel (API) |
| CA encaissé | `Σ itemRevenue` des relevés `paid = true` | **Confirmé** |
CA affiché par défaut = **CA livré** (le plus prudent), avec le CA commandé en second.

### 7.2 Taux et ratios
```
taux_annulation   = items CANCELED / items totaux                    (par boutique, période)
taux_retour       = items RETURNED / items DELIVERED
panier_moyen      = CA livré / nombre de commandes livrées
marge_par_produit = Σ marge_nette_est des lignes de ce SKU / Σ revenu_brut
rotation_stock    = unités vendues (30 j) / stock moyen disponible
couverture_stock  = stock disponible / ventes moyennes journalières (jours)
```

### 7.3 Valeur du stock
```
valeur_stock = Σ (external_qty × dernier_coût_connu)
```
- `external_qty = NULL` → **exclu** du total, ligne listée en « stock inconnu » ;
- `dernier_coût_connu = NULL` → ligne listée en « coût manquant » ;
- jamais de valorisation au prix de vente (ce serait un CA potentiel, pas une valeur d'actif).

### 7.4 Prix minimum rentable (**proposition**)
```
p_min = (COGS + frais_fixes_unitaires) / (1 − taux_commission − taux_frais_variables)
```
**Exemple** : COGS 15 000, frais fixes unitaires 500, commission 12 %, frais variables 3 % →
`p_min = 15 500 / (1 − 0,15) = 18 235,29 → 18 236 XOF` (arrondi **au supérieur** à l'unité mineure, car un prix plancher s'arrondit vers le haut).
Le prix minimum affiché distingue : **seuil de perte** (`p_min`) et **prix cible** à la marge souhaitée `m_cible` :
```
p_cible = (COGS + frais_fixes_unitaires) / (1 − taux_commission − taux_frais_variables − m_cible)
```
Aucune modification de prix chez Jumia n'est possible sans votre validation (exigence du prompt) : le module produit une **proposition**, jamais une écriture directe.

### 7.5 Commission estimée « à rebours » (contrôle de cohérence)
Quand un relevé existe, on compare :
```
commission_implicite_période = (itemRevenue + otherRevenueTotal − subtotal1) / (revenus de la période)
```
et on la compare au taux paramétré. Un écart > 1 point déclenche une alerte « le taux de commission paramétré ne correspond plus au réel » — c'est ainsi que vos taux restent à jour sans les deviner.

---

## 8. Multi-devises

1. Toute ligne porte sa **devise d'origine** (`currency`) et sa valeur en unités mineures de cette devise.
2. Une vue consolidée exige un taux : `fx_rates(base=devise_ligne, quote=REFERENCE_CURRENCY, effective_on ≤ date)` — le taux le plus récent **antérieur ou égal** à la date de la transaction.
3. Le taux retenu est **affiché** avec sa date et sa source, dans l'infobulle de chaque total consolidé.
4. Aucune conversion pour une période si un taux manque : le total est marqué **incomplet** et la devise concernée est listée.
5. Le taux ne modifie jamais un montant stocké : la conversion est calculée à l'affichage/à l'export et son résultat est étiqueté `converti`.
6. Deux boutiques du même pays partagent la même devise : leur consolidation est **exacte**, sans taux.

---

## 9. Tests exigés sur ces formules (écrits avant l'implémentation)

| # | Cas de test | Attendu |
|---|---|---|
| F-01 | `fromApiAmount("0.145", "USD")` | `15` (half-up, pas 14) |
| F-02 | `fromApiAmount(1234.565, "XOF")` avec exposant 0 | `1235` |
| F-03 | Allocation de 100 unités sur 3 lignes de poids égaux | `[34, 33, 33]`, somme = 100 |
| F-04 | Allocation de 7 unités sur 5 lignes | somme = 7 exactement, distribution reproductible |
| F-05 | Exemple du §4 | `revenu_net = 21 560`, `marge_nette = 6 060`, `taux = 24,73 %` |
| F-06 | Ligne avec COGS manquant | marge = **indisponible** (« — »), jamais 0 ; la ligne apparaît dans « coûts manquants » |
| F-07 | Ligne avec catégorie sans taux de commission | revenu net = indisponible, ligne listée dans « commissions non paramétrées » |
| F-08 | Item `CANCELED` | revenu = 0, pas de marge négative parasite |
| F-09 | Item `RETURNED` | revenu et COGS neutralisés, perte issue du relevé |
| F-10 | Relevé réel (fixture anonymisée) | `subtotal1` et `subtotal2` recalculés = valeurs Jumia **à l'unité près**; H1/H2/H3 testées et résultat consigné |
| F-11 | Somme des boutiques vs vue consolidée (même devise) | égalité exacte |
| F-12 | Consolidation XOF + NGN sans taux | total marqué incomplet, pas de chiffre |
| F-13 | Consolidation avec taux daté | valeur exacte au taux près, taux affiché |
| F-14 | `p_min` de l'exemple | `18 236` (arrondi supérieur) |
| F-15 | Commission implicite vs paramétrée, écart 1,5 pt | alerte créée |
| F-16 | Ordre d'application : marge d'une commande de mars recalculée en novembre | inchangée (COGS et taux de la date de commande) |
| F-17 | Propriété aléatoire : 10 000 allocations aléatoires | `Σ alloc = total` toujours |
| F-18 | Aucune fonction du module `finance` n'accepte un `number` décimal en entrée (test de typage + lint) | échec de compilation si tenté |

---

## 10. Ce qui reste explicitement non défini (et ne sera pas inventé)

1. **Taux de commission réels** par catégorie/pays → vos chiffres, ou relevés réels pour les déduire.
2. **Support de la remise Jumia** (vendeur ou plateforme) → question n°3.
3. **TVA** : régime applicable par pays et mode TTC/HT des prix Jumia → votre comptable.
4. **Sens exact de `feesTotal`** : inclut-il la commission, les frais de traitement, la logistique ? La spec ne le détaille pas → à déduire des relevés réels avant de bâtir l'estimation sur cette base.
5. **Traitement des `FAILED`** (échec de livraison) : refacturation de frais ? à constater sur relevés.
6. **Politique de provision** sur retours et créances douteuses → votre décision, désactivée par défaut.

**Tant que 1 à 4 ne sont pas tranchés**, l'application affiche des **estimations étiquetées** et des **« — »**, jamais des chiffres inventés. Les écrans financiers précisent la source de chaque montant (API / relevé / calcul / saisie).
