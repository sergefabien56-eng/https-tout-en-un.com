/**
 * Quatre codes uniques par scénario : bureau/mobile, puis première tentative/retry.
 *
 * Le bootstrap crée 10 codes et `scripts/extend-e2e-recovery.mjs` en ajoute 14 : 24 au total,
 * soit 6 scénarios (0 à 5) x 4 codes. Réservation, énumérée ici et NULLE PART ailleurs :
 *   - 0 à 3 : `authenticated-admin.spec.ts` (un scénario par parcours)
 *   - 4 : `mobile-overflow.spec.ts`
 *   - 5 : libre
 *
 * Un code de secours est à usage unique. Deux tests qui partagent un scénario consomment le
 * même code et le second échoue — c'est exactement ce qui est arrivé au run 44351056218 : la
 * documentation de ce fichier affirmait que `mobile-overflow.spec.ts` réutilisait le scénario 0,
 * alors que le test en consommait un autre. La constante ci-dessous rend la réservation
 * exécutable plutôt que commentée.
 */
export const OWNER_SCENARIOS = [0, 1, 2, 3, 4, 5] as const;
export type OwnerScenario = (typeof OWNER_SCENARIOS)[number];

/** Scénario du parcours de débordement horizontal mobile. Un seul propriétaire par scénario. */
export const MOBILE_OVERFLOW_SCENARIO: OwnerScenario = 4;

export function ownerRecoveryIndex(scenario: OwnerScenario, retry: number, project: string): number {
  if (!OWNER_SCENARIOS.includes(scenario) || !Number.isInteger(retry) || retry < 0 || retry > 1
    || !['bureau', 'mobile-375'].includes(project)) {
    throw new Error('Réservation de code de secours E2E invalide.');
  }
  const index = scenario * 4 + retry * 2 + (project === 'mobile-375' ? 1 : 0);
  if (index >= 24) throw new Error('Réservation de code de secours E2E hors du fichier de 24 codes.');
  return index;
}
