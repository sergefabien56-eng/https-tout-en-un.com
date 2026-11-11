import { describe, expect, it } from 'vitest';
import { auditPeriodPreset } from '@/modules/audit/period-presets';

describe('périodes rapides du journal', () => {
  it('compte exactement 7 jours UTC, aujourd’hui inclus, même autour de minuit local', () => {
    expect(auditPeriodPreset(7, new Date('2026-11-11T23:59:59Z')))
      .toEqual({ from: '2026-11-05', to: '2026-11-11' });
  });
  it('traverse les années bissextiles pour les 30 derniers jours', () => {
    expect(auditPeriodPreset(30, new Date('2024-03-01T00:01:00Z')))
      .toEqual({ from: '2024-02-01', to: '2024-03-01' });
  });
  it('refuse une date invalide plutôt que de produire une période erronée', () => {
    expect(() => auditPeriodPreset(7, new Date('invalid'))).toThrow(RangeError);
  });
});
