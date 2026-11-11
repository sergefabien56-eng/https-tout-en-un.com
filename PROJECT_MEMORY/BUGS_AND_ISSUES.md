# Risques / problèmes connus (non exhaustif)

1. **Critique — aucune sauvegarde opérationnelle de production** : seul test CI fictif sur base jetable ; pas de chiffrement/copie externe/restauration de données réelles. Interdiction de présenter l'application comme prête pour données commerciales.
2. **Critique — aucun serveur de production validé** : aperçu Arena transitoire ; templates Docker/Caddy non testés en VPS.
3. **Git local divergent** : `/home/user` HEAD ancien `aaa7740…` avec modifications/non suivis historiques, alors que v34 publié est `0226bd0…`. Contenu des fichiers suivis vérifié identique à v34 au début du jalon ; NE PAS reset/clean/force-push, ne pas écraser les non suivis. Utiliser une branche/clone basé sur le vrai `main` distant.
4. **Docs historiques** : `README.md`, `docs/README.md`, `docs/phase-1-plan.md`, `docs/publication-github.md` parlent d'une étape antérieure ; `docs/sauvegarde-restauration.md` mentionne une future validation 0009 aujourd'hui passée en CI v34. Réviser sans supprimer les décisions historiques et avec nouvelle preuve.
5. **Notifications** : actualisation manuelle uniquement, `kind` limité à `security_login` dans 0009 ; pas d'email/worker.
6. **Archive de code CI** : nouveau job non encore testé sur runner au moment de la préparation ; durée demandée 30 jours, pas de rétention externe. `bf706f1` (mémoire) a passé la CI `43013341355` ; le présent jalon attend sa propre validation.

Enregistrer ici tout bug reproductible avec SHA, environnement, résultat attendu/observé et preuve de correction.

7. **Historique** : `8833d4c` et le filtre utilisateurs étaient alors non publiés ; les lots suivants ont depuis été publiés et validés. L’artifact GitHub reste non restauré depuis GitHub.

8. **Run CI `43016471668` en échec (cause prouvée)** : GitHub `upload-artifact@v4` ne trouve pas `.project-backups/*` car le dossier est caché ; 3 jobs principaux verts, zéro artifact. Correctif : dossier visible ne contenant que bundle/ZIP/empreintes vérifiés ; à confirmer par nouveau run.

9. **Build local du filtre rôle non validé** : build avec symlink de `node_modules` a échoué à résoudre des modules Next présents ; installation propre `npm ci` sur clone a expiré puis été tuée (137) par le sandbox. Lint/typage/162 Vitest réussis ; attendre une CI complète du nouveau commit avant validation.

10. **Suite locale non verte sur nouveau lot recherche** : 2 workers Vitest (`auth-service`, `bootstrap-owner`) tués par dépassement mémoire (dmesg OOM), 18/20 fichiers et 153/163 tests passés ; bootstrap-owner isolé 3/3, auth-service isolé OOM. Tests ciblés du nouveau lot verts. Build non relancé localement. Ne conclure qu'après CI du nouveau SHA.

11. **Nouveau lot palette** : tests ciblés 35/35, lint/types OK ; suite entière, build et E2E du nouveau SHA non validés localement sous contrainte mémoire du sandbox. Le run vert précédent `43024089653` n'est pas une preuve pour le nouveau code.

12. Révocation ciblée : tests ciblés 38/38, lint/types OK, mais build/suite totale/E2E du futur SHA non validés localement ; ne pas attribuer le run `43026793436` à ce lot.

13. `43053514712` tentative 2 : E2E 2 failed (assertion erronée zéro autres sessions), 1 flaky (fiche utilisateur, timeout 5 s), 7 passed ; archive skipped. Correctif local test uniquement, validation CI du futur SHA en attente. Tentative 1 : DNS security.ubuntu.com échoué lors d’apt.

14. `43063876856` (`e4c4678`) : navigateur 9 passés/1 flaky après clic filtre notification (« Lues »), URL restée `filter=all&page=1` 5 s ; retry réussi, job rouge car `failOnFlakyTests`. Trace présente non téléchargée ; cause exacte non prouvée. Correctif navigation native local, CI du nouveau SHA à vérifier.

15. Nouveau lot sessions groupées : 43 tests ciblés/lint/types OK mais suite entière/build/E2E du futur SHA non exécutés localement ; l'ancien run `43065395902` de `a78a901` est vert, pas celui du nouveau code.

16. Recherche audit locale : 49 tests ciblés/lint/types OK ; suite complète/build/E2E du futur SHA non exécutés localement. Le run vert `43067657827` valide uniquement `9055afb`.
