# État Phase 1 — incident archive CI corrigé localement

| Élément | Preuve / statut |
|---|---|
| GitHub publié | `main` `c882cb4970eeaa35083ddf3a0d7a7f595adb8455` ; run `43016471668` **failure** à cause de l'upload artifact seul |
| Fonction utilisateur | Filtre statut + recherche et pagination : job qualité + intégration et E2E bureau/mobile **success** sur ce SHA ; ne pas déclarer le run global vert |
| Base CI | Migrations PostgreSQL 16, rollback, restauration de fixtures : job **success** |
| Archive code | Création et vérification réussies dans le job CI, puis `actions/upload-artifact@v4` : **aucun fichier trouvé dans dossier caché `.project-backups/`** ; 0 artifact publié |
| Correctif | dossier visible `code-archive-upload/` avec uniquement bundle, ZIP, SHA256 ; **nouveau run CI à vérifier après push** |
| Données réelles | aucune sauvegarde PostgreSQL chiffrée hors serveur, aucun hébergement de production vérifié |

Tests locaux du correctif : YAML analysé, contrôle mémoire, lint, typage et **161/161 Vitest** OK ; simulation sur clone propre : création des archives, empreintes vérifiées, exactement 3 fichiers dans le dossier visible, bundle restauré et SHA comparé. L’envoi effectif via GitHub Actions **reste non testé**. Les 3 jobs verts du SHA `c882cb4` ne prouvent pas que le quatrième fonctionnera après correction. Secrets interdits dans archive/CI. Voir `NEXT_ACTIONS.md`.
