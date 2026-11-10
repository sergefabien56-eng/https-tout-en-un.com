# Phase 1 — codes de secours 2FA (L5, partiel)

## 1. Livré

- Dix codes de secours de 128 bits chacun, uniques et aléatoires (`randomBytes(16)`), présentés une seule fois lors de la création initiale du propriétaire.
- La base ne stocke que les empreintes SHA-256 ; les codes réels ne figurent ni dans le journal ni dans la base.
- La connexion accepte un code TOTP à six chiffres **ou** un code de secours à usage unique. Le compte est verrouillé par `SELECT ... FOR UPDATE` dans la transaction ; le code consommé est retiré de la liste dans la même transaction que la création de session.
- Le script initial génère le QR et les codes dans **deux fichiers distincts**, hors du projet, créés en exclusivité avec permissions `0600` ; en cas d'échec, rollback et suppression des fichiers créés.
- Formulaire de connexion mis à jour pour indiquer clairement le mode « code de secours ».

## 2. Tests exécutés

- `npm test` → **102/102 tests réussis**, 14 fichiers. Test unitaire des formats, empreintes et unicité ; test d'intégration PostgreSQL WASM d'une connexion par code de secours et de son **rejeu refusé** ; test d'initialisation vérifiant les dix empreintes et l'absence des codes en clair en base.
- `npm run lint`, `npm run typecheck`, `npm run build` → succès.
- `npm audit --audit-level=high` → aucun avis high/critical ; avis modérés dans l'outillage.

## 3. Décisions et écarts

- Codes de secours à forte entropie : SHA-256 convient au stockage d'un secret tiré uniformément sur 128 bits (contrairement à un mot de passe humain, qui reste haché par Argon2id).
- Le QR et les codes ne sont pas imprimés en console ; seuls leurs chemins privés le sont.

## 4. Limites

- Aucun essai de l'opération CLI sur PostgreSQL 16 natif ; le module SQL et les scénarios de connexion ont été testés sur PGlite, pas en navigateur E2E.
- Pas de flux propriétaire de régénération des codes, ni d'invitation/2FA d'un autre utilisateur. Pas de serveur de production ou de fournisseur SMTP.
- La Phase 1 n'est pas terminée.

## 5. Points à vérifier

- Dans la CI, tester le prochain commit sur PostgreSQL 16. Le dernier workflow vert connu valide seulement le commit `13ae92c`.
- Revoir la procédure de transmission du QR et des codes au propriétaire sur un futur hébergement, sans les faire transiter par une page ou un journal public.

## 6. Suite

- Réaliser l'authentification/récupération complète et les écrans administratifs, puis la navigation et la PWA ; ne pas demander de VPS avant d'avoir un parcours local vérifié.
