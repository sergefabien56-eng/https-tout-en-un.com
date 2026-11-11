# Risques / problèmes connus (non exhaustif)

1. **Critique — aucune sauvegarde opérationnelle de production** : seul test CI fictif sur base jetable ; pas de chiffrement/copie externe/restauration de données réelles. Interdiction de présenter l'application comme prête pour données commerciales.
2. **Critique — aucun serveur de production validé** : aperçu Arena transitoire ; templates Docker/Caddy non testés en VPS.
3. **Git local divergent** : `/home/user` HEAD ancien `aaa7740…` avec modifications/non suivis historiques, alors que v34 publié est `0226bd0…`. Contenu des fichiers suivis vérifié identique à v34 au début du jalon ; NE PAS reset/clean/force-push, ne pas écraser les non suivis. Utiliser une branche/clone basé sur le vrai `main` distant.
4. **Docs historiques** : `README.md`, `docs/README.md`, `docs/phase-1-plan.md`, `docs/publication-github.md` parlent d'une étape antérieure ; `docs/sauvegarde-restauration.md` mentionne une future validation 0009 aujourd'hui passée en CI v34. Réviser sans supprimer les décisions historiques et avec nouvelle preuve.
5. **Notifications** : actualisation manuelle uniquement, `kind` limité à `security_login` dans 0009 ; pas d'email/worker.
6. **Nouveau commit mémoire** : non validé par la CI v34 ; vérifier nouveau run après push.

Enregistrer ici tout bug reproductible avec SHA, environnement, résultat attendu/observé et preuve de correction.
