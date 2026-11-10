# Phase 1 — sécurité de connexion : intégration exécutée

## Ce qui a été écrit

- `tests/integration/auth-service.test.ts` : transactions d'identité sur PostgreSQL WASM avec **le vrai service et ses vraies requêtes** (mot de passe Argon2id + secret TOTP déchiffré + compteur anti-rejeu + session opaque + révocation + quota persistant).
- `src/core/auth/bootstrap.ts` et `scripts/bootstrap-owner.ts` : procédure d'initialisation unique du premier propriétaire ; secret TOTP chiffré, QR généré localement dans un fichier privé, aucun secret sur stdout. Voir `docs/auth-bootstrap.md`.
- `tests/integration/bootstrap-owner.test.ts` : insertion réelle sous PGlite, mot de passe vérifié, secret chiffré déchiffrable avec le bon contexte, génération PNG hors ligne, refus d'une seconde création.
- Ajustement du service : normalisation explicite de l'ID `bigint` de session en chaîne (différence constatée entre pilotes PostgreSQL/PGlite).

## Résultats effectivement obtenus

- `npm test` : **85 tests réussis sur 85**, 11 suites.
- `npm run lint` : succès ; `npm run typecheck` : succès ; `npm run build` : succès.
- `npm audit --audit-level=high` : aucune vulnérabilité high/critical ; avis modérés restants.

## Ce qui reste **non terminé**

1. Aucune connexion **navigateur + PostgreSQL 16 natif** de bout en bout ; PGlite vérifie les requêtes et les transactions en mémoire, mais ne représente ni le réseau ni l'intégration du cookie navigateur.
2. Le script CLI d'initialisation n'a pas été exécuté sur un PostgreSQL natif. Il nécessite l'intervention d'un opérateur, jamais des secrets dans le chat.
3. Codes de secours 2FA, invitation/réinitialisation, session glissante, journal d'audit applicatif, permissions par route/action, E2E Playwright et accessibilité à terminer.
4. Le nouveau code est **local dans l'espace de travail** ; il n'a pas été poussé sur GitHub, faute d'authentification dans cet environnement. La CI distante verte précédente porte sur le commit `13ae92c` seulement, pas sur ces ajouts.
5. Pas de VPS identifié : aucun déploiement HTTPS ni sauvegarde/restauration réalisés. Aucun achat demandé à l'utilisateur à ce stade.

**Conclusion :** L5 progresse, mais la Phase 1 n'est pas terminée.
