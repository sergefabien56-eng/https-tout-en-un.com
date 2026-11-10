# Design system et maquettes — TOUT EN UN BUSINESS MANAGER

> Phase 0. Les maquettes statiques sont dans `docs/maquettes/maquettes.html` (ouvrir dans le navigateur ou via l'aperçu du fichier). Ce sont des **maquettes**, pas l'application : aucune donnée affichée n'est réelle, et rien n'y est fonctionnel. Elles servent à valider la direction visuelle avant d'écrire un composant.

---

## 1. Principes de conception

1. **La donnée avant la décoration.** Aucun graphique sans série réelle derrière. Aucune carte sans valeur. Une zone vide affiche un état vide utile, pas une illustration.
2. **Chaque chiffre dit d'où il vient.** Trois pastilles standard, présentes partout où un montant apparaît : **Réelle** (vert), **Estimée** (orange, avec la mention de l'hypothèse au survol), **Indisponible** (« — », gris). Jamais de `0` pour une donnée absente.
3. **La fraîcheur est une information.** Chaque bloc de données affiche « Actualisé il y a X min » ; si une boutique du périmètre est en erreur ou en sync partielle, le total porte un bandeau **« Totaux incomplets »** cliquable vers le détail.
4. **Deux niveaux de navigation, pas trois.** Un module s'ouvre, une page s'affiche. Pas de sous-sous-menu.
5. **Sobriété premium.** Bordures discrètes, ombres légères, un seul accent bleu, l'orange réservé à l'action importante et à l'avertissement. Aucune couleur décorative.
6. **Accessible par défaut.** Clavier complet, focus visible, contrastes AA, cibles 44 px sur mobile, `prefers-reduced-motion` respecté.

---

## 2. Jetons de design (variables CSS)

Implémentation : `src/ui/styles/tokens.css`, consommée par Tailwind (`@theme`). **Aucune valeur de couleur en dur dans un composant** (règle ESLint `no-restricted-syntax` sur les hex dans `src/ui`).

### 2.1 Couleurs de marque

| Jeton | Clair | Sombre | Usage |
|---|---|---|---|
| `--brand-navy` | `#101C39` | `#0B142B` | fond de la sidebar, titres forts, logo |
| `--brand-blue` | `#1765F5` | `#4C86FF` | action principale, lien, focus, sélection |
| `--brand-blue-hover` | `#1154D4` | `#6B9CFF` | survol |
| `--brand-orange` | `#F57C1F` | `#FF9445` | action importante, avertissement, « Estimée » |
| `--brand-green` | `#12855B` | `#2FB37E` | statut positif, « Réelle », « Confirmé » |
| `--brand-red` | `#C4342B` | `#F26B62` | erreur, rupture, destructive |

### 2.2 Surfaces et texte

| Jeton | Clair | Sombre |
|---|---|---|
| `--bg-app` | `#F6F8FB` | `#0A1020` |
| `--bg-surface` | `#FFFFFF` | `#131B2E` |
| `--bg-surface-2` | `#F1F4F9` | `#1A2338` |
| `--bg-sidebar` | `--brand-navy` `#101C39` | `#0B142B` |
| `--border-subtle` | `#E3E8F0` | `#243049` |
| `--border-strong` | `#C9D2E0` | `#33415E` |
| `--text-primary` | `#101C39` | `#EDF1F8` |
| `--text-secondary` | `#4C5A75` | `#A9B4C9` |
| `--text-muted` | `#6B7891` | `#8593AD` |
| `--text-inverse` | `#FFFFFF` | `#0A1020` |
| `--focus-ring` | `#1765F5` (2 px + offset 2 px) | `#4C86FF` |

Contrastes vérifiés : `--text-primary` / `--bg-surface` = 15,3:1 ; `--text-secondary` / `--bg-surface` = 6,9:1 ; blanc / `--brand-blue` = 4,8:1 ; blanc / `--brand-orange` = 3,1:1 → **l'orange n'est jamais utilisé pour du texte blanc sur fond orange en dessous de 18 px gras** (on utilise `#101C39` sur orange, 7,7:1, ou l'orange en texte sur fond clair : `#F57C1F` sur blanc = 3,0:1, donc réservé aux icônes/pastilles avec libellé adjacent).

### 2.3 Typographie

- **Inter** (variable, auto-hébergée `woff2`, `font-display: swap`) ; repli système `ui-sans-serif` ; **chiffres tabulaires activés** (`font-feature-settings: "tnum"`) sur tous les tableaux et montants.
- Échelle : `display 28/34`, `h1 22/28`, `h2 18/24`, `h3 16/22`, `body 14/20`, `small 13/18`, `micro 12/16`.
- Montants : `14/20` semi-gras, `tnum`, séparateur d'espace fine insécable, devise suffixée (`25 000 XOF`), négatifs en rouge avec signe moins typographique `−`.
- Aucun texte justifié, aucune majuscule sur des phrases entières (sauf pastilles `< 12 px`, `letter-spacing: .04em`).

### 2.4 Espacement, rayons, ombres

- Espacements : échelle 4 px (`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`). Gouttière de page : 24 px (desktop), 16 px (mobile).
- Rayons : `--radius-sm 6px` (pastilles, champs), `--radius-md 10px` (boutons, cartes), `--radius-lg 14px` (panneaux, modales).
- Ombres : `--shadow-sm 0 1px 2px rgba(16,28,57,.06)`, `--shadow-md 0 4px 16px rgba(16,28,57,.08)`, `--shadow-lg 0 12px 32px rgba(16,28,57,.14)`. En thème sombre, les ombres sont remplacées par des bordures (`--border-subtle`) plus marquées.
- Bordures : 1 px `--border-subtle` par défaut ; `--border-strong` au survol/focus.

### 2.5 Mouvement

`--motion-fast 120ms`, `--motion-base 180ms`, `--motion-slow 240ms`, courbe `cubic-bezier(.2,.8,.2,1)`. Sous `prefers-reduced-motion: reduce`, toutes les transitions de position/échelle passent à `0ms` et seules les transitions d'opacité restent (120 ms).

---

## 3. Composants (inventaire de la P1)

| Composant | États obligatoires | Notes |
|---|---|---|
| `Button` | default, hover, active, focus-visible, disabled, loading | variantes `primary` (bleu), `accent` (orange), `ghost`, `danger` ; tailles `sm 32`, `md 40`, `lg 48` ; `loading` désactive et conserve la largeur |
| `IconButton` | idem + infobulle obligatoire | cible ≥ 40 px |
| `Input`, `Textarea`, `Select`, `Combobox` | default, focus, filled, error, disabled, readOnly | erreur reliée par `aria-describedby`, message sous le champ |
| `Checkbox`, `Radio`, `Switch` | + focus, disabled, indeterminate | |
| `FieldLabel` / `FieldError` / `FieldHint` | — | un seul endroit pour l'accessibilité des formulaires |
| `Card` | default, interactive, selected | en-tête/pied optionnels |
| `StatCard` | valeur, unité, variation, **pastille de provenance**, fraîcheur, état `incomplet`, squelette | cœur du tableau de bord |
| `DataTable` | chargement (squelette), vide, erreur, tri, sélection, densité (confort/compact), sticky header, responsive (colonnes prioritaires) | pagination serveur, tri serveur |
| `Badge` / `StatusPill` | neutre, positif, avertissement, danger, info ; avec/without dot | statuts de boutique et de sync |
| `ProvenanceTag` | `Réelle` / `Estimée` / `Indisponible` | **jamais absent** sur un montant |
| `FreshnessNote` | « Actualisé il y a X min », « Jamais synchronisé », « Données de démonstration » | |
| `EmptyState` | titre, explication, action primaire (vraie action) | jamais un faux bouton |
| `ErrorState` | message sans secret technique, `request_id`, bouton « Réessayer » | |
| `Skeleton` | lignes/portions, pas de spinner plein écran | |
| `Toast` | succès, erreur, info ; 6 s ; fermable | |
| `Modal` / `Sheet` | focus trap, Échap, retour du focus | mobile = sheet plein écran |
| `SidebarItem` | normal, hover, active, focus, avec badge, avec chevron, niveau 2 | ARIA `aria-expanded`, `aria-current="page"` |
| `ShopSelector` | fermé, ouvert, recherche, groupé par statut/plateforme, option « Toutes les boutiques », 100+ entrées | virtualisé, navigation clavier, `aria-activedescendant` |
| `GlobalSearch` | fermé, saisie, résultats groupés, aucun résultat, chargement, `Ctrl/Cmd+K` | 5 résultats max par catégorie |
| `NotificationBell` | vide, non lu, compteur, « 99+ » | |
| `QuickActions` | menu 7 actions | chaque entrée ouvre le vrai formulaire |
| `PageHeader` | titre, fil d'Ariane, périmètre actif, actions | le périmètre actif est **toujours** visible |
| `Tabs` | clavier flèches, indicateur animé | |
| `Tooltip` | 300 ms, jamais la seule source d'une information | |
| `Chart` | voir §7 | |
| `ProgressBar` | déterminé / indéterminé, avec compteurs | progression de synchronisation |
| `Banner` | info, avertissement, danger, avec action | « Totaux incomplets », « Bientôt disponible » |
| `CommandPalette` | = `GlobalSearch` en mode overlay | |

Chaque composant de `src/ui` est livré avec : variantes, test de rendu, test clavier (si interactif), test d'accessibilité automatisé (`axe`), et une entrée dans une page-atelier interne `/ui` (hors production, protégée).

---

## 4. Structure de navigation

`src/ui/navigation.config.ts` est **la seule** source : libellés, icônes, routes, permissions, compteurs, disponibilité. Sidebar, tiroir mobile, recherche de pages, fil d'Ariane et tests d'autorisation en dérivent.

```ts
export type NavLeaf = {
  id: string;                   // 'sales.orders.all'
  label: string;                // 'Toutes les commandes'
  href: `/${string}`;
  icon: LucideIcon;
  permission?: Permission;      // absent ⇒ tout utilisateur authentifié
  availability: 'ready' | 'soon';   // 'soon' ⇒ rendu désactivé + « Bientôt »
  badgeKey?: 'orders_pending' | 'stock_alerts' | 'sync_errors' | 'notifications';
};
export type NavGroup = { id: string; label: string; icon: LucideIcon; children: NavLeaf[] };

export const navigation: NavGroup[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, children: [...] },
  { id: 'sales',     label: 'Ventes & Commandes', icon: ShoppingCart, children: [...] },
  // B → H
];
```

**Règles appliquées par le rendu et par les tests :**
1. Une entrée sans permission n'est **pas rendue** (pas grise : absente).
2. Une entrée `soon` est rendue désactivée avec la mention « Bientôt » (conformité R1 : jamais un lien mort).
3. Un badge n'affiche qu'un compteur **réel** issu de la base ; pas de compteur ⇒ pas de badge.
4. Un test CI vérifie que **chaque route existante** de `src/app` est déclarée dans `navigation.config.ts` (et inversement) : aucune page orpheline, aucun lien mort.
5. Le fil d'Ariane, la palette de commandes et la recherche de pages sont générés depuis l'arbre → cohérence garantie.

Arborescence complète (44 entrées, 8 modules) : reprise exacte du prompt, avec `availability: 'soon'` pour tout ce qui n'est pas livré.

**Implémentation progressive (P1/L8 en cours) :** seuls `/espace` et `/espace/utilisateurs` sont actuellement `ready` (le second exige une permission globale). Les autres liens restent `soon` jusqu’à l’existence de leur page, de leurs contrôles serveur et de leurs tests ; la liste « ready » ci-dessous décrit la **cible de fin de P1**, pas le présent. L’état du menu est mémorisé localement ; la synchronisation par cookie côté serveur reste à faire. En P1, seules sont `ready` : Tableau de bord › Vue d'ensemble, Boutiques & Plateformes › Toutes les boutiques / Ajouter une boutique / Connexions Jumia (coquille), Administration › Utilisateurs / Rôles / Journal d'activité / Paramètres. **Tout le reste est `soon`.**

### Comportement du menu (exigences respectées)
- clic ouvre, clic referme ; chevron animé ; **plusieurs modules ouverts simultanément** ;
- la page active met en évidence la feuille **et** ouvre son module automatiquement ;
- boutons **Tout ouvrir** / **Tout fermer** ;
- état d'ouverture mémorisé (cookie de préférence + reprise serveur pour éviter le flash) ;
- clavier : `Entrée`/`Espace` ouvre, `Échap` referme le niveau courant, `↑`/`↓` parcourt, `Début`/`Fin` saute, `Tab` sort du menu ;
- bureau : réductible en mode icônes (72 px) avec infobulles, préférence mémorisée ;
- mobile : tiroir via bouton, plein écran, fermeture par balayage ou `Échap`, cibles ≥ 44 px, aucun débordement horizontal (test Playwright sur 375 px).

---

## 5. Barre supérieure

Hauteur 64 px, fond `--bg-surface`, bordure basse. De gauche à droite : bouton menu (mobile) · logo + nom court · **sélecteur de boutique** · recherche (`Ctrl/Cmd + K`, icône + libellé « Rechercher… ») · actions rapides (icône `Plus`) · notifications (cloche + compteur) · profil (avatar, menu : profil, thème, langue, déconnexion).

**Sélecteur de boutique** — exigences traduites en décisions :
- libellé toujours visible : `Toutes les boutiques` ou `Jumia CI — Électronique (CI)`, jamais une icône seule ;
- ouverture : champ de recherche en haut, groupes « Connectées », « À intervenir », « Plateformes › Jumia », entrée « Toutes les boutiques » épinglée ;
- liste virtualisée (100+ entrées), `aria-activedescendant`, flèches, `Entrée` valide, `Échap` annule ;
- la sélection modifie l'URL (`?shop=<public_id>`) → **filtrage serveur** sur toutes les pages, y compris exports ;
- seules les boutiques autorisées apparaissent (source : `user_shop_access`, vérifié côté serveur à chaque requête — le filtre d'affichage n'est qu'un confort).

---

## 6. Écrans (maquettes)

### 6.1 Tableau de bord
Ligne 1 : 4 `StatCard` — CA livré (Réelle), Commandes (Réelle), Marge estimée (Estimée, avec taux), Trésorerie encaissée (Confirmée). Chaque carte : valeur, période, variation vs période précédente, pastille de provenance, fraîcheur.
Ligne 2 : bandeau d'alerte si une boutique est en erreur/partielle (« 2 boutiques en synchronisation partielle — les totaux sont incomplets » avec lien).
Ligne 3 : graphique « CA livré par jour » (30 j) + liste « Produits les plus vendus ».
Ligne 4 : « Boutiques » (cartes réduites) + « Activité récente » + « Alertes importantes ».

### 6.2 Toutes les boutiques (cartes dépliables)
- Carte **réduite par défaut** : nom, plateforme, statut (pastille), indicateur de connexion, chevron, mini-KPI (CA 30 j).
- Carte **dépliée** : CA livré, marge nette, commandes, produits en stock, valeur du stock, coûts d'achat, 3 liens (Commandes / Produits / Factures) + « Paramètres ».
- Barre d'outils : recherche, filtres (statut, plateforme), tri (CA, marge, commandes), **Tout déplier / Tout replier**.
- Performance : pagination 20 + virtualisation si > 60 cartes affichées ; les agrégats de la carte dépliée viennent de `daily_shop_metrics` (pas de requête par carte à l'ouverture).

### 6.3 Jumia Connect (coquille en P1, contenu réel en P2)
En-tête : « 3 boutiques connectées · 1 à intervenir ». Tableau par boutique : nom, pays/devise, statut, dernière sync réussie par ressource, compteurs, prochaine exécution, actions (Relancer / Reprendre / Reconnecter / Erreurs). Panneau latéral : détail d'une exécution (pages, lus/créés/mis à jour/ignorés/erreurs, durée, cause d'échec).

### 6.4 Mobile (375 px)
Barre supérieure réduite (menu, logo court, sélecteur en pastille tronquée, cloche). Tiroir plein écran. `StatCard` en pleine largeur (empilées). Tableaux → liste de cartes (2 colonnes d'information max, le reste en détail). Aucun défilement horizontal.


### 6.6 Bureau : trois états de la même interface

| État | Quand | Ce qui change | Maquette |
|---|---|---|---|
| **Menu complet** (264 px) | par défaut sur ≥ 1280 px | libellés complets, sous-menu déplié, badges visibles | section 2 |
| **Menu réduit / rail** (72 px) | bascule utilisateur, ou forcé entre 1024 et 1279 px | icônes seules + infobulles, indicateur d'élément actif, badges en pastille ; le libellé reste accessible via l'infobulle **et** le fil d'Ariane **et** le titre de page | section 3 |
| **Écran de données dense** | pages de liste (commandes, produits, mouvements…) | filtres au-dessus, tableau à en-tête collant, sélection multiple bornée au périmètre, panneau de détail à droite | section 4 |

**Paliers de largeur (à valider)**

| Largeur | Sidebar | Grille de cartes | Tableau |
|---|---|---|---|
| ≥ 1440 px | 264 px (ou rail) | 4 par ligne | colonnes complètes + panneau de détail côte à côte ; contenu max 1600 px centré |
| 1280–1439 px | 264 px (ou rail) | 4 par ligne | panneau de détail en tiroir superposé (400 px) |
| 1024–1279 px | **rail forcé** | 2 par ligne | colonnes secondaires masquées (marge, frais) avant les colonnes clés |
| 768–1023 px | tiroir | 2 par ligne | tableaux → cartes |
| < 768 px | tiroir plein écran | 1 par ligne | cartes (voir vue mobile) |

**Densité des tableaux** : deux modes, `confort` (48 px/ligne, défaut) et `compact` (36 px/ligne). Le choix est mémorisé par utilisateur. L'en-tête reste collant, la première colonne (identifiant) reste figée en cas de défilement horizontal **du tableau uniquement** — jamais de la page.

**Raccourcis bureau** (affichés en bas des écrans de liste, donc découvrables) : `J`/`K` ligne suivante/précédente · `Entrée` ouvrir · `Espace` sélectionner · `/` rechercher · `Ctrl/Cmd+K` palette · `Échap` fermer le panneau · `?` aide des raccourcis. Aucun raccourci n'est indispensable : tout est faisable à la souris.

**Règle de sélection multiple** : la sélection est **bornée au périmètre de boutique courant**. Changer de boutique la vide, avec un message explicite (« Sélection effacée : le périmètre a changé ») — c'est la traduction dans l'interface de l'isolation serveur.

### 6.5 Thème sombre
Mêmes composants, jetons inversés ; la sidebar reste plus sombre que le fond de page pour conserver la hiérarchie ; les graphiques utilisent les variantes sombres des couleurs de série ; les ombres deviennent des bordures.

---

## 7. Visualisation de données

| Type | Usage | Règles |
|---|---|---|
| Ligne | évolution CA/marge dans le temps | axe Y à zéro, unité affichée, pas plus de 3 séries, légende cliquable |
| Barres | comparaison par boutique/produit | triées par valeur, valeur affichée en bout de barre si ≤ 8 barres |
| Barres empilées | composition des coûts | 4 segments max, ordre stable : revenu → commission → COGS → frais → marge |
| Aire | **interdite** | elle suggère une exactitude de volume que nous n'avons pas |
| Camembert / donut | **interdit** | illisible au-delà de 3 parts, comparaisons imprécises |

Règles transverses : jamais de graphique sans données réelles (sinon état vide avec explication) ; une série « estimée » est en pointillés + légende « estimée » ; point de rupture explicite quand une boutique est manquante dans la période ; infobulle avec valeur exacte, date, devise, provenance ; table de données équivalente accessible sous chaque graphique (bouton « Voir les données ») ; couleurs de série testées pour la deutéranopie.

---

## 8. Rédaction d'interface (français)

- Voix active, phrases courtes, pas de jargon technique devant l'utilisateur.
- Un message d'erreur dit **ce qui s'est passé**, **ce que ça implique**, **ce qu'on peut faire**. Exemple : « Jumia a refusé le jeton de cette boutique (invalid_grant). La synchronisation est arrêtée. → Reconnecter la boutique ».
- Aucun message technique brut en interface : le code (`400 invalid_grant`) est dans un bloc « Détails techniques » repliable (utile au support, invisible au quotidien).
- Confirmation obligatoire avant toute action destructive ou financière, avec le libellé exact de l'objet (« Supprimer le brouillon “Sac cuir noir” — boutique Jumia CI »).
- Vocabulaire constant : **boutiques** (jamais « magasins »), **commandes**, **produits**, **relevés**, **estimé / confirmé**, **synchronisation partielle**.

---

## 9. Accessibilité : critères de recette

- Contraste AA minimum (4,5:1 texte, 3:1 éléments d'interface), vérifié par test automatisé sur les jetons.
- Navigation complète au clavier, focus visible sur **tous** les éléments interactifs, ordre de tabulation logique, pas de piège de focus hors modale.
- `aria-*` corrects sur menu (rôles `menu`/`menuitem` avec `aria-expanded`), combobox (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`), tableaux (`scope`, `aria-sort`), onglets, toasts (`role="status"` / `role="alert"`).
- Formulaires : label associé, erreur annoncée, `autocomplete` correct, jamais de placeholder comme seul label.
- Zoom 200 % sans perte d'information ; aucun texte tronqué sans infobulle ; aucun contenu uniquement au survol.
- Respect de `prefers-reduced-motion` et de `prefers-color-scheme`.
- Cible de test : **aucune violation `axe` de niveau `serious` ou `critical`** sur les écrans livrés.

---

## 10. Ce que la P1 livre en interface (et rien de plus)

Livré : jetons et thèmes, 20 composants du socle, sidebar à 2 niveaux (complète, avec entrées `soon`), barre supérieure, sélecteur de boutique, recherche globale (sur les entités existantes : boutiques, utilisateurs), notifications (vides au départ), actions rapides (désactivées sauf si l'action existe), profil, page « Toutes les boutiques » (cartes réelles, agrégats « — » tant que P2 n'alimente rien), écrans d'authentification et 2FA, Administration (utilisateurs, rôles, audit), page `/ui` de l'atelier composants.

**Non livré et donc absent de l'interface** : tableau de bord chiffré (il n'y a pas encore de données Jumia → les cartes n'existent pas, la page affiche l'état vide « Connectez une boutique pour voir vos indicateurs »), produits, commandes, finance, MIMI, rapports. Aucun bouton factice.
