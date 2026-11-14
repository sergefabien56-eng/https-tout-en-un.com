# Correctif CI — durée du parcours navigateur

## Constat
La base `5be44764549e1bbfb2b895e941a819dfb656f5a1` a été publiée ; [run 43646861790](https://github.com/sergefabien56-eng/https-tout-en-un.com/actions/runs/43646861790) : qualité et PostgreSQL 16 verts ; navigateur rouge (9 passés, un flaky), archive sautée. La première tentative bureau a atteint la limite globale de 120 s, puis le retry a réussi ; `failOnFlakyTests` a donc correctement bloqué la CI.

La trace Playwright fournie comporte la copie exacte du fichier de test de `5be4476`. Elle montre de nombreuses navigations, assertions et requêtes durant l'ensemble du parcours : à ~119 s, le contrôle des sessions était encore en cours. Plusieurs opérations durent de 2 à 5 s. La dernière erreur `/api/auth/me` ne prouve pas que cette requête aurait elle-même pris 120 s ni une cause liée aux CSV. Trace et captures potentiellement sensibles, non incluses dans le dépôt ni le ZIP.

## Correctif
Découper le long scénario propriétaire en deux tests autonomes : rôles/système/paramètres, puis boutiques/journal/sessions. Chaque test ouvre sa propre session authentifiée, sans dépendre de l'ordre ni d'un état de page antérieur. Les assertions existantes sont conservées ; le délai de 120 s par scénario, les seuils individuels et `failOnFlakyTests` restent inchangés. Pas de rejeu des mutations et pas de modification du code métier.

Les trois scénarios authentifiés, sur deux formats et deux tentatives possibles, réservent chacun leurs codes de secours uniques : 12 indices distincts. Le bootstrap normal reste inchangé (10 codes). Un script strictement CI, `staging`, base de test locale et fichier temporaire attendu ajoute deux codes fictifs ; il ne journalise aucun code. La CI nettoie le fichier même en cas d'échec. La limite applicative de 10 connexions par fenêtre reste inchangée : en cas de nombreux retries rapprochés elle peut refuser les connexions supplémentaires, ce qui ne rend pas la CI verte et doit être diagnostiqué.

## Vérifications locales
262 Vitest, lint, types, build et audit niveau high réussis ; audit complet : 7 vulnérabilités modérées. Les tests vérifient les 12 indices et le refus du script hors CI/base locale ; la requête SQL exacte ajoute deux hashes et refuse le second passage sur PGlite (ce n'est pas un serveur PostgreSQL 16). Douze tests Playwright sont listés, mais le navigateur authentifié, le script sur PostgreSQL 16 réel et le job CI de ce nouveau commit n'ont pas été exécutés localement. Le correctif est une hypothèse étayée par la trace, à valider par les quatre jobs après publication. Ne pas poursuivre L10 avant cette validation.
