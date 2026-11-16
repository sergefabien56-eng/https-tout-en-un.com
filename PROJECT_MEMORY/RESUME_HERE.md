# Reprendre ici — délégation des rôles boutique

Base publiée `9fa2b45c15b6126cdc2e83175b66ad71f3a1c822`, [CI 43974576655](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43974576655) : quatre jobs verts, 20 parcours navigateur, artifact non restauré. Le présent sous-lot de mutation déléguée est **local et non validé par cette CI** ; voir `docs/comptes-rendus/phase1-delegation-roles-boutique.md`.

Délégation limitée aux membres ayant accès actif et aux rôles dont toutes les permissions sont possédées par l'acteur dans la boutique. Propriétaire, soi-même et invités protégés ; aucun rôle global ou accès nouveau via le délégué. Écriture et audit atomiques, contrôles serveur, concurrence et RLS. 363 Vitest, lint/types/build/audit high OK ; PostgreSQL 17 réel non-BYPASSRLS et deux E2E bureau/mobile avec session fictive injectée passent. Une tentative locale à deux workers a échoué avec serveur Next disparu, cause non établie ; un worker passe. PostgreSQL 16 et CI du nouveau SHA restent à vérifier.

ZIP Arena → attendre publication sans force → envoyer immédiatement le lien CI dès « publié » → vérifier les quatre jobs avant autre lot. Ne partager ni secrets, ni cookies, ni traces privées. Snapshot code ≠ sauvegarde DB. L10 et Phase 1 incomplets ; Windows en pause. Lire `AI_HANDOVER.md` et `NEXT_ACTIONS.md`.

XOF est la référence choisie, sans règles de taux ou de conversion ; alertes critiques au propriétaire uniquement ; export Système réservé au propriétaire. Domaine, VPS et SMTP à fournir plus tard, sans secrets en conversation ; déploiement, e-mail réel et restauration de production restent bloqués. Compteurs globaux Système indisponibles sous RLS, non faux zéro. MIMI après L10 souhaitée ; ordre avec L11/L12 à préciser.
