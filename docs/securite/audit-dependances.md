# Audit des dépendances — décision du 2026-11-17

## Le problème

Le 2026-11-17, la CI est passée rouge sur `main` (`7e419827`) alors que **le code n'avait pas
changé sur le plan des dépendances**. Le seul point d'échec : `npm audit --audit-level=high`.

Cause exacte, vérifiée :

```
picomatch  *        Severity: high
GHSA-fc5q-39xc-vjpf — ReDoS via extglobs répétés sur une seule branche
Plage affectée : <= 4.0.7        Dernière version publiée : 4.0.7
Correctif disponible : AUCUN
```

**Il n'existe aucune version corrigée.** `npm audit fix` ne peut rien faire ; `npm audit fix
--force` propose de **rétrograder vitest de 4.x vers 3.1.4**, ce qui introduit une régression
fonctionnelle sans éliminer la faille. Un correctif de sécurité qui dégrade l'outillage n'est pas
un correctif.

La chaîne de dépendance est entièrement confinée à l'outillage de développement :

```
picomatch <- fdir <- tinyglobby <- @typescript-eslint/typescript-estree <- ... <- eslint
picomatch <- vite / vitest
```

Un second avis, `minimatch` (GHSA-g3hv-75wg-m249, sévérité *moderate*), suit le même chemin :
`minimatch <- @typescript-eslint/typescript-estree`. Il est corrigé dans le lockfile, mais reste
signalé via les mêmes paquets amont.

## Les faits mesurés

| Vérification | Résultat |
|---|---|
| `npm audit --omit=dev --audit-level=high` | **0 vulnérabilité** |
| `npm audit --audit-level=high` (avec dev) | 12 vulnérabilités (6 modérées, 6 hautes) |
| Le lot `97a5061` modifie-t-il `package.json`/`package-lock.json` ? | **Non** |
| Les paquets concernés sont-ils embarqués dans l'application livrée ? | **Non** |
| Nature de la faille | ReDoS dans un moteur de correspondance de motifs, utilisé au lint et aux tests |

Aucun chemin d'exploitation ne relie ces paquets à l'application servie : ils n'exécutent pas de
code à l'exécution et ne traitent aucune entrée utilisateur en production.

## La décision

La CI **bloque** sur les vulnérabilités `high`/`critical` des dépendances de **production**.
L'audit des dépendances de développement **reste exécuté à chaque passage** et son rapport reste
visible dans le journal, mais il n'interrompt plus le travail.

```yaml
- name: Audit des dépendances de production (BLOQUANT high/critical)
  run: npm audit --omit=dev --audit-level=high

- name: Audit des dépendances de développement (informatif, non bloquant)
  run: npm audit --audit-level=high || true
```

## Ce que cette décision ne fait pas

- Elle ne masque rien : le second audit s'exécute et s'affiche à chaque run.
- Elle ne touche pas aux dépendances de production, qui sont auditées et bloquantes.
- Elle n'autorise aucune faille dans le code livré.
- Elle ne rétrograde aucun paquet.

## Les limites, dites franchement

1. Une faille haute dans l'outillage de développement reste présente et n'est plus bloquante.
   Risque réel : un ReDoS déclenché par un motif hostile pendant le lint ou les tests. Impact
   limité à un job CI ralenti, jamais à l'application ni aux données.
2. Si une faille de production apparaissait, elle **bloquerait toujours** la CI.
3. Cette décision crée un angle mort partiel : une faille dev n'est plus un veto.

## Le retour en arrière, planifié

Épingler dès qu'une version corrigée de `picomatch` est publiée : l'avis ne mentionne encore
aucune version corrigée. La marche à suivre :

```bash
npm install --save-dev --save-exact picomatch@<version corrigée>
# ou, si un paquet amont l'épingle :
npm pkg set overrides.picomatch="<version corrigée>"
npm ci && npm test && npm run build
```

Puis restaurer l'audit bloquant complet et vérifier qu'il passe au vert **sans** `--omit=dev` :

```yaml
- name: Audit des dépendances (bloquant sur high/critical)
  run: npm audit --audit-level=high
```

Contrôle de sortie de ce régime : tant que l'audit dev reste non bloquant, cette page doit
mentionner la date et l'avis concerné. Dès que l'avis est corrigé et l'audit complet vert, rétablir
la CI bloquante et consigner la date de retour.

## Traçabilité

- Avis : GHSA-fc5q-39xc-vjpf (`picomatch`, high, publié le 2026-10-19),
  GHSA-g3hv-75wg-m249 (`minimatch`, moderate).
- Run qui a révélé le problème : `44161139878`, commit `7e419827`, CI n° 99.
- Décision prise par le propriétaire du projet le 2026-11-17 (option B retenue parmi trois).
