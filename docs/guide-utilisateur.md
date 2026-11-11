# Guide utilisateur — TOUT EN UN BUSINESS MANAGER

> **État : guide de la version de développement, Phase 1 non terminée.** L'application n'est pas déployée ; le dépôt GitHub et sa CI ne sont pas une URL de production. Ce guide décrit uniquement les parcours visibles dans le code validé par la CI v23 (`6550912`, run `42975121641`). Aucun compte, boutique ou chiffre Jumia n'est créé par défaut en production.

## 1. Accéder à son espace

Lorsque l'opérateur aura déployé et validé une URL HTTPS, ouvrez **Connexion** (`/connexion`). Entrez l'adresse e-mail et le mot de passe de votre compte, puis le code de votre application d'authentification ou un code de secours à usage unique. Les rôles Propriétaire et Gestionnaire nécessitent la double authentification. Il n'existe **pas d'inscription publique** ; ne saisissez jamais un code de secours dans une assistance ou dans un courriel. Un accès refusé doit être signalé au Propriétaire par un canal sûr.

La page **Mes sessions** (`/espace/sessions`) montre les connexions actives de votre compte, sans divulguer de jeton ni d'adresse IP. L'heure est affichée en **UTC**. La déconnexion de l'appareil courant est disponible depuis l'espace privé ; la révocation d'un autre appareil depuis cette page n'est pas encore disponible.

## 2. Se déplacer dans l'application

Après connexion, utilisez le menu latéral à deux niveaux. Il peut rester ouvert sur plusieurs sections ; **Tout ouvrir** et **Tout fermer** sont disponibles. Sur téléphone, ouvrez puis fermez le tiroir avec les boutons dédiés ; `Échap` le ferme. Au clavier, les flèches haut/bas ainsi que Début/Fin aident à parcourir les entrées. Un élément marqué **Bientôt** n'est pas une fonction utilisable.

La barre supérieure donne accès au choix de boutique, aux notifications, au thème et à **Mes sessions** via votre nom. Le bouton Recherche est désactivé tant que la recherche globale n'est pas livrée. Le thème peut suivre le système, être sombre ou clair ; la préférence est conservée localement dans le navigateur.

## 3. Voir et sélectionner ses boutiques

La page **Toutes les boutiques autorisées** (`/espace/boutiques`) liste uniquement les boutiques auxquelles votre compte a accès. Cherchez par nom et filtrez par état ; la pagination permet de poursuivre la liste. Choisissez une boutique sur une ligne ou dans le sélecteur de la barre supérieure. Le choix est vérifié côté serveur : saisir manuellement un identifiant de boutique non autorisé ne donne aucun accès. L'option **Toutes les boutiques autorisées** efface le choix de boutique ; elle **n'additionne pas** de ventes ni de finances.

Une boutique absente ou un état vide ne doit pas être interprété comme « zéro vente ». Aucun chiffre Jumia n'est encore disponible. Pour une boutique existante, le lien **Voir le journal** ouvre ses événements autorisés.

## 4. Consulter le journal d'activité

Sur **Journal d'activité** (`/espace/journal`), choisissez d'abord une boutique autorisée. Filtrez les événements par module, identifiant d'acteur et période **UTC**. L'export **CSV** reprend la sélection autorisée ; les cellules dangereuses pour un tableur sont neutralisées. Si aucun événement n'existe, la page le dit explicitement. Une tentative d'accès à un autre périmètre doit être refusée.

La page n'affiche pas encore la comparaison complète avant/après de chaque événement. N'utilisez pas l'export comme une sauvegarde de la base.

## 5. Consulter ses notifications

La cloche ouvre **Mes notifications** (`/espace/notifications`) et affiche le nombre de notifications personnelles non lues (au-delà de 99 : **99+**). Une **connexion 2FA réussie** crée une notification de sécurité personnelle. Les filtres **Toutes**, **Non lues** et **Lues** montrent seulement les notifications du compte connecté. Sur chaque notification, **Marquer comme lue** ou **Marquer comme non lue** enregistre la modification sur le serveur ; un message d'erreur s'affiche si elle échoue. Les événements sont affichés en **UTC**. Les notifications liées aux ventes/Jumia et les alertes par e-mail ne sont **pas encore disponibles**.

Si une connexion inconnue apparaît, changez vos accès par une procédure sûre avec le Propriétaire ; ne transmettez aucun mot de passe, code TOTP ou code de secours.

## 6. Administration et état du système

Selon vos droits, **Utilisateurs** (`/espace/utilisateurs`) présente des comptes existants et leur statut ; la fiche d'un utilisateur présente ses accès. La création par invitation et la modification des rôles depuis l'interface ne sont **pas encore disponibles**. **Rôles et permissions** (`/espace/roles`) affiche une matrice en lecture seule : une coche signifie que le rôle possède le droit indiqué, un tiret l'absence de droit.

**Système** (`/espace/systeme`) est réservé au Propriétaire : il vérifie la connexion à la base et compte les migrations effectivement appliquées. La file de tâches y est indiquée **Indisponible** : n'interprétez pas son absence comme « aucune tâche ».

## 7. Comprendre les valeurs affichées

- **Réelle** : donnée vérifiée dans la base (ex. compte, boutique enregistrée, journal, notification de connexion).
- **Estimée** : valeur explicitement calculée comme estimation, lorsqu'un module le proposera ; aucun KPI métier estimé n'est livré ici.
- **Indisponible / —** : donnée non disponible. Cela ne signifie jamais `0`.
- Aucun vendeur, stock, produit, commande, facture, chiffre d'affaires ou bénéfice Jumia n'est synchronisé en Phase 1. La connexion à l'API officielle arrivera dans une phase ultérieure, avec vérification de la boutique réellement renvoyée par Jumia.

## 8. En cas de difficulté

1. Vérifiez que vous utilisez l'URL HTTPS que l'opérateur vous aura communiquée **après** déploiement, et non le lien GitHub ou une page de démonstration.
2. En cas de refus d'accès, demandez au Propriétaire de vérifier vos droits et votre boutique attribuée ; ne contournez pas l'URL.
3. En cas de notification ou de session suspecte, avertissez le Propriétaire par un canal sûr. Ne copiez aucun secret dans un ticket, une capture ou une conversation.
4. Si une page affiche **Indisponible**, n'en déduisez pas une valeur zéro. Si une fonction est marquée **Bientôt**, elle n'est pas utilisable.

### Captures d'écran

Aucune capture de production n'est incluse : **aucun environnement HTTPS ou compte réel n'a encore été validé**. Les captures authentiques et accessibles (bureau/mobile, sans secrets) seront ajoutées après mise en place d'un staging séparé. Les maquettes de `docs/maquettes/` sont des maquettes, pas des preuves de déploiement.

### Pour l'opérateur uniquement

La création initiale du Propriétaire et le déploiement sont documentés dans `docs/auth-bootstrap.md` et `docs/deploiement.md`. Les paramètres SMTP peuvent être préparés **sur le serveur quand il sera prêt**, sans transmettre les identifiants dans le chat ni les committer dans Git. Un SMTP disponible ne prouve ni un e-mail envoyé ni un e-mail reçu. Les sauvegardes de la CI sont jetables et ne remplacent pas des sauvegardes chiffrées hors serveur de production.
