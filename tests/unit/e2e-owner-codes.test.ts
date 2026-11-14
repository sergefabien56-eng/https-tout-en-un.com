import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { ownerRecoveryIndex } from '../e2e/owner-codes';

describe('réservation des codes propriétaire CI', () => {
  it('réserve douze indices distincts par scénario, écran et tentative', () => {
    const indices = ([0, 1, 2] as const).flatMap((scenario) =>
      [0, 1].flatMap((retry) => ['bureau', 'mobile-375'].map((project) => ownerRecoveryIndex(scenario, retry, project))));
    expect(indices).toEqual(Array.from({ length: 12 }, (_, index) => index));
  });
  it('refuse une tentative ou un projet non prévus', () => {
    expect(() => ownerRecoveryIndex(1, 2, 'bureau')).toThrow();
    expect(() => ownerRecoveryIndex(1, -1, 'bureau')).toThrow();
    expect(() => ownerRecoveryIndex(1, 0, 'autre')).toThrow();
  });
  it('interdit la fixture hors CI ou hors base jetable avant tout accès au fichier', () => {
    const run = (env: Record<string, string>) => spawnSync(process.execPath, ['scripts/extend-e2e-recovery.mjs'], {
      cwd: process.cwd(), env: { ...process.env, ...env }, encoding: 'utf8',
    });
    const outside = run({ CI: 'false', APP_ENV: 'staging', DATABASE_URL_ADMIN: 'postgres://test:test@localhost/tout_en_un_test' });
    expect(outside.status).not.toBe(0);
    expect(outside.stderr).toContain('environnement CI jetable requis');
    const realDb = run({ CI: 'true', APP_ENV: 'staging', DATABASE_URL_ADMIN: 'postgres://test:test@other-host/production' });
    expect(realDb.status).not.toBe(0);
    expect(realDb.stderr).toContain('base de test locale requise');
  });
});
