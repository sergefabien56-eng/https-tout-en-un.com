# Actions suivantes — navigation filtres notifications

1. Vérifier localement `src/app/espace/notifications/page.tsx` et `tests/e2e/authenticated-admin.spec.ts` : lint, types, tests ciblés, découverte Playwright et mémoire/diff. Le run `43063876856` de `e4c4678` est **rouge** (9 E2E passés, 1 flaky sur clic « Lues » ; qualité/PG16 verts) : le correctif local n'est pas validé par ce run.
2. Commit descendant sans force push, snapshot après commit SHA vérifié, archive GitHub Desktop extraite/HEAD et SHA256 vérifiés ; publication par propriétaire. Exiger ensuite **quatre jobs verts** du nouveau SHA, sans flaky (`failOnFlakyTests` conservé) et artifact code du même SHA.
3. Si le filtre échoue encore, télécharger l'artifact `e2e-traces` depuis GitHub, examiner trace/URL/console/réponses avant modification ciblée. Ne pas masquer les E2E ni qualifier de panne DNS l'échec actuel (Chromium s'est installé).
4. Télécharger/restaurer le code CI dans clone isolé et conserver copie hors GitHub. Préparer séparément sauvegarde chiffrée/restaurée de la vraie base PostgreSQL après choix hébergeur/stockage, sans secrets en Git. Continuer P1 seulement après validation.
