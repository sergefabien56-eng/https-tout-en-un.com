# L10 — accès aux boutiques pour les comptes à rôle global

## Base et périmètre

GitHub `main=611cecbe1cbc55f08b733be75bfa3405a58040a1`, [run 43508600243](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43508600243) : quatre jobs verts (qualité, migrations PG16, navigateur, archive), vérifiés sur la page GitHub publique ; un artifact présent mais non restauré. L'API anonyme était limitée au moment de la vérification ; les quatre états ont été lus sur le graphe HTML public. Le présent lot doit être publié puis validé par sa propre CI.

Le Propriétaire global peut attribuer explicitement à un compte possédant un rôle global non-owner l'accès à une boutique qu'il est lui-même autorisé à administrer. Il peut aussi révoquer une ligne issue d'un rôle global : retrait de l'accès, sans retrait des rôles. Les lignes indépendantes restent révocables ; les lignes associées à un rôle boutique restent protégées par un refus 409 tant que ce rôle n'est pas retiré. L'attribution réactive une ligne désactivée le cas échéant et reste idempotente ; aucune ligne/rôle supplémentaire n'est créé pour les autres boutiques. Les comptes propriétaires, soi-même et invitations restent protégés. Le choix de boutique utilise la liste paginée/recherchée déjà disponible sur la fiche utilisateur.

L'attribution et la révocation sont protégées côté serveur (session, permission `roles:manage`, Propriétaire global, boutique valide et RLS, Origin et CSRF) ; opérations et audit sont atomiques. Aucune migration ni modification des permissions système. Idempotence sans audit mensonger. La révocation d'un accès global ne supprime pas les rôles ; un rôle boutique restant empêche explicitement sa suppression. La modification n'envoie aucun e-mail et ne concerne aucune connexion Jumia.

## Vérifications

Local : **220 tests Vitest en 34 fichiers**, lint complet, TypeScript, build Next.js réussis. Tests PGlite avec RLS : accès effectif autorisé après attribution puis refusé après retrait, réactivation, préservation des rôles, contrôles d'accès, idempotence et rollback si l'audit échoue ; tests route Origin/CSRF et corps strict. Les 10 scénarios Playwright sont découverts mais non exécutés localement ; l'assertion POST sans Origin/CSRF attend la CI. Pas de production, aucune donnée réelle, pas d'installation Windows. Phase 1 et L10 restent incomplets.

Publication via ZIP Drive puis vérification obligatoire des quatre jobs de ce nouveau SHA avant autre lot. Invitations SMTP, paramètres/devise/notifications, santé réelle, Excel/PDF et validation restent à réaliser ; SMTP dépend d'un service configuré. MIMI souhaitée après L10, ordre avec L11/L12 à préciser.
