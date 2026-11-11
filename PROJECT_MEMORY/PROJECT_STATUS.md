# Phase 1 — état vérifié et lot rôle en attente de CI

| Élément | État et preuve |
|---|---|
| Publié | GitHub `main` `d1d40888c63100e2372c846f63b2e714ae839a53`, run `43018013858` terminé **success**, quatre jobs verts |
| Archive code | Artifact `code-valide-d1d4088…` présent (expiration annoncée 2026-12-11 UTC) ; **non téléchargé/restauré depuis GitHub** ; temporaire et même hébergeur |
| Filtre de rôle | Service SQL paramétré, API et page combinant rôle/statut/recherche, rôles globaux et par boutique ; **non publié, CI et E2E de ce lot en attente** |
| Tests locaux du nouveau lot | contrôle mémoire, lint, typage, **162 Vitest** réussis. Build local non validé : résolution Next avec symlink ; `npm ci` expiré puis tué (137) faute de ressources. Le build du précédent SHA réussi ne valide pas ce lot. |
| PostgreSQL | 10 migrations ; aucune migration ajoutée. Test CI de restauration de fixtures, pas backup de données réelles. |
| Production | Aucun déploiement durable ni sauvegarde chiffrée hors serveur de la base vérifiés ; SMTP/Jumia/finance non livrés. |

**À faire** : publier le nouveau commit descendant et vérifier qualité/build, migrations PG16, E2E et archive sur le nouveau SHA ; télécharger/restaurer l'artifact ; préciser hébergement et destination indépendante des données sans jamais partager de secrets.
