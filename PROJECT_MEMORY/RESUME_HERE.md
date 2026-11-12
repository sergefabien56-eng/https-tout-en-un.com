# Reprendre ici — pause nocturne, Phase 1 L10

## État vérifié

GitHub `main=d5bed045fa1668d88cbf73faff37c396057d6eb3`. [Run `43319039406`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43319039406) **completed success**, quatre jobs verts : qualité/tests/build, migrations PostgreSQL 16, navigateur bureau/mobile, archive CI. Export CSV boutiques validé en CI ; archive CI présente mais non téléchargée/restaurée. L'ancien `1dd5c4f` run `43316483281` est aussi vert. Aucun nouveau code produit depuis `d5bed04`.

## Pause demandée et maquette

Le propriétaire part dormir et souhaite reprendre demain. Maquette autonome **fictive** `/home/user/maquette-interactive-l10.html` : navigation L10, utilisateurs fictifs suspendables, cartes/tableau, filtres, CSV fictif local, rôles, journal, paramètres, Système, liste des critères restants et thème. HTML/JS autonomes ; syntaxe JS `node --check` OK et SHA256 `37989cd24b8fd03211b5ab64127a7903a27536bfc3a571f7457dfec02b2c845b`. Pas de base, API, production, donnée réelle ou publication GitHub. Ne pas confondre avec la vraie application ni l'ancienne maquette `/home/user/maquette-interactive-phase1.html`. Travail de documentation de pause committé **localement uniquement** (SHA à relever dans Git) ; GitHub demeure sur `d5bed04` jusqu'à publication éventuelle.

## Suite

Reprendre les **vrais critères L10** de `docs/phase-1-plan.md`, sans menu de micro-améliorations : attribution rôles/accès boutiques, invitations avec SMTP fiable, paramètres/devise/fuseau réellement exploité, état de file/erreurs réel, exports Excel/PDF et validation finale. Le propriétaire a exprimé vouloir MIMI après L10 ; préciser avant ce changement si L11/L12 passent avant ou après MIMI. Ne jamais déclarer Phase 1 terminée tant que HTTPS, sauvegarde chiffrée restaurée, sécurité/démo manquent. Protocole voulu : code → archive envoyée via Drive privé → il publie → contrôle quatre jobs CI → prochain lot. Windows/WSL/Docker en pause ; aucune production, installation PC, sauvegarde PostgreSQL réelle restaurée ni donnée commerciale vérifiée. Ancien dépôt divergent `/home/user` à préserver.

**Reprise** : « Lis `RESUME_HERE.md`, `AI_HANDOVER.md`, `NEXT_ACTIONS.md`, compare Git/code/CI/docs. `main=d5bed04` run `43319039406` quatre jobs verts ; maquette `/home/user/maquette-interactive-l10.html` fictive livrée, propriétaire en pause jusqu'à demain. Reprends L10 sans supposer MIMI ou production prêts. »
