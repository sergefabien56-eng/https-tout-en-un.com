import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { APP_NAME, APP_SHORT_NAME, appConfig } from '@/core/config/app.config';

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('nom officiel — une seule source de vérité', () => {
  it('le nom officiel et le nom court sont ceux attendus', () => {
    expect(APP_NAME).toBe('TOUT EN UN BUSINESS MANAGER');
    expect(APP_SHORT_NAME).toBe('TOUT EN UN');
    expect(appConfig.name).toBe(APP_NAME);
  });

  it('le nom officiel n’est écrit en dur nulle part ailleurs dans src/', () => {
    const offenders = walk(join(process.cwd(), 'src'))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => !file.endsWith(join('config', 'app.config.ts')))
      .filter((file) => readFileSync(file, 'utf8').includes('TOUT EN UN BUSINESS MANAGER'));
    expect(offenders).toEqual([]);
  });

  it('les décisions de la Phase 0 sont appliquées et modifiables en un seul endroit', () => {
    expect(appConfig.densityDefault).toBe('confort');
    expect(appConfig.sidebarDefault).toBe('complete');
    expect(appConfig.breakpoints.railForcedBelow).toBe(1280);
    expect(appConfig.referenceCurrency).toBe('XOF');
    expect(appConfig.timezone).toBe('Africa/Abidjan');
  });
});
