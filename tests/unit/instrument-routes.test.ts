/** Branchement de la mesure HTTP : décisions de mesure, sans serveur ni base. */
import { describe, expect, it, vi } from 'vitest';
import type * as RouteLatency from '@/modules/monitoring/route-latency';

type Recorded = { routeKey: string; method: string; statusClass: number; durationMs: number };
const recorded: Recorded[] = [];
vi.mock('@/modules/monitoring/route-latency', async (importOriginal) => {
  const original = await importOriginal() as typeof RouteLatency;
  return { ...original, recordRouteLatency: async (input: Recorded) => { recorded.push(input); } };
});
const { measureRequest } = await import('@/modules/monitoring/instrument-routes');

type Listener = () => void;
function fakeResponse(statusCode: number) {
  const listeners: Listener[] = [];
  const response = {
    statusCode,
    on: (_event: string, listener: Listener) => { listeners.push(listener); return response; },
    emit: () => { listeners.forEach((listener) => listener()); },
  };
  return response;
}

describe('mesure HTTP des routes API', () => {
  it('mesure une route déclarée à la fin réelle de la réponse', () => {
    recorded.length = 0;
    const response = fakeResponse(200);
    const decided = measureRequest('/api/admin/users/42/status?x=1', 'PATCH', response, 0, () => 12.4);
    expect(decided).toBe(true);
    expect(recorded).toHaveLength(0); // rien n'est écrit avant la fin de la réponse
    response.emit();
    expect(recorded).toEqual([{ routeKey: 'admin/users/[id]/status', method: 'PATCH', statusClass: 2, durationMs: 12.4 }]);
  });

  it('écarte les pages, les routes non déclarées et les méthodes non suivies', () => {
    recorded.length = 0;
    expect(measureRequest('/espace/systeme', 'GET', fakeResponse(200), 0)).toBe(false);
    expect(measureRequest('/api/inconnue', 'GET', fakeResponse(404), 0)).toBe(false);
    expect(measureRequest('/api/health', 'HEAD', fakeResponse(200), 0)).toBe(false);
    expect(recorded).toHaveLength(0);
  });

  it('n’écrit rien pour un statut inexploitable', () => {
    recorded.length = 0;
    const response = fakeResponse(0);
    measureRequest('/api/health', 'GET', response, 0);
    response.emit();
    expect(recorded).toHaveLength(0);
  });

  it('ne propage jamais une erreur de mesure', () => {
    expect(() => measureRequest(undefined, undefined, fakeResponse(200), 0)).not.toThrow();
    expect(() => measureRequest('/api/health', 'GET', {} as never, 0)).not.toThrow();
  });
});
