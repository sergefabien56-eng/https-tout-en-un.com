import ExcelJS from 'exceljs';
import { ValidationError } from '@/core/errors/app-error';
import { safeXlsxText } from '@/core/export/safe-xlsx';
import { loadAuthorizedShopExport, type ShopExport, type ShopExportFilters } from '@/modules/identity/export-shops';

/** Excel du même instantané autorisé et filtré que le CSV. */
export async function formatShopExportXlsx(data: ShopExport): Promise<Uint8Array<ArrayBuffer>> {
  if (data.shops.length > 10_000) throw new ValidationError('Export trop volumineux. Affinez les filtres.');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Boutiques', { views: [{ state: 'frozen', ySplit: 7 }] });
  const add = (values: string[]) => sheet.addRow(values.map(safeXlsxText));
  add(['Périmètre', 'Boutiques accessibles et exportables']);
  add(['Période', 'Sans période — instantané']);
  add(['Exporté le UTC', data.exportedAt]);
  add(['Recherche', data.q || 'Non filtrée']);
  add(['État', data.status ?? 'Tous']);
  add(['Tri', data.sort]);
  add(['Identifiant', 'Boutique', 'Pays', 'Devise', 'État', 'Ventes et commandes']);
  for (const shop of data.shops)
    add([shop.id, shop.display_name, shop.country_code, shop.currency, shop.status, '—']);
  sheet.getRow(7).font = { bold: true };
  sheet.columns.forEach((column, i) => { column.width = i === 1 ? 34 : 24; });
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export async function exportOwnShopsXlsx(token: string | undefined, filters: ShopExportFilters = {}): Promise<Uint8Array<ArrayBuffer>> {
  return formatShopExportXlsx(await loadAuthorizedShopExport(token, filters));
}
