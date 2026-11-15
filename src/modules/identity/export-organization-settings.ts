/** Export borné des paramètres d'organisation déjà exposés par l'écran. */
import { withAuthorizedGlobalTransaction } from '@/core/auth/authorize-global';
import { ForbiddenError } from '@/core/errors/app-error';
import { safeCsvCell } from '@/core/export/safe-csv';
import { parseOrganizationName } from '@/modules/identity/organization-name';
import { TIMEZONES, type OrganizationTimezone } from '@/modules/identity/organization-timezones';

export interface OrganizationSettingsExport {
  name: string | null;
  timezone: OrganizationTimezone | null;
  exportedAt: string;
}

/** La sélection explicite empêche d'exporter les autres clés d'app_settings. */
export async function loadAuthorizedOrganizationSettingsExport(token: string | undefined): Promise<OrganizationSettingsExport> {
  return withAuthorizedGlobalTransaction({ token, permission: 'settings:read' }, async (db, { userId }) => {
    const grant = await db.query<{ allowed: boolean }>(`SELECT EXISTS (
      SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_code = ur.role_code
      WHERE ur.user_id = $1 AND ur.shop_id IS NULL AND rp.permission_code = 'reports:export'
    ) AS allowed`, [userId]);
    if (!grant.rows[0]?.allowed) throw new ForbiddenError('Export non autorisé.');
    // Une seule requête donne une vue cohérente des deux paramètres.
    const result = await db.query<{ key: string; value: unknown }>(
      'SELECT key, value FROM app_settings WHERE key = ANY($1::text[])',
      [['organization.name', 'organization.timezone']],
    );
    const values = new Map(result.rows.map((row) => [row.key, row.value]));
    const rawName = values.get('organization.name');
    const rawTimezone = values.get('organization.timezone');
    return {
      name: rawName === null || rawName === undefined ? null : parseOrganizationName(rawName),
      timezone: TIMEZONES.some((zone) => zone === rawTimezone) ? rawTimezone as OrganizationTimezone : null,
      exportedAt: new Date().toISOString(),
    };
  });
}

export function formatOrganizationSettingsCsv(data: OrganizationSettingsExport): string {
  const rows = [
    ['Périmètre', 'Exporté le UTC', 'Période'],
    ['Organisation — droits globaux', data.exportedAt, 'Sans période — instantané'],
    [],
    ['Paramètre', 'Valeur'],
    ['Nom de l’organisation', data.name ?? 'Non configuré'],
    ['Fuseau horaire de référence', data.timezone ?? 'Non configuré'],
  ];
  return `\uFEFF${rows.map((row) => row.map(safeCsvCell).join(',')).join('\r\n')}\r\n`;
}

export async function exportOrganizationSettingsCsv(token: string | undefined): Promise<string> {
  return formatOrganizationSettingsCsv(await loadAuthorizedOrganizationSettingsExport(token));
}
