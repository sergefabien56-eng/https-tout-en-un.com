/** Politique de mesure HTTP : décisions pures, sans serveur ni base. */
import { describe, expect, it } from 'vitest';
import {
  MAX_BUFFERED_SAMPLES, MEASURED_METHODS, decideSample, decideSamples, type RawLatencySample,
} from '@/modules/monitoring/instrument-routes';

const raw = (over: Partial<RawLatencySample> = {}): RawLatencySample => ({
  url: '/api/admin/users/42/status?x=1', method: 'PATCH', statusCode: 204, durationMs: 12.4, ...over,
});

describe('décision de mesure d’une route API', () => {
  it('normalise la clé, classe le statut et conserve la durée réelle', () => {
    expect(decideSample(raw())).toEqual({
      routeKey: 'admin/users/[id]/status', method: 'PATCH', statusClass: 2, durationMs: 12.4,
    });
    expect(decideSample(raw({ statusCode: 500, durationMs: 0 }))?.statusClass).toBe(5);
    expect(decideSample(raw({ statusCode: 200, durationMs: 1_234.5 }))?.durationMs).toBeCloseTo(1_234.5, 5);
  });

  it('écarte les pages, les routes non déclarées et les méthodes non suivies', () => {
    expect(decideSample(raw({ url: '/espace/systeme', method: 'GET' }))).toBe(null);
    expect(decideSample(raw({ url: '/api/inconnue', statusCode: 404 }))).toBe(null);
    expect(decideSample(raw({ url: '/api/health', method: 'HEAD' }))).toBe(null);
    expect(MEASURED_METHODS).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
  });

  it('n’accepte ni statut inexploitable ni durée aberrante', () => {
    expect(decideSample(raw({ statusCode: 0 }))).toBe(null);
    expect(decideSample(raw({ statusCode: 99 }))).toBe(null);
    expect(decideSample(raw({ durationMs: -1 }))).toBe(null);
    expect(decideSample(raw({ durationMs: 4_000_000 }))).toBe(null);
    expect(decideSample(raw({ durationMs: Number.NaN }))).toBe(null);
  });

  it('ne propage jamais d’exception, même sur une entrée vide', () => {
    expect(() => decideSample({ url: '', method: '', statusCode: 0, durationMs: 0 })).not.toThrow();
    expect(decideSample({ url: '', method: '', statusCode: 0, durationMs: 0 })).toBe(null);
    expect(() => decideSamples([])).not.toThrow();
    expect(decideSamples([raw(), raw({ url: '/espace/systeme' }), raw({ method: 'HEAD' })])).toHaveLength(1);
    expect(MAX_BUFFERED_SAMPLES).toBeGreaterThan(0);
  });
});
