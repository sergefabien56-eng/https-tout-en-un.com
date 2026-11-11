# Fonctionnalités présentes (définition limitée)

- Socle Next/TS, pages publiques et shell d'espace ; thème et adaptation mobile, tests d'accessibilité limités aux scénarios existants.
- Authentification propriétaire, sessions, TOTP/2FA, contrôles d'accès et rôles ; routes et modules indiqués dans `TECHNICAL_ARCHITECTURE.md`.
- Catalogue de boutiques et sélection, sans synchronisation Jumia ; journal d'audit boutique et export protégé ; administration utilisateurs/rôles partielle et écran système partiel.
- Liste des utilisateurs : filtres statut et rôle combinables avec la recherche/pagination et droits globaux ; lot rôle `061a368` validé par le run `43021881652` (4 jobs verts).
- Notifications personnelles liées à la sécurité : consultation, badge, lecture/non-lecture, bouton de rafraîchissement manuel préservant le filtre/la page ; ni push ni polling.
- Migrations 0001–0010 up/down, CI PostgreSQL 16, restauration d'une **fixture jetable** vérifiée ; pas de sauvegarde en exploitation.

**Preuves** : v34 `0226bd0`, CI `43009896449` 3 jobs success, 10 Playwright ; mémoire `bf706f1` CI `43013341355` success ; compte rendu `docs/comptes-rendus/2026-11-11-actualisation-notifications.md` mentionne aussi 159 Vitest locaux et 6 tests publics supplémentaires ; ces derniers ne sont pas une nouvelle CI. Aucun module métier/Jumia réel déclaré terminé.

- Recherche limitée boutiques/comptes (page) : `a64593b`, run `43024089653` (4 jobs verts) ; **pas** une recherche globale complète.

- Palette de recherche boutique + comptes globaux : code et tests ciblés 35/35, mais **CI du nouveau SHA en attente** ; ne pas prétendre recherche universelle ni fonctionnalité entièrement validée.

- Recherche rapide boutiques/comptes : `cbbe950`, CI `43026793436` quatre jobs verts ; artifact présent non restauré depuis GitHub. Révocation des autres sessions seulement en code local, **pas encore validée en CI du futur SHA**.
