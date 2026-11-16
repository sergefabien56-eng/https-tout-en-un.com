# Phase 1 / L10 — choix explicite de devise de référence XOF

## Périmètre
Le propriétaire a choisi XOF comme devise de référence des futures vues consolidées. Une personne disposant du droit global `settings:manage` peut maintenant enregistrer explicitement XOF sur l’écran Paramètres ; sans action, la valeur de l’organisation reste « Non configurée ». Le droit global `settings:read` est nécessaire pour lire. Le réglage n'est pas déduit d'une boutique, ne modifie aucune devise boutique et ne lance aucune conversion, consolidation ou calcul financier. Les taux, arrondis et formules restent à valider. Seul XOF est accepté, faute de décision sur d'autres choix ; aucune interface de changement vers une autre devise n'est prétendue disponible.

La constante technique `appConfig.referenceCurrency` existait déjà avec XOF et l'accueil public l'affichait, sans lire l'organisation ; ce libellé a été retiré de l'accueil pour éviter de confondre cette constante avec un réglage enregistré. La constante n'est pas une preuve de configuration ni un mécanisme financier.

## Sécurité, audit et exports
Route PUT dédiée : vérification stricte Origin et CSRF, session et `settings:manage` global, corps strict à un champ et valeur autorisée. Ligne `app_settings` verrouillée, mise à jour et audit `update_reference_currency` atomiques ; répétition idempotente sans faux audit. Valeur stockée corrompue refusée explicitement. Migration réversible `0013` : policy INSERT d'audit limitée à cette seule action et à l'acteur local ; elle n'ouvre aucune lecture supplémentaire. Aucun secret ni privilège de propriétaire n'est ajouté.

Les exports paramètres CSV/Excel/PDF sélectionnent désormais explicitement **nom, fuseau et devise** ; valeur absente « Non configurée ». Une ligne supplémentaire est ajoutée aux trois formats : **prévenir les consommateurs automatisés**. Les autres paramètres et secrets restent exclus ; droits d'export inchangés. PDF fictifs relus indépendamment : XOF, valeurs absentes, texte et disposition vérifiés.

## Vérifications et limites
334 Vitest réussis, dont application/rollback PGlite des 13 migrations, refus de rôle boutique/non-session et valeur invalide, mutation sous rôle sans BYPASSRLS, idempotence, rollback forcé de l'audit, policy et CSRF/Origin ; lint, types, build, audit high et cohérence réussis (7 vulnérabilités modérées ; audit production : aucune). 14 scénarios Playwright listés, mais navigateur et PostgreSQL 16 réels de ce SHA non exécutés localement : à vérifier en CI. Pas de données réelles, de conversion financière ni d'envoi e-mail.

Base `61931b07ccd45f5db00ed361c401b641143421ec` publiée, [CI 43926512820](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43926512820) quatre jobs verts, dont 14 tests navigateur ; artifact non restauré. ZIP Arena → publication sans force → lien CI immédiat → quatre jobs verts avant le prochain lot. L10 et Phase 1 restent incomplets ; domaine, VPS et SMTP seront fournis par le propriétaire plus tard, donc déploiement et tests réels restent bloqués ; Windows en pause.
