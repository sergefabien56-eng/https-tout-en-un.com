# TOUT EN UN BUSINESS MANAGER — documentation de conception

> **Phase 0 — cadrage et conception.** Aucun code applicatif n'a été écrit, conformément au prompt maître.
> État : **en attente de votre validation** pour démarrer la Phase 1.
> Date : 2026-11-10.

---

## 1. Ce qui est livré

| Document | Contenu | À valider |
|---|---|---|
| [`architecture.md`](architecture.md) | 15 ADR justifiés, découpage en 18 modules, flux de données, environnements, migrations/rollback, sécurité, performance, refus explicites | ⬜ |
| [`database.md`](database.md) | conventions, modèle multi-boutiques, diagramme ER, schéma table par table (contraintes, index, unicités), RLS et garde-fous, volumétrie, seeds, 9 migrations P1 | ⬜ |
| [`jumia-integration.md`](jumia-integration.md) | étude de l'**API officielle** : OAuth2 + rotation des jetons, limites de débit, inventaire complet des endpoints, ce qui est confirmé / inconnu / impossible, stratégie de synchronisation, factures, dédoublonnage | ⬜ |
| [`formules-financieres.md`](formules-financieres.md) | conventions monétaires, 5 familles de formules, paramètres à renseigner, 18 cas de test chiffrés, zones volontairement non définies | ⬜ **validation requise avant tout code financier** |
| [`design-system.md`](design-system.md) | jetons (clair/sombre), typographie, 20 composants avec états, navigation, barre supérieure, écrans, visualisation, accessibilité | ⬜ |
| [`maquettes/maquettes.html`](maquettes/maquettes.html) | maquettes visuelles : **vue bureau** (tableau de bord, menu réduit en icônes, écran de données dense avec panneau de détail), thème sombre + Jumia Connect, cartes de boutiques, états d'interface, vue mobile 375 px | ⬜ |
| [`phase-1-plan.md`](phase-1-plan.md) | 12 lots chiffrés, jalons J1–J4, plan de tests, risques, application de la Définition de Terminé, scénario de démonstration, annexes (SKU, variables d'environnement, arborescence) | ⬜ |
| [`questions-ouvertes.md`](questions-ouvertes.md) | 20 questions, avec impact et proposition par défaut, plus un formulaire de réponse | ⬜ **réponses attendues** |
| [`reference/jumia-openapi/`](reference/jumia-openapi/) | archive de la spécification OpenAPI officielle (33 fichiers) + note de sourcing | preuve |

## 2. Les cinq décisions structurantes à valider en priorité

1. **Une « boutique » = un couple (boutique Jumia × pays)** — sinon stock, prix et devises se mélangent.
2. **Vendor Center API uniquement** (OAuth2), pas l'ancienne Seller Center API à signature HMAC.
3. **Le stock Jumia remplace, il ne s'additionne jamais** ; nos mouvements sont une comptabilité séparée, avec écart affiché et jamais corrigé automatiquement.
4. **Bénéfice estimé** (calculé par commande, taux hypothétiques) et **bénéfice confirmé** (relevés de paiement Jumia) sont deux objets distincts, jamais fusionnés dans un même chiffre.
5. **Aucune facture officielle n'existe dans l'API Jumia** : l'application l'affichera « Indisponible » et proposera l'archivage d'un document importé du Vendor Center, jamais un document fabriqué.

## 3. Preuves techniques déjà produites

- Spécification Jumia téléchargée, archivée et citée champ par champ (`reference/jumia-openapi/`, 328 Ko, 33 fichiers).
- Endpoints, enums de statuts, paramètres de pagination et limites de débit relevés **dans la spécification**, pas dans un souvenir : voir les tableaux du §3–4 de `jumia-integration.md`.
- Trois affirmations fréquemment fausses y sont corrigées noir sur blanc : les refresh tokens sont **rotatifs** (un seul renouvellement à la fois), il n'existe **pas** de statut de commande `ALL`, et les filtres de date sont limités à **3 mois**.

## 4. Ce qui est explicitement *impossible* sans vous

| Sujet | Bloquant pour |
|---|---|
| Accès API Jumia réel (application Self Authorization + refresh token) | Phase 2 testable |
| Grille de commissions et frais | tout chiffre de marge |
| Nom de domaine + serveur | URL permanente, HTTPS, sauvegardes hors site (fin de P1) |
| SMTP | notifications critiques, invitations |
| Réponses aux questions 1 à 6 | paramétrage définitif (pays, devises, TVA) |

## 5. Prochaine étape

1. Vous relisez les 6 documents (environ 45 min de lecture, ou 10 min pour les décisions prioritaires du §2).
2. Vous répondez aux questions via le formulaire de `questions-ouvertes.md`.
3. Vous validez (ou corrigez) `formules-financieres.md`.
4. Vous écrivez : « Phase 0 validée. Lance la Phase 1 » — je démarre au lot L1 et je m'arrête au jalon J1 pour démonstration.

Tant que la Phase 0 n'est pas validée, je n'écris pas de code applicatif.
