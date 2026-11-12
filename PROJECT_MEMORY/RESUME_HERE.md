# Reprendre ici — correctif E2E Système, Phase 1 L10

## GitHub vérifié

`main=62fe69486d27b6f97a57edf05a3553b678928d0a` publié ; [run `43293637526`](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43293637526) **completed failure** : qualité/tests/build et migrations PG16 success ; navigateur bureau/mobile failure, archive skipped. Annotations du job navigateur `131447118325` à `tests/e2e/authenticated-admin.spec.ts:211` : sélecteur de titre « Système » ambigu avec le nouveau h2 « Événements système globaux enregistrés », sur deux tailles et retries. Ne pas déclarer ce run vert. Dernier SHA à quatre jobs verts : `cc0335d`, run `43290713784` (Paramètres et export rôles).

## Correction locale, validation en attente

Assertion E2E conservée et rendue exacte : titre principal niveau 1 « Système ». Aucun code produit, droit, RLS ou migration changé. Compte rendu `docs/comptes-rendus/phase1-correctif-compteurs-systeme.md`. Snapshot avant correction `62fe694` exporté et vérifié sous `/home/user/continuity-backups/`. Types/lint, 6 tests unitaires ciblés, découverte 10 E2E, contrôle mémoire/diff OK ; vrais E2E PG16 non exécutés localement. Suite : commit descendant du SHA rouge, snapshot après et ZIP GitHub Desktop vérifiés, transfert privé Drive au propriétaire ; publication normale par celui-ci, puis **contrôle des quatre jobs du nouveau SHA avant tout développement supplémentaire**.

## Contexte et garde-fous

Le propriétaire veut travailler par cycles **code préparé → archive envoyée → il publie → nous vérifions quatre jobs → lot suivant**, sans empiler de lots non validés ni menu de micro-améliorations. L10/P1 incomplets : SMTP/invitations, devise à décider, exports restants et autres critères ; L11 HTTPS/restauration chiffrée réelle et L12 revue/démo non faits. Windows/WSL/Docker en pause demandée ; pas de production, donnée réelle, installation PC ni sauvegarde PostgreSQL réelle restaurée. Maquette autonome fictive distincte. Ne pas écraser l'ancien dépôt divergent `/home/user`.

**Reprise** : « Lis `RESUME_HERE.md`, `AI_HANDOVER.md` et `NEXT_ACTIONS.md`, compare code/CI/docs. `62fe694` publié mais run `43293637526` rouge sur sélecteur E2E ambigu ; correctif local à committer et publier normalement avant une nouvelle CI. Windows en pause ; pas de production. »
