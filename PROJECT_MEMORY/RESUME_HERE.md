# Reprendre ici — lot P1 Actions rapides

## Base effectivement validée

GitHub `main` et clone descendant `/tmp/toutenun-continuity-audit/` initialement au SHA `0f0491467d07973daad85c4fdc72400dcffe8418`. Run https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43082146651 : **completed success**, quatre jobs verts (qualité/build, migrations PG16, navigateur bureau/mobile, archive code), artifact code présent **non téléchargé/restauré**. Lot périodes rapides 7/30 jours UTC du journal validé par cette CI. Compte rendu `/home/user/continuity-backups/verification-publication-0f04914.md` (hors dépôt). La copie des sources de `ae540ec` sur Google Drive privé a taille/MD5 identiques à l'archive locale ; octets Drive non retéléchargés/restaurés. Ne pas confondre avec une sauvegarde de DB.

## Hébergement sur PC — PAUSE demandée par le propriétaire

Propriétaire souhaite provisoirement PC Windows 10, pour lui seul, avec plus tard de **vraies données** et disque externe débranchable. WSL/Docker installés mais Docker échoue `0x80070641` / MSI 1601 ; `Get-Service msiserver` ne trouve pas le service, WSL se dit endommagé. Aucune réparation Windows, installation applicative, base réelle, sauvegarde chiffrée/restaurée ni production vérifiées. Le propriétaire a dit « je n'y arrive pas, continuons la programmation de la phase 1 » : **ne pas lui redemander de manipuler WSL maintenant**. Ne jamais exécuter `docker-compose.dev.yml` avec données réelles (mot de passe `app`, PostgreSQL port exposé). Aucun port box à ouvrir. Ne pas considérer l'aperçu Arena comme hébergement. Ne pas collecter secrets/jetons/dumps.

## Travail actuel

Lot recommandé « Actions rapides » engagé localement, sur la base validée : menu d'accès aux pages réellement prêtes (sessions, recherche, boutiques, journal boutique sélectionnée si audit:read autorisé sur cette boutique, utilisateurs si droit global, notifications) ; invitation désactivée « bientôt ». `src/ui/quick-actions.tsx`, `src/ui/app-shell.tsx`, `src/app/espace/layout.tsx`, CSS et tests. **Non committé, non publié, non validé CI** tant qu'un nouveau SHA n'a pas quatre jobs verts. Snapshot de la base *avant-actions-rapides* copié et SHA vérifié sous `/home/user/continuity-backups/`. Lire `docs/comptes-rendus/phase1-actions-rapides.md`.

Typage/lint, 24/24 tests ciblés, découverte des 10 E2E et mémoire/diff OK localement ; vrais E2E PG16 non exécutés localement. Prochaines actions : commit descendant ; snapshot après + archive Desktop contrôlée, puis demander publication normale sans force push et vérifier quatre jobs sur le nouveau SHA. **Vrais E2E PG16 pas exécutés localement**. L'ancien dépôt divergent `/home/user` est à préserver, jamais reset/clean/force push.

**Prompt de reprise** : « Lis `PROJECT_MEMORY/RESUME_HERE.md` puis `AI_HANDOVER.md`, compare Git/code/CI/docs, protège l'arbre et suis `NEXT_ACTIONS.md` sans repartir de zéro. »
