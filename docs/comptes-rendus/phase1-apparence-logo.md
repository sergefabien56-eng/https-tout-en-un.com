# L10 — Nom, logo commun et préférences d'affichage

> État : **local, non publié**. Base `c8100b0` (run 44278561288, quatre jobs verts).

## 1. Le nom n'a qu'une source

`src/core/config/app.config.ts` reste la seule source : `APP_NAME` vaut désormais
**« TOUT EN UN BUSINESS MANAGER PRO »** et `APP_SHORT_NAME` **« TOUT EN UN PRO »**.
Le test existant qui balaie `src/` pour détecter le nom écrit en dur ailleurs continue de
passer : aucun écran ne recopie le nom.

Une ligne a été ajoutée à l'écran Paramètres pour rendre cette source visible :
*« Nom affiché : … — défini dans la configuration de l'application, jamais recopié dans un écran. »*
Un lecteur peut donc constater la valeur réelle sans chercher dans le code.

## 2. L'icône est provisoire, et le dit

Cinq formes : quatre carrés satellites reliés par quatre liens pleins à un carré central
turquoise, sur fond bleu marine. Aucun logo existant n'a été copié.

**Trace de la décision** : le 18 novembre 2026, deux pistes ont été produites et comparées
côte à côte ; le propriétaire a retenu la seconde (liens pleins, formes nettes). Le SVG du
dépôt reprend exactement ce dessin, en tracés — pas en image bitmap — pour rester net à
20 px comme à 512 px. L'écran continue d'annoncer l'icône comme **provisoire** : c'est le
propriétaire qui la déclarera définitive, pas le code.

L'écran Paramètres affiche une phrase explicite : « Icône provisoire affichée… Elle n'est
pas définitive et sera remplacée dès que vous aurez validé un logo. » Aucun écran ne prétend
que cette icône est le logo officiel.

Le site fonctionne **sans aucun logo importé** : l'icône est dessinée en SVG dans le code,
sans requête réseau ni fichier externe.

## 3. Un seul fichier, adaptation automatique

- L'image est rendue avec `object-fit: contain` : **proportions conservées**, jamais déformée.
- En mode sombre, une plaque claire est ajoutée **seulement si nécessaire** : la luminance
  moyenne des pixels opaques est mesurée dans le navigateur. Un logo clair n'en reçoit pas.
  Si les pixels sont illisibles, aucune plaque n'est ajoutée : on ne devine pas.
- L'aperçu montre **trois cas simultanément** : mode clair, mode sombre, et petite taille
  (20 px). Le propriétaire n'a pas à changer son propre thème pour vérifier les deux.

## 4. Contrôle serveur du fichier

| Contrôle | Règle | Refus |
|---|---|---|
| Type | Signature binaire (PNG, JPEG, WebP) | SVG nommé `.png` refusé, avec le motif indiqué |
| Taille | 1 Mio maximum, taille réelle et annoncée | 413 |
| Côté | entre 32 px et 2048 px | message chiffré |
| Proportions | écart maximal 1 pour 4 | message chiffré |
| Ré-encodage | `sharp`, 512 px de côté maximum, rotation EXIF appliquée puis effacée | échec = refus, jamais d'image d'origine conservée |

Le **SVG est refusé** : c'est du XML, donc du contenu actif possible. Le type est relevé sur
les octets, jamais sur le `Content-Type` annoncé ni sur l'extension.

Le stockage est en `app_settings` (clé `organization.logo`, base64). Aucun fichier n'est écrit
sur le disque : la sauvegarde de la base suffit, et l'application reste sans état local.

## 5. Droits : le Propriétaire, et lui seul

`settings:manage` **ne suffit pas** : le Gestionnaire global le possède. Le module vérifie
en plus le rôle `owner` global. Le test d'intégration prouve le refus d'un Gestionnaire
global *sans passer par l'écran*, en appelant le module directement.

La lecture, elle, n'exige aucune permission métier : un membre dont le rôle est limité à une
boutique voit le logo. Un test a révélé ce défaut avant publication — la première version
utilisait `dashboard:read`, ce qui l'aurait privé de logo.

## 6. Une migration, pas un contournement

La politique RLS du journal d'audit énumérait deux actions (`update_timezone`,
`update_organization_name`). L'écriture du logo était donc **refusée** par PostgreSQL.
La migration **0017** ajoute une policy étroite pour deux nouvelles actions
(`update_organization_logo`, `remove_organization_logo`), avec acteur vérifié et
`shop_id IS NULL`. Elle n'ouvre aucune lecture du journal.

Le journal ne contient **jamais l'image** : uniquement le fait, les dimensions, le type et
l'auteur. Un test vérifie qu'aucune chaîne base64 longue n'y figure.

## 7. Préférences individuelles préservées

Le thème clair/sombre reste une préférence de navigateur, par compte, dans `localStorage`.
La gestion du logo n'y accède jamais. Un test vérifie qu'aucune clé de thème n'existe dans
`app_settings` et qu'aucune table ne stocke d'apparence.

## 8. Hors périmètre, comme demandé

- Aucun éditeur libre des couleurs de l'interface.
- Aucune refonte du design system.
- Aucun changement silencieux du nom ou des droits existants : les quatre rôles et leurs
  permissions sont inchangés, et le test de matrice de permissions reste vert.

## 9. Preuves

- `npx vitest run` : **405 tests / 77 fichiers** (391 avant ce lot).
- `npx tsc --noEmit`, `npm run lint`, `npm run build` : propres.
- Navigateur, ordre exact de la CI : import réel d'un logo **sombre** de 300×200, aperçu en
  clair et en sombre, puis retrait. Les captures confirment la plaque claire en mode sombre
  et l'absence de plaque en mode clair.
- Échecs intermittents sur cette machine : **1 échec différent à chaque exécution**, sur des
  clics de navigation, également présent sans ce lot. La CI tranchera.

## 10. Ce que ce lot ne fait pas

- Aucun logo **définitif** n'est choisi : l'icône reste provisoire jusqu'à validation.
- Aucune génération automatique de variantes (favicon, image de partage) : non demandée.
- Aucun redimensionnement à la volée : l'image est stockée à une seule taille (512 px max).

## 11. Échec CI du 18/11/2026 (run 44297920494) — délai de navigation, pas régression

Le job navigateur est tombé sur **un seul test**, en mobile 375 :

```
[.  ] › » propriétaire CI : connexion 2FA, notifications et recherche utilisateurs
Error: page.goto: Test timeout of 120000ms exceeded.
  navigating to "http://127.0.0.1:3100/espace/recherche", waiting until "load"
```

**Ce que cela n'était pas.** Aucun rapport avec l'icône ni avec le logo : les 20 autres
tests sont passés, y compris l'import réel du logo et les aperçus clair/sombre. Le test
fautif a même réussi à sa reprise — mais `failOnFlakyTests` est activé en CI, et c'est
**volontaire** : un test instable ne doit pas être déclaré vert.

**La cause réelle.** Ce parcours enchaîne une trentaine d'étapes sur bureau **et** mobile et
charge des pages lourdes (annuaire, notifications, recherche, fiche compte). Son budget était
de 120 s. En mobile, `page.goto` attend l'événement `load`, c'est-à-dire la fin de **toutes**
les ressources : sous charge, la limite est atteinte avant la fin du parcours.

**Le correctif, minimal.**

| Avant | Après | Pourquoi |
|---|---|---|
| `test.setTimeout(120_000)` × 4 | `180_000` × 4 | marge de navigation, sans relâcher les assertions |
| `page.goto('/espace/recherche')` | `{ waitUntil: 'domcontentloaded' }` | l'assertion suivante vérifie le titre rendu, pas la fin du flux |

Les attentes d'assertion restent à 20 s : rien n'a été relâché côté exigence. Le précédent
existait déjà dans le dépôt, pour `/espace/journal/global`.
