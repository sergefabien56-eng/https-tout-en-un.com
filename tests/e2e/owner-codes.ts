/** Quatre codes uniques par scénario : bureau/mobile, puis première tentative/retry. */
export function ownerRecoveryIndex(scenario: 0 | 1 | 2 | 3, retry: number, project: string): number {
  if (!Number.isInteger(retry) || retry < 0 || retry > 1 || !['bureau', 'mobile-375'].includes(project)) {
    throw new Error('Réservation de code de secours E2E invalide.');
  }
  return scenario * 4 + retry * 2 + (project === 'mobile-375' ? 1 : 0);
}
