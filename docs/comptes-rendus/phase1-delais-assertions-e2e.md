# Correctif CI — délais des assertions navigateur

## Constat

`4148ac678b053576e5151373867247df9d064c1a` publié ; [run 43518057115](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43518057115) : qualité et PostgreSQL 16 réussis, navigateur échoué, archive sautée. Un scénario bureau a été flaky et a réussi au retry ; les neuf autres tests ont réussi. L'annotation signale l'attente de l'URL de la fiche utilisateur restée sur la liste filtrée pendant cinq secondes après clic ; le titre de fiche n'a pas encore été vérifié à cette étape. L'artefact e2e-traces de ce run n'a pas été récupéré et la cause de cet échec n'est donc pas démontrée.

Lors du run précédent 43511441768 sur 2584616, la trace de l'utilisateur montrait une navigation sessions HTTP 200 en ~5,1 s face à une assertion limitée à cinq secondes ; le correctif ciblé de cette navigation est présent dans 4148ac6. L'attente trop courte sous charge avec Next dev est une hypothèse pour le nouvel échec, pas un diagnostic certain ; Next dev compile les pages à la demande mais cela n'établit pas que cette compilation soit responsable ici.

## Modification de test

Le délai par défaut des assertions Playwright passe de 5 à 20 secondes ; les délais explicitement spécifiés restent inchangés. Le scénario authentifié notifications/recherche passe de 90 à 120 secondes de délai total, comme le scénario rôles/boutiques/sessions. Assertions et actions réelles conservées ; `failOnFlakyTests` reste actif, aucune relance supplémentaire ni retry de clic, aucun changement au code métier ni aux droits. Un éventuel problème fonctionnel ou une navigation qui ne termine pas reste un échec ; les contrôles négatifs peuvent désormais attendre plus longtemps avant de conclure.

## Vérification et limites

220 Vitest, lint complet, TypeScript et cohérence documentaire réussis localement ; découverte des 10 scénarios Playwright, mais navigateur/PG16 réel non exécutés ici. Build du code applicatif réussi dans les jobs qualité des runs 43511441768 et 43518057115 ; cette modification touche seulement tests/configuration et documentation. Publier via ZIP Drive puis attendre les quatre jobs du nouveau SHA avant de continuer. Si ce correctif ne suffit pas, examiner l'artefact trace du nouveau run plutôt qu'augmenter indéfiniment les délais. Phase 1 et L10 restent inachevés ; Windows en pause, aucune production ni données réelles.
