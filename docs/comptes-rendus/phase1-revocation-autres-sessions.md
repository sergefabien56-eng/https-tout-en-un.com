# Phase 1 — Révocation ciblée des autres sessions

Base publiée : `cbbe9505d593b55eeaa1810d57e1ef99e9926bc2`, CI `43026793436` réussie (4 jobs) et artifact code présent, **non téléchargé/restauré depuis GitHub**. Le présent lot est **local, non publié/non validé en CI**.

- `Mes sessions` conserve le tableau des appareils actifs et ajoute une action de déconnexion uniquement sur **une autre session**. Confirmation explicite, rafraîchissement du tableau après succès, message d'erreur sinon. Aucune empreinte de jeton, IP ou User-Agent brut n'est envoyée au client.
- `POST /api/auth/sessions/[id]/revoke` exige Origin de l'application et double-submit CSRF, session active, identifiant numérique. La transaction verrouille implicitement l'enregistrement mis à jour et filtre sur le même utilisateur, exclut le jeton courant, vérifie actif/non expiré et insère une ligne `audit_log` **dans la même transaction**. Un identifiant d'une autre personne ou déjà révoqué rend 404, sans exposer l'appartenance.
- Tests PGlite : autre session révoquée et inutilisable, appareil courant et autre utilisateur préservés, audit unique, réessai et identifiants invalides refusés ; route sans Origin/CSRF/session refusée. E2E ajouté pour affichage et refus de révocation de la session courante ; **non exécuté localement** (PostgreSQL CI requis).
- **Aucune migration** ni suppression de fonctionnalité. Révocation « tous les autres appareils » en un clic, invitations/gestion des comptes, SMTP et hébergement durable ne sont pas livrés par ce lot.

Validation locale : 38/38 tests ciblés, lint/typecheck et cohérence mémoire verts ; build, suite complète et E2E du nouveau SHA à confirmer par CI. Artifact de code GitHub et snapshots locaux ne constituent **pas** une sauvegarde des données PostgreSQL réelles ; aucune restauration chiffrée indépendante effectuée.
