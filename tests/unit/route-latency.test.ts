/** Mesure de latence : normalisation des chemins, calculs d'agrégat, et garde du générateur. */
import { describe, expect, it } from 'vitest';
import {
  LATENCY_BUCKET_MS, LATENCY_RETENTION_MS, SLOW_SAMPLE_MS,
  bucketStartOf, normalizeRoutePath, statusClassOf,
} from '@/modules/monitoring/route-latency';

describe('normalisation des chemins mesurés', () => {
  it('reconnaît une route déclarée et ignore un identifiant réel', () => {
    expect(normalizeRoutePath('/api/health')).toBe('health');
    expect(normalizeRoutePath('/api/admin/users/42/status')).toBe('admin/users/[id]/status');
    expect(normalizeRoutePath('/api/shops/7/audit')).toBe('shops/[shopId]/audit');
  });

  it('renvoie null hors API et pour une route non déclarée', () => {
    // Aucune ligne n'est créée pour une route inconnue : pas de seau fantôme, pas de fuite.
    expect(normalizeRoutePath('/espace/systeme')).toBeNull();
    expect(normalizeRoutePath('/api/inconnue')).toBeNull();
    expect(normalizeRoutePath('/api/')).toBeNull();
  });

  it('n’accepte pas un identifiant qui ressemble à un segment déclaré', () => {
    // `/api/admin/users/export` est une vraie route : elle ne doit pas être confondue
    // avec `admin/users/[id]`, sinon la mesure mentirait sur ce qui a été exécuté.
    expect(normalizeRoutePath('/api/admin/users/export')).toBe('admin/users/export');
    expect(normalizeRoutePath('/api/admin/users/999')).toBe('admin/users/[id]');
  });
});

describe('classes de statut et tranches', () => {
  it('regroupe les codes par classe et refuse le hors-bornes', () => {
    expect([200, 299].map(statusClassOf)).toEqual([2, 2]);
    expect([301, 404, 503].map(statusClassOf)).toEqual([3, 4, 5]);
    expect(statusClassOf(99)).toBeNull();
    expect(statusClassOf(600)).toBeNull();
    expect(statusClassOf(Number.NaN)).toBeNull();
  });

  it('aligne la tranche sur 5 minutes et fixe des constantes cohérentes', () => {
    const bucket = bucketStartOf(new Date('2026-11-18T12:07:42.500Z'));
    expect(bucket.toISOString()).toBe('2026-11-18T12:05:00.000Z');
    expect(LATENCY_BUCKET_MS).toBe(300_000);
    expect(SLOW_SAMPLE_MS).toBe(1_000);
    // La rétention reste bornée : une table de mesure sans purge est un défaut.
    expect(LATENCY_RETENTION_MS).toBe(86_400_000);
  });
});
