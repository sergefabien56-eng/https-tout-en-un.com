/** Export d'un instantané Système : propriétaire global + deux permissions globales. */
import type { PoolClient } from 'pg';
import ExcelJS from 'exceljs';
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { ForbiddenError, ValidationError } from '@/core/errors/app-error';
import { safeCsvCell } from '@/core/export/safe-csv';
import { safeXlsxText } from '@/core/export/safe-xlsx';
import { readDeepHealth, type DeepHealth } from '@/modules/monitoring/deep-health';

async function checkExportGrant(db: PoolClient, userId: string): Promise<void> {
  const result = await db.query<{ owner: boolean; can_export: boolean }>(`SELECT
    EXISTS (SELECT 1 FROM user_roles WHERE user_id=$1 AND role_code='owner' AND shop_id IS NULL) AS owner,
    EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_code=ur.role_code
      WHERE ur.user_id=$1 AND ur.shop_id IS NULL AND rp.permission_code='reports:export') AS can_export`, [userId]);
  if (!result.rows[0]?.owner || !result.rows[0]?.can_export) throw new ForbiddenError('Export non autorisé.');
}

export async function canExportSystem(token: string | undefined): Promise<boolean> {
  try {
    return await withAuthorizedGlobalTransaction({ token, permission: 'system:manage' }, async (db, { userId }) => {
      await checkExportGrant(db, userId); return true;
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return false;
    throw error;
  }
}

export async function loadAuthorizedSystemExport(token: string | undefined): Promise<DeepHealth> {
  return withAuthorizedGlobalTransaction({ token, permission: 'system:manage' }, async (db, { userId }) => {
    await checkExportGrant(db, userId);
    return readDeepHealth(db);
  });
}

/** Projection explicite : jamais d'événement détaillé, de boutique ou de configuration secrète. */
export function systemExportRows(data: DeepHealth): string[][] {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(data.checkedAt) ||
    Number.isNaN(Date.parse(data.checkedAt)) || new Date(data.checkedAt).toISOString() !== data.checkedAt) throw new ValidationError('Date de contrôle invalide.');
  const measurements = [data.migrationsApplied, data.databaseQueryMs];
  const counters = [data.globalEventsRecorded, data.globalCriticalOpen, data.globalWarningsOpen];
  if (measurements.some((n) => !Number.isSafeInteger(n) || n < 0) ||
    counters.some((n) => n !== null && (!Number.isSafeInteger(n) || n < 0))) throw new ValidationError('Compteur système invalide.');
  const env = { development: 'Développement', staging: 'Préproduction', production: 'Production' }[data.environment];
  if (!env || data.database !== 'ok' || data.queue !== 'indisponible') throw new ValidationError('État système invalide.');
  return [
    ['Périmètre', 'Instance — accès Propriétaire'],
    ['Période', 'Sans période — instantané'],
    ['Contrôlé et exporté le UTC', data.checkedAt],
    ['Indicateur', 'Valeur'],
    ['Version du code', data.version],
    ['Environnement déclaré', env],
    ['Base de données', 'Requête de contrôle réussie'],
    ['Migrations appliquées', String(data.migrationsApplied)],
    ['Durée de la requête de contrôle', `${data.databaseQueryMs} ms`],
    ['Événements globaux enregistrés', data.globalEventsRecorded === null ? 'Indisponible' : String(data.globalEventsRecorded)],
    ['Critiques non acquittés', data.globalCriticalOpen === null ? 'Indisponible' : String(data.globalCriticalOpen)],
    ['Avertissements non acquittés', data.globalWarningsOpen === null ? 'Indisponible' : String(data.globalWarningsOpen)],
    ['File de tâches', 'Indisponible — worker non livré'],
    ['Tâches en attente', 'Indisponibles'],
    ['Collecteur d’erreurs', 'Indisponible'],
    ['Limites', 'Contrôle ponctuel ; aucun hébergement ni sauvegarde vérifié.'],
    ['Événements globaux', 'Compteurs indisponibles ; aucun collecteur d’erreurs livré.'],
  ];
}

export function formatSystemCsv(data: DeepHealth): string {
  return `\uFEFF${systemExportRows(data).map((row) => row.map(safeCsvCell).join(',')).join('\r\n')}\r\n`;
}
export async function formatSystemXlsx(data: DeepHealth): Promise<Uint8Array<ArrayBuffer>> {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Système', { views: [{ state: 'frozen', ySplit: 4 }] });
  for (const row of systemExportRows(data)) sheet.addRow(row.map(safeXlsxText));
  sheet.getRow(4).font = { bold: true }; sheet.getColumn(1).width = 36; sheet.getColumn(2).width = 72;
  sheet.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
  return new Uint8Array(await book.xlsx.writeBuffer());
}
export async function exportSystemCsv(token: string | undefined): Promise<string> {
  return formatSystemCsv(await loadAuthorizedSystemExport(token));
}
export async function exportSystemXlsx(token: string | undefined): Promise<Uint8Array<ArrayBuffer>> {
  return formatSystemXlsx(await loadAuthorizedSystemExport(token));
}
