# Phase 1 — choix réel d’une boutique en CI (L8, validation en attente)

## 1. Livré
- Fixture PostgreSQL **exclusivement CI** : une application et une boutique explicitement fictives, plus un événement d’audit fictif. Aucune donnée Jumia, aucun jeton vendeur. La base PostgreSQL CI est éphémère et n’est jamais celle de production.
- Scénario navigateur connecté sur bureau et mobile : le Propriétaire 2FA voit la boutique réelle de la **base CI**, clique sur « Sélectionner », constate la préférence revalidée dans la barre, puis voit l’événement dans le journal. Une boutique inexistante est refusée ; le choix « toutes » supprime la préférence et le journal sans périmètre demande de choisir.

## 2. Tests exécutés
- Local : `node --check scripts/seed-e2e-shop.mjs`, lint, typage et **137/137 tests** réussis.
- Le nouveau scénario **n’a pas encore tourné** dans GitHub Actions. Dernière CI v12 `42924206409` verte, mais antérieure à la fixture et au test positif. Pas de PostgreSQL natif local pour le simuler.

## 3. Décisions
- Fixture créée seulement si `CI=true`, `APP_ENV=staging` et `DATABASE_URL_ADMIN` sont présents ; ces garde-fous ne constituent **pas** une protection contre une mauvaise configuration volontaire. Ne jamais fournir une URL de production à ce script.
- Aucun ID de boutique codé en dur dans le parcours : il est issu de l’API filtrée par les droits.

## 4. Limites
- Le test valide une boutique et deux tailles d’écran, pas encore la recherche/virtualisation de plus de 100 boutiques dans un vrai navigateur. Phase 1 non terminée ; application toujours hors ligne.

## 5. Vérification attendue
- Publier le paquet, puis confirmer que les trois jobs passent, notamment Playwright connecté, le contrôle RLS PostgreSQL et la fixture exécutée sur base jetable.

## 6. Suite
- Sélecteur directement dans la barre supérieure et accessibilité clavier, puis autres lots administratifs et sauvegarde/restauration.
