# Publication du projet sur votre dépôt GitHub

**Dépôt communiqué :** `https://github.com/sergefabien56-eng/https-tout-en-un.com.git`

Le dépôt est configuré en `origin` dans la session de travail, mais **aucun push n'a réussi** : GitHub a exigé des identifiants que cet environnement ne possède pas (`fatal: could not read Username for 'https://github.com'`). Le pipeline CI ne s'est donc pas encore exécuté. Le bundle `tout-en-un-phase1.bundle`, créé et vérifié par `git bundle verify`, contient l'historique complet du code actuel ; **il n'inclut pas de secret de production**.

## Option recommandée : publier depuis votre ordinateur

1. Téléchargez le fichier `tout-en-un-phase1.bundle` depuis l'espace de travail.
2. Sur votre ordinateur, dans un dossier où vous souhaitez conserver le projet :

```sh
git clone /CHEMIN/DU/FICHIER/tout-en-un-phase1.bundle tout-en-un-business-manager
cd tout-en-un-business-manager
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/sergefabien56-eng/https-tout-en-un.com.git
git push -u origin main
```

La dernière commande demande l'authentification **sur votre ordinateur** (Git Credential Manager ou clé SSH). Ne transmettez jamais votre mot de passe/jeton dans le chat. Si le dépôt contient déjà des commits, ne forcez **pas** la mise à jour ; examinez d'abord les historiques et fusionnez-les.

3. Ouvrez **Actions** dans GitHub et transmettez le résultat des jobs (ou le lien vers une exécution visible). Un fichier CI écrit n'est pas une CI validée : le job PostgreSQL 16 et les migrations sont à vérifier sur un vrai runner.

## Autre option

Si votre ordinateur dispose déjà de la copie de travail (avec ses fichiers et son `.git`), le bundle est inutile : ajoutez la même URL comme remote `origin` et exécutez `git push -u origin main` depuis cet ordinateur.
