/**
 * Quatre codes uniques par scénario : bureau/mobile, puis première tentative/retry.
 *
 * Le bootstrap crée 10 codes et `scripts/extend-e2e-recovery.mjs` en ajoute 14 : 24 au total,
 * soit 6 scénarios (0 à 5) x 4 codes. Les scénarios 0 à 3 sont réservés à
 * `authenticated-admin.spec.ts` ; les scénarios 4 et 5 sont réservés à `mobile-overflow.spec.ts`.
 * Un code de secours est à usage unique : deux tests qui partagent un scénario consomment
 * le même code et le second échoue. Ajouter un test consommateur impose donc un nouveau
 * scénario ET l'extension correspondante du fichier de codes.
 */
export const OWNER_SCENARIOS = [0, 1, 2, 3, 4, 5] as const;
export type OwnerScenario = (typeof OWNER_SCENARIOS)[number];

export function ownerRecoveryIndex(scenario: OwnerScenario, retry: number, project: string): number {
  if (!OWNER_SCENARIOS.includes(scenario) || !Number.isInteger(retry) || retry < 0 || retry > 1
    || !['bureau', 'mobile-375'].includes(project)) {
    throw new Error('Réservation de code de secours E2E invalide.');
  }
  const index = scenario * 4 + retry * 2 + (project === 'mobile-375' ? 1 : 0);
  if (index >= 24) throw new Error('Réservation de code de secours E2E hors du fichier de 24 codes.');
  return index;
}
