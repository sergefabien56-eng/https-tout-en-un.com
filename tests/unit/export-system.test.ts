import { describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';
import { PDFDocument, PDFPage } from 'pdf-lib';
import type { DeepHealth } from '@/modules/monitoring/deep-health';
import { formatSystemCsv, formatSystemXlsx, systemExportRows } from '@/modules/monitoring/export-system';
import { formatSystemPdf } from '@/modules/monitoring/export-system-pdf';

const fixture: DeepHealth = { version: '0.1.0', environment: 'staging', database: 'ok',
  databaseQueryMs: 12, migrationsApplied: 12, checkedAt: '2026-01-02T03:04:05.000Z',
  queue: { activeBuckets: 2, attemptsInWindow: 5, windowStart: '2026-01-02T03:00:00.000Z',
    windowMinutes: 15, attemptsLimit: 10, bucketsAtLimit: 0, keyKind: 'empreinte',
    limits: 'Limitation de connexion uniquement : aucun worker, aucune tâche planifiée, aucune reprise.' },
  globalEventsRecorded: 0, globalCriticalOpen: 0, globalWarningsOpen: 0 };
describe('instantané Système et formats', () => {
  it('reproduit le périmètre contrôlé, sans détails non prévus ni fausse santé', () => {
    const rows = systemExportRows({ ...fixture, secret: 'SENSITIVE_FIXTURE' } as DeepHealth);
    const data = JSON.stringify(rows);
    expect(data).toContain('2026-01-02T03:04:05.000Z'); expect(data).toContain('Préproduction');
    expect(data).toContain('Indisponible — worker non livré');
    // Le collecteur d'incidents existe désormais : l'export dit ce qu'il couvre, pas « indisponible ».
    expect(data).toContain('Erreurs serveur des routes API et exports uniquement');
    expect(data).not.toContain('SENSITIVE_FIXTURE');
    expect(formatSystemCsv(fixture)).toContain('"Incidents globaux enregistrés","0"');
    // Un compteur illisible n'est plus rendu « Indisponible » dans l'export : le type l'interdit,
    // et une valeur négative est refusée plus bas. Aucun zéro n'est fabriqué à la place.
    expect(() => systemExportRows({ ...fixture, globalEventsRecorded: -1 })).toThrow();
    // La file de limitation est une mesure réelle ; son absence doit rester explicite.
    expect(formatSystemCsv(fixture)).toContain('"Limitation de connexion — seaux actifs","2"');
    expect(formatSystemCsv({ ...fixture, queue: null })).toContain('"Limitation de connexion — seaux actifs","Indisponible"');
    // Aucune empreinte ni adresse ne doit jamais sortir, même si le type le permettait.
    expect(JSON.stringify(systemExportRows(fixture))).not.toMatch(/[0-9a-f]{32}/);
  });
  it.each(['=cmd', '+1', '@x', '-1', '  =cmd'])('neutralise %s dans les trois formats', async (version) => {
    const data = { ...fixture, version };
    expect(formatSystemCsv(data)).toContain(`"'${version}"`);
    const book = new ExcelJS.Workbook(); await book.xlsx.load((await formatSystemXlsx(data)).buffer);
    expect(book.getWorksheet('Système')!.getCell('B5').value).toBe(`'${version}`);
    const spy = vi.spyOn(PDFPage.prototype, 'drawText');
    try {
      const pdf = await formatSystemPdf(data);
      expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
      expect(spy.mock.calls.map(([text]) => text)).toContain(`'${version}`);
    } finally { spy.mockRestore(); }
  });
  it('refuse les dates, nombres et caractères PDF non représentables', async () => {
    expect(() => systemExportRows({ ...fixture, checkedAt: '2026-02-31T00:00:00.000Z' })).toThrow();
    expect(() => systemExportRows({ ...fixture, globalWarningsOpen: NaN })).toThrow();
    expect(() => systemExportRows({ ...fixture, migrationsApplied: -1 })).toThrow();
    for (const version of ['a'.repeat(255), 'v\u0001', '🛒'])
      await expect(formatSystemPdf({ ...fixture, version })).rejects.toThrow();
  });
});
