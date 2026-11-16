import { directApi } from './direct-api';
import { ownerRecoveryIndex } from './owner-codes';
import { readFileSync, readdirSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { expectNoSeriousAccessibilityViolations } from './accessibility';

// Seulement en CI : utilisateur et codes FICTIFS créés dans une base PostgreSQL jetable.
// Jamais exécuté contre une base réelle de production.
/** Quatre codes réservés par scénario : bureau/mobile et première tentative/retry. */
async function loginOwner(page: Page, testInfo: TestInfo, scenario: 0 | 1 | 2 | 3): Promise<void> {
  const codes = readFileSync(process.env.E2E_RECOVERY_FILE!, 'utf8').trim().split('\n');
  const index = ownerRecoveryIndex(scenario, testInfo.retry, testInfo.project.name);
  const code = codes[index];
  expect(code).toMatch(/^[A-Za-z0-9_-]{22}$/);
  await page.goto('/connexion');
  await page.getByLabel('Adresse e-mail').fill('proprietaire@ci.invalid');
  await page.getByLabel('Mot de passe').fill('MotDePasseCI!2026');
  await page.getByLabel('Code à 6 chiffres ou code de secours').fill(code!);
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeEnabled();
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/espace$/);
  await expect(page.locator('.topbar-user')).toHaveText('Propriétaire CI');
}

test('propriétaire CI : connexion 2FA, notifications et recherche utilisateurs', async ({ page }, testInfo) => {
  // Laisser une marge aux navigations Next dev sous charge CI ; les assertions restent strictes.
  test.setTimeout(120_000);
  test.skip(!process.env.E2E_RECOVERY_FILE, 'PostgreSQL CI + bootstrap requis.');
  await loginOwner(page, testInfo, 0);
  await page.getByRole('button', { name: 'Actions rapides' }).click();
  const quickActions = page.getByRole('navigation', { name: 'Actions rapides' });
  await expect(quickActions.getByRole('link', { name: 'Mes sessions' })).toHaveAttribute('href', '/espace/sessions');
  await expect(quickActions.getByRole('link', { name: 'Utilisateurs' })).toHaveAttribute('href', '/espace/utilisateurs');
  await expect(quickActions.getByText('Journal · sélectionner une boutique')).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Escape');
  await expect(quickActions).toBeHidden();
  const notificationLink = page.getByRole('link', { name: /^Mes notifications : (?:plus de 99|\d+) non lues?$/ });
  await expect(notificationLink).toBeVisible();
  await notificationLink.click();
  await expect(page.getByRole('heading', { name: 'Mes notifications' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nouvelle connexion' }).first()).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  const noticeResponse = await directApi(page.request).get('/api/notifications');
  expect(noticeResponse.status()).toBe(200);
  const notices = await noticeResponse.json() as { notifications: { id: string; kind: string; message: string; readAt: string | null }[] };
  expect(notices.notifications.some((n) => n.kind === 'security_login')).toBe(true);
  expect(JSON.stringify(notices)).not.toMatch(/token_hash|totp_secret|user_agent/);
  // La liste visible peut précéder la toute dernière notification API pendant une navigation
  // App Router. Choisir la ligne réellement affichée et vérifier son appartenance au compte.
  const firstVisibleNotice = page.locator('.notification-list > li').first();
  const visibleId = await firstVisibleNotice.getAttribute('data-notification-id');
  expect(visibleId).toMatch(/^[1-9]\d*$/);
  const firstNotice = notices.notifications.find((notice) => notice.id === visibleId);
  expect(firstNotice, 'La notification affichée doit appartenir au compte autorisé').toBeDefined();
  expect((await directApi(page.request).get('/api/notifications?filter=incorrect')).status()).toBe(400);
  const initialFilter = firstNotice?.readAt ? 'read' : 'unread';
  const initialFiltered = await directApi(page.request).get(`/api/notifications?filter=${initialFilter}`);
  expect(initialFiltered.status()).toBe(200);
  expect((await initialFiltered.json() as { notifications: { id: string }[] }).notifications.some((n) => n.id === firstNotice?.id)).toBe(true);
  // Figée par ID si un rafraîchissement remplace entre-temps la première ligne.
  const action = page.locator(`.notification-list > li[data-notification-id="${visibleId}"]`).getByRole('button',
    { name: firstNotice?.readAt ? 'Marquer comme non lue' : 'Marquer comme lue' });
  await expect(action).toBeEnabled();
  const [mutation] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/notifications/')
      && response.url().endsWith('/read') && response.request().method() === 'POST', { timeout: 15_000 }),
    action.click(),
  ]);
  expect(mutation.url()).toContain(`/api/notifications/${firstNotice?.id}/read`);
  expect(mutation.status()).toBe(200);
  await expect.poll(async () => {
    const result = await directApi(page.request).get('/api/notifications');
    const data = await result.json() as { notifications: { id: string; readAt: string | null }[] };
    return Boolean(data.notifications.find((n) => n.id === firstNotice?.id)?.readAt);
  }).toBe(!firstNotice?.readAt);
  // Rechargement complet : relit le serveur, sans laisser croire à un flux temps réel.
  await page.getByRole('link', { name: 'Actualiser les notifications' }).click();
  await expect(page).toHaveURL(/\/espace\/notifications\?filter=all&page=1$/);
  await expect(page.locator(`.notification-list > li[data-notification-id="${visibleId}"]`))
    .toContainText(firstNotice?.readAt ? 'Non lue' : 'Lue');
  const targetFilter = firstNotice?.readAt ? 'unread' : 'read';
  const filterLink = page.getByRole('navigation', { name: 'Filtrer les notifications' }).getByRole('link',
    { name: firstNotice?.readAt ? 'Non lues' : 'Lues', exact: true });
  await expect(filterLink).toHaveAttribute('href', `/espace/notifications?filter=${targetFilter}`);
  // Les filtres sont des liens document natifs : ne pas cliquer sur Actualiser
  // tant que la navigation précédente n'a pas réellement terminé son chargement.
  const [filteredDocument] = await Promise.all([
    page.waitForNavigation({ url: new RegExp(`/espace/notifications\\?filter=${targetFilter}$`),
      waitUntil: 'domcontentloaded', timeout: 15_000 }),
    filterLink.click(),
  ]);
  expect(filteredDocument?.status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`filter=${targetFilter}$`));
  await expect(page.locator('.notification-list > li').first()).toBeVisible();
  const refreshFiltered = page.getByRole('link', { name: 'Actualiser les notifications' });
  await expect(refreshFiltered).toHaveAttribute('href', `/espace/notifications?filter=${targetFilter}&page=1`);
  // <a href> impose une navigation document complète. Attendre son achèvement et
  // sa réponse, pas seulement le retour de click() alors que l'ancienne URL demeure.
  const [refreshedDocument] = await Promise.all([
    page.waitForNavigation({ url: new RegExp(`/espace/notifications\\?filter=${targetFilter}&page=1$`),
      waitUntil: 'domcontentloaded', timeout: 15_000 }),
    refreshFiltered.click(),
  ]);
  expect(refreshedDocument?.status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`filter=${targetFilter}&page=1$`));
  await expect(page.locator(`.notification-list > li[data-notification-id="${visibleId}"]`)).toBeVisible();
  const afterFilter = await directApi(page.request).get(`/api/notifications?filter=${targetFilter}`);
  expect((await afterFilter.json() as { notifications: { id: string }[] }).notifications.some((n) => n.id === firstNotice?.id)).toBe(true);
  await page.goto('/espace');

  if (testInfo.project.name === 'mobile-375') {
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  }
  await page.getByRole('button', { name: 'Administration' }).click();
  await page.getByRole('link', { name: 'Utilisateurs' }).click();
  await expect(page).toHaveURL(/\/espace\/utilisateurs$/);
  await expect(page.getByRole('heading', { name: 'Utilisateurs' })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('proprietaire@ci.invalid');
  await expectNoSeriousAccessibilityViolations(page);
  const response = await directApi(page.request).get('/api/admin/users');
  expect(response.status()).toBe(200);
  const result = await response.json() as { users: { id: string; email: string }[] };
  expect(result.users[0]?.email).toBe('proprietaire@ci.invalid');
  const filteredUsers = await directApi(page.request).get('/api/admin/users?q=proprietaire');
  expect(filteredUsers.status()).toBe(200);
  expect((await filteredUsers.json() as { users: { email: string }[] }).users.map((u) => u.email))
    .toEqual(['proprietaire@ci.invalid']);
  expect((await directApi(page.request).get('/api/admin/users?q=%0A')).status()).toBe(400);
  const activeUsers = await directApi(page.request).get('/api/admin/users?status=active&q=proprietaire');
  expect((await activeUsers.json() as { users: { email: string }[] }).users.map((u) => u.email))
    .toEqual(['proprietaire@ci.invalid']);
  expect((await directApi(page.request).get('/api/admin/users?status=invited')).status()).toBe(200);
  expect((await directApi(page.request).get('/api/admin/users?status=unexpected')).status()).toBe(400);
  const ownerRole = await directApi(page.request).get('/api/admin/users?role=owner&status=active');
  expect(ownerRole.status()).toBe(200);
  expect((await ownerRole.json() as { users: { email: string }[] }).users.map((u) => u.email))
    .toEqual(['proprietaire@ci.invalid']);
  expect((await directApi(page.request).get('/api/admin/users?role=manager')).status()).toBe(200);
  expect((await directApi(page.request).get('/api/admin/users?role=invalid')).status()).toBe(400);
  await page.getByRole('searchbox', { name: 'Rechercher un utilisateur' }).fill('proprietaire');
  await page.getByRole('search').getByRole('button', { name: 'Filtrer' }).click();
  await expect(page).toHaveURL(/q=proprietaire/);
  await expect(page.getByRole('table')).toContainText('proprietaire@ci.invalid');
  await page.getByRole('combobox', { name: 'Statut du compte' }).selectOption('invited');
  await page.getByRole('search').getByRole('button', { name: 'Filtrer' }).click();
  await expect(page).toHaveURL(/status=invited/);
  await expect(page.getByRole('status')).toContainText('Aucun compte ne correspond à ces filtres.');
  await page.getByRole('combobox', { name: 'Statut du compte' }).selectOption('active');
  await page.getByRole('search').getByRole('button', { name: 'Filtrer' }).click();
  await expect(page).toHaveURL(/status=active/);
  await expect(page.getByRole('table')).toContainText('proprietaire@ci.invalid');
  await page.getByRole('combobox', { name: 'Rôle attribué' }).selectOption('manager');
  await page.getByRole('search').getByRole('button', { name: 'Filtrer' }).click();
  await expect(page).toHaveURL(/role=manager/);
  await expect(page.getByRole('status')).toContainText('Aucun compte ne correspond à ces filtres.');
  await page.getByRole('combobox', { name: 'Rôle attribué' }).selectOption('owner');
  await page.getByRole('search').getByRole('button', { name: 'Filtrer' }).click();
  await expect(page).toHaveURL(/status=active&role=owner/);
  await expect(page.getByRole('table')).toContainText('proprietaire@ci.invalid');
  const usersExportLink = page.getByRole('link', { name: /Exporter les utilisateurs correspondant aux filtres en CSV/ });
  await expect(usersExportLink).toHaveAttribute('href', /status=active&role=owner/);
  const usersCsv = await directApi(page.request).get(await usersExportLink.getAttribute('href') ?? '');
  expect(usersCsv.status()).toBe(200);
  expect(usersCsv.headers()['cache-control']).toBe('no-store');
  expect(usersCsv.headers()['content-type']).toContain('text/csv');
  const usersCsvText = await usersCsv.text();
  expect(usersCsvText).toContain('proprietaire@ci.invalid');
  expect(usersCsvText).toContain('"Sans période — instantané"');
  expect(usersCsvText).toContain('"active","owner"');
  expect(usersCsvText).not.toMatch(/password_hash|token_hash|totp_secret/);
  expect((await directApi(page.request).get('/api/admin/users/export?role=WRONG')).status()).toBe(400);
  const usersXlsxLink = page.getByRole('link', { name: 'Exporter les utilisateurs correspondant aux filtres en Excel' });
  await expect(usersXlsxLink).toHaveAttribute('href', /\/api\/admin\/users\/export\/xlsx\?.*status=active&role=owner/);
  const usersXlsx = await directApi(page.request).get(await usersXlsxLink.getAttribute('href') ?? '');
  expect(usersXlsx.status()).toBe(200);
  expect(usersXlsx.headers()['cache-control']).toBe('no-store');
  expect(usersXlsx.headers()['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const usersWorkbook = new ExcelJS.Workbook(); await usersWorkbook.xlsx.load(Uint8Array.from(await usersXlsx.body()).buffer);
  const usersSheet = usersWorkbook.getWorksheet('Utilisateurs')!;
  expect(usersSheet.getColumn(3).values).toContain('proprietaire@ci.invalid');
  expect(usersSheet.getCell('B5').value).toBe('active'); expect(usersSheet.getCell('B6').value).toBe('owner');
  expect((await directApi(page.request).get('/api/admin/users/export/xlsx?role=WRONG')).status()).toBe(400);
  const usersPdfLink = page.getByRole('link', { name: /Exporter les utilisateurs correspondant aux filtres en PDF/ });
  await expect(usersPdfLink).toHaveAttribute('href', /\/api\/admin\/users\/export\/pdf\?.*status=active&role=owner/);
  const usersPdf = await directApi(page.request).get(await usersPdfLink.getAttribute('href') ?? '');
  expect(usersPdf.status()).toBe(200);
  expect(usersPdf.headers()['cache-control']).toBe('no-store');
  expect(usersPdf.headers()['content-type']).toBe('application/pdf');
  expect((await usersPdf.body()).subarray(0, 5).toString('ascii')).toBe('%PDF-');
  expect((await directApi(page.request).get('/api/admin/users/export/pdf?role=WRONG')).status()).toBe(400);
  await page.getByRole('table').getByRole('link', { name: 'Propriétaire CI', exact: true }).click();
  await expect(page).toHaveURL(/\/espace\/utilisateurs\/[1-9]\d*$/);
  await expect(page.getByRole('heading', { name: 'Propriétaire CI' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Global (toutes les boutiques)')).toBeVisible();
  // Les séquences PostgreSQL ne sont PAS rembobinées par ROLLBACK : la fixture RLS
  // peut consommer l'ID 1. Ne jamais supposer que le propriétaire porte cet ID.
  const ownerId = result.users.find((entry) => entry.email === 'proprietaire@ci.invalid')?.id;
  expect(ownerId).toMatch(/^[1-9]\d*$/);
  const user = await directApi(page.request).get(`/api/admin/users/${ownerId}`);
  expect(user.status()).toBe(200);
  expect((await user.json() as { roles: { shopId: string | null }[] }).roles[0]?.shopId).toBeNull();
  await expect(page.getByRole('button', { name: /Suspendre et déconnecter|Réactiver/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Accès individuel à l’annuaire complet' })).toHaveCount(0);
  expect((await directApi(page.request).put(`/api/admin/users/${ownerId}/directory-access`,
    { data: { expected: false, granted: true } })).status()).toBe(403);
  await expect(page.getByRole('heading', { name: 'Attribuer un rôle boutique' })).toHaveCount(0);
  expect((await directApi(page.request).post(`/api/admin/users/${ownerId}/shop-roles`,
    { data: { shopId: '1', roleCode: 'manager', grant: true } })).status()).toBe(403);
  // Rôles globaux : compte protégé et mutation interdite sans Origin/CSRF.
  await expect(page.getByRole('heading', { name: 'Attribuer un rôle global' })).toHaveCount(0);
  expect((await directApi(page.request).post(`/api/admin/users/${ownerId}/global-roles`,
    { data: { roleCode: 'manager', grant: true } })).status()).toBe(403);
  // Accès indépendants : carte absente sur un compte protégé, révocation refusée sans Origin/CSRF.
  await expect(page.getByRole('heading', { name: 'Accès boutiques' })).toHaveCount(0);
  expect((await directApi(page.request).delete(`/api/admin/users/${ownerId}/shop-access`,
    { data: { shopId: '1' } })).status()).toBe(403);
  expect((await directApi(page.request).post(`/api/admin/users/${ownerId}/shop-access`,
    { data: { shopId: '1' } })).status()).toBe(403);
  // Même le propriétaire connecté ne peut écrire sans Origin et jeton CSRF.
  expect((await directApi(page.request).patch(`/api/admin/users/${ownerId}/status`,
    { data: { status: 'suspended' } })).status()).toBe(403);
  // Recherche transversale bornée : comptes avec droit global, boutiques filtrées par RLS.
  await page.goto('/espace/recherche');
  await expect(page.getByRole('heading', { name: 'Rechercher dans mon espace' })).toBeVisible();
  const directoryQuery = page.getByRole('searchbox', { name: 'Boutique, utilisateur, e-mail ou action d’audit' });
  await directoryQuery.fill('proprietaire');
  await page.getByRole('search').getByRole('button', { name: 'Rechercher' }).click();
  await expect(page.getByRole('link', { name: /Propriétaire CI · proprietaire@ci.invalid/ })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await directoryQuery.fill('Boutique CI');
  await page.getByRole('search').getByRole('button', { name: 'Rechercher' }).click();
  await expect(page.getByRole('link', { name: /Boutique CI fictive · CI/ })).toBeVisible();
  await expect(page.getByText('Les commandes, produits et données Jumia ne sont pas encore disponibles.')).toBeVisible();
});

test('propriétaire CI : rôles, système et paramètres', async ({ page }, testInfo) => {
  // Délai global conservé ; les assertions et attentes individuelles restent strictes.
  test.setTimeout(120_000);
  test.skip(!process.env.E2E_RECOVERY_FILE, 'PostgreSQL CI + bootstrap requis.');
  await loginOwner(page, testInfo, 1);
  if (testInfo.project.name === 'mobile-375') await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('button', { name: 'Administration' }).click();
  // Permission owner vérifiée côté serveur, puis page réelle dans les deux tailles d'écran.
  await page.getByRole('link', { name: 'Rôles' }).click();
  await expect(page).toHaveURL(/\/espace\/roles$/);
  await expect(page.getByRole('heading', { name: 'Rôles et permissions' })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Propriétaire');
  // La confirmation peut être annulée sans modifier les droits partagés entre projets CI.
  const edit = page.getByRole('button', { name: /Assistant — Accéder à l’écran Système : .*Modifier/ });
  await expect(edit).toBeEnabled();
  const confirmation = page.waitForEvent('dialog');
  const click = edit.click();
  const dialog = await confirmation;
  expect(dialog.message()).toContain('tous les comptes');
  await dialog.dismiss();
  await click;
  const roles = await directApi(page.request).get('/api/admin/roles');
  expect(roles.status()).toBe(200);
  await expect(page.getByRole('link', { name: 'Exporter la matrice en CSV' }))
    .toHaveAttribute('href', '/api/admin/roles/export');
  const rolesCsv = await directApi(page.request).get('/api/admin/roles/export');
  expect(rolesCsv.status()).toBe(200);
  expect(rolesCsv.headers()['content-type']).toContain('text/csv');
  expect(rolesCsv.headers()['cache-control']).toBe('no-store');
  const rolesCsvText = await rolesCsv.text();
  expect(rolesCsvText).toContain('"Organisation — droits globaux"');
  expect(rolesCsvText).toContain('"Sans période — instantané"');
  expect(rolesCsvText).toContain('"Rôle : Propriétaire (owner)"');
  expect(rolesCsvText).not.toMatch(/password_hash|token_hash|totp_secret/);
  await expect(page.getByRole('link', { name: 'Exporter la matrice en Excel' }))
    .toHaveAttribute('href', '/api/admin/roles/export/xlsx');
  const rolesXlsx = await directApi(page.request).get('/api/admin/roles/export/xlsx');
  expect(rolesXlsx.status()).toBe(200);
  expect(rolesXlsx.headers()['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  expect(rolesXlsx.headers()['cache-control']).toBe('no-store');
  expect((await rolesXlsx.body()).subarray(0, 2).toString('ascii')).toBe('PK');
  await expect(page.getByRole('link', { name: 'Exporter la matrice en PDF' }))
    .toHaveAttribute('href', '/api/admin/roles/export/pdf');
  const rolesPdf = await directApi(page.request).get('/api/admin/roles/export/pdf');
  expect(rolesPdf.status()).toBe(200);
  expect(rolesPdf.headers()['content-type']).toContain('application/pdf');
  expect(rolesPdf.headers()['cache-control']).toBe('no-store');
  expect((await rolesPdf.body()).subarray(0, 5).toString('ascii')).toBe('%PDF-');
  if (testInfo.project.name === 'mobile-375') await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('link', { name: 'Système' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Système', exact: true })).toBeVisible();
  await expect(page.getByText(/File de tâches/)).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  const deep = await directApi(page.request).get('/api/health/deep');
  expect(deep.status()).toBe(200);
  const health = await deep.json() as { database: string; migrationsApplied: number; version: string; environment: string;
    databaseQueryMs: number; queue: string; globalEventsRecorded: number | null; globalCriticalOpen: number | null; globalWarningsOpen: number | null };
  expect(health.database).toBe('ok');
  // La CI doit avoir appliqué toutes les migrations présentes dans le dépôt.
  const expectedMigrations = readdirSync('drizzle').filter((name) => /^\d{4}_.+\.up\.sql$/.test(name)).length;
  expect(expectedMigrations).toBeGreaterThan(0);
  expect(health.migrationsApplied).toBe(expectedMigrations);
  expect(health.queue).toBe('indisponible');
  expect(health.environment).toBe('staging');
  expect(health.databaseQueryMs).toBeGreaterThanOrEqual(0);
  expect(health.globalEventsRecorded).toBeNull();
  expect(health.globalCriticalOpen).toBeNull();
  expect(health.globalWarningsOpen).toBeNull();
  await expect(page.getByRole('heading', { name: 'Événements système globaux enregistrés' })).toBeVisible();
  await expect(page.getByText('Aucun zéro n’est déduit de données masquées.', { exact: false })).toBeVisible();
  await expect(page.getByText('Tâches en attente : indisponibles.', { exact: false })).toBeVisible();
  await expect(page.getByText(health.version, { exact: true })).toBeVisible();
  await expect(page.getByText('Préproduction', { exact: true })).toBeVisible();
  await expect(page.getByText(String(health.migrationsApplied), { exact: true })).toBeVisible();
  await expect(page.getByText('le worker n’est pas encore livré', { exact: false })).toBeVisible();
  for (const [label, suffix] of [['CSV', ''], ['Excel', '/xlsx'], ['PDF', '/pdf']] as const)
    await expect(page.getByRole('link', { name: `Exporter Système en ${label}` })).toHaveAttribute('href', `/api/admin/system/export${suffix}`);
  const [systemCsv, systemXlsx, systemPdf] = await Promise.all(['', '/xlsx', '/pdf'].map((suffix) => directApi(page.request).get(`/api/admin/system/export${suffix}`)));
  for (const response of [systemCsv!, systemXlsx!, systemPdf!]) {
    expect(response.status()).toBe(200); expect(response.headers()['cache-control']).toBe('no-store');
  }
  expect(await systemCsv!.text()).toContain('Indisponible — worker non livré');
  expect((await systemXlsx!.body()).subarray(0, 2).toString('ascii')).toBe('PK');
  expect((await systemPdf!.body()).subarray(0, 5).toString('ascii')).toBe('%PDF-');

  await page.goto('/espace/parametres');
  await expect(page.getByRole('heading', { name: 'Paramètres', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Devise de référence' })).toBeVisible();
  await expect(page.getByText('aucune conversion ni aucun taux', { exact: false })).toBeVisible();
  await expect(page.getByText('les dates des écrans existants restent en UTC', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Nom de l’organisation')).toBeVisible();
  // Le seul projet bureau modifie le paramètre global, pour éviter une course
  // avec le scénario mobile exécuté en parallèle sur la même base CI jetable.
  if (testInfo.project.name === 'bureau') {
    const currencyButton = page.getByRole('button', { name: 'Enregistrer XOF comme devise de référence' });
    const currencyCard = page.locator('.card').filter({ has: page.getByRole('heading', { name: 'Devise de référence' }) });
    if ((await currencyCard.getByText('Valeur enregistrée :', { exact: false }).textContent())?.includes('Non configurée')) {
      await expect(currencyButton).toBeEnabled();
      const [currencyResponse] = await Promise.all([
        page.waitForResponse((response) => response.url().endsWith('/api/admin/settings/reference-currency') && response.request().method() === 'PUT'),
        currencyButton.click(),
      ]);
      expect(currencyResponse.status()).toBe(200);
      await expect(page.getByText('Devise enregistrée.', { exact: true })).toBeVisible();
      await page.reload();
    }
    await expect(currencyButton).toBeDisabled();
    await expect(currencyCard.getByText('Valeur enregistrée :', { exact: false })).toContainText('XOF');
    const name = `Organisation CI ${testInfo.retry}`;
    await page.getByLabel('Nom de l’organisation').fill(name);
    const [nameResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith('/api/admin/settings/organization-name')
        && response.request().method() === 'PUT'),
      page.getByRole('button', { name: 'Enregistrer le nom' }).click(),
    ]);
    expect(nameResponse.status()).toBe(200);
    await expect(page.getByRole('status').filter({ hasText: 'Nom enregistré.' })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Nom de l’organisation')).toHaveValue(name);
    // La même policy d'audit couvre aussi la modification du fuseau global.
    const timezoneSelect = page.getByLabel('Fuseau de référence de l’organisation');
    const nextTimezone = await timezoneSelect.inputValue() === 'UTC' ? 'Europe/Paris' : 'UTC';
    await timezoneSelect.selectOption(nextTimezone);
    const [timezoneResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith('/api/admin/settings')
        && response.request().method() === 'PUT'),
      page.getByRole('button', { name: 'Enregistrer', exact: true }).click(),
    ]);
    expect(timezoneResponse.status()).toBe(200);
    await expect(page.getByText('Fuseau enregistré.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Fuseau de référence de l’organisation')).toHaveValue(nextTimezone);
  }
  expect((await directApi(page.request).put('/api/admin/settings/organization-name', { data: { name: 'Interdit' } })).status()).toBe(403);
  expect((await directApi(page.request).put('/api/admin/settings/reference-currency', { data: { currency: 'XOF' } })).status()).toBe(403);
  await expectNoSeriousAccessibilityViolations(page);
  const settings = await directApi(page.request).get('/api/admin/settings');
  expect(settings.status()).toBe(200);
  expect(Object.keys(await settings.json() as object)).toEqual(['timezone']);
  await expect(page.getByRole('link', { name: 'Exporter les paramètres en CSV' }))
    .toHaveAttribute('href', '/api/admin/settings/export');
  await expect(page.getByRole('link', { name: 'Exporter les paramètres en Excel' }))
    .toHaveAttribute('href', '/api/admin/settings/export/xlsx');
  const settingsCsv = await directApi(page.request).get('/api/admin/settings/export');
  expect(settingsCsv.status()).toBe(200);
  expect(settingsCsv.headers()['content-type']).toContain('text/csv');
  expect(settingsCsv.headers()['cache-control']).toBe('no-store');
  const settingsText = await settingsCsv.text();
  expect(settingsText).toContain('"Sans période — instantané"');
  expect(settingsText).toContain('"Nom de l’organisation"');
  expect(settingsText).not.toMatch(/password_hash|token_hash|totp_secret/);
  const settingsExcel = await directApi(page.request).get('/api/admin/settings/export/xlsx');
  expect(settingsExcel.status()).toBe(200);
  expect(settingsExcel.headers()['content-type']).toContain('spreadsheetml.sheet');
  const settingsWorkbook = new ExcelJS.Workbook(); await settingsWorkbook.xlsx.load(Uint8Array.from(await settingsExcel.body()).buffer);
  const settingsSheet = settingsWorkbook.getWorksheet('Paramètres')!;
  expect(settingsSheet.getCell('A5').value).toBe('Nom de l’organisation');
  expect(settingsSheet.getCell('A6').value).toBe('Fuseau horaire de référence');
  expect(settingsSheet.getCell('A7').value).toBe('Devise de référence');
  const settingsPdfLink = page.getByRole('link', { name: 'Exporter les paramètres en PDF' });
  await expect(settingsPdfLink).toHaveAttribute('href', '/api/admin/settings/export/pdf');
  const settingsPdf = await directApi(page.request).get('/api/admin/settings/export/pdf');
  expect(settingsPdf.status()).toBe(200);
  expect(settingsPdf.headers()['content-type']).toBe('application/pdf');
  expect(settingsPdf.headers()['cache-control']).toBe('no-store');
  expect((await settingsPdf.body()).subarray(0, 5).toString('ascii')).toBe('%PDF-');
  // Aucun changement de paramètre sans Origin et CSRF, même avec la session propriétaire.
  expect((await directApi(page.request).put('/api/admin/settings', { data: { timezone: 'UTC' } })).status()).toBe(403);
});

test('propriétaire CI : boutiques, apparence et recherche par boutique', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!process.env.E2E_RECOVERY_FILE, 'PostgreSQL CI + bootstrap requis.');
  // Connexion indépendante : aucune dépendance à l'ordre ni à la session du test précédent.
  await loginOwner(page, testInfo, 2);
  await page.goto('/espace/boutiques');
  await expect(page.getByRole('heading', { name: 'Toutes les boutiques autorisées' })).toBeVisible();
  await expect(page.getByText('Boutique CI fictive', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Trier les boutiques' }).selectOption('name-asc');
  await page.getByRole('search').getByRole('button', { name: 'Filtrer' }).click();
  await expect(page).toHaveURL(/sort=name-asc/);
  await expect(page.getByRole('table')).toContainText('Boutique CI fictive');
  expect((await directApi(page.request).get('/api/shops?status=&sort=name-asc')).status()).toBe(200);
  expect((await directApi(page.request).get('/api/shops?status=malicious&sort=name-asc')).status()).toBe(400);
  expect((await directApi(page.request).get('/api/shops?sort=name%3BDELETE')).status()).toBe(400);
  await expect(page.getByRole('link', { name: 'Exporter les boutiques autorisées en CSV' }))
    .toHaveAttribute('href', /\/api\/shops\/export\?.*sort=name-asc/);
  const shopsCsv = await directApi(page.request).get('/api/shops/export?status=&sort=name-asc');
  expect(shopsCsv.status()).toBe(200);
  expect(shopsCsv.headers()['content-type']).toContain('text/csv');
  expect(shopsCsv.headers()['cache-control']).toBe('no-store');
  const shopsCsvText = await shopsCsv.text();
  expect(shopsCsvText).toContain('"Sans période — instantané"');
  expect(shopsCsvText).toContain('"Boutique CI fictive","CI","XOF","connected","—"');
  expect((await directApi(page.request).get('/api/shops/export?sort=invalid')).status()).toBe(400);
  await expect(page.getByRole('link', { name: 'Exporter les boutiques autorisées en Excel' }))
    .toHaveAttribute('href', /\/api\/shops\/export\/xlsx\?.*sort=name-asc/);
  const shopsXlsx = await directApi(page.request).get('/api/shops/export/xlsx?status=&sort=name-asc');
  expect(shopsXlsx.status()).toBe(200);
  expect(shopsXlsx.headers()['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  expect(shopsXlsx.headers()['cache-control']).toBe('no-store');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Uint8Array.from(await shopsXlsx.body()).buffer);
  const sheet = workbook.getWorksheet('Boutiques')!;
  expect(sheet.getCell('B8').value).toBe('Boutique CI fictive');
  expect(sheet.getCell('F8').value).toBe('—');
  expect((await directApi(page.request).get('/api/shops/export/xlsx?sort=invalid')).status()).toBe(400);
  const shopsPdfLink = page.getByRole('link', { name: 'Exporter les boutiques autorisées en PDF' });
  await expect(shopsPdfLink).toHaveAttribute('href', /\/api\/shops\/export\/pdf\?.*sort=name-asc/);
  const shopsPdf = await directApi(page.request).get(await shopsPdfLink.getAttribute('href') ?? '');
  expect(shopsPdf.status()).toBe(200);
  expect(shopsPdf.headers()['content-type']).toBe('application/pdf');
  expect(shopsPdf.headers()['cache-control']).toBe('no-store');
  expect((await shopsPdf.body()).subarray(0, 5).toString('ascii')).toBe('%PDF-');
  expect((await directApi(page.request).get('/api/shops/export/pdf?sort=invalid')).status()).toBe(400);
  await page.getByRole('navigation', { name: 'Affichage des boutiques' }).getByRole('link', { name: 'Cartes repliables' }).click();
  await expect(page).toHaveURL(/view=cards/);
  await expect(page).toHaveURL(/sort=name-asc/);
  await expect(page.getByRole('table')).toHaveCount(0);
  const shopCard = page.locator('details.shop-card');
  await expect(shopCard).toHaveCount(1);
  await shopCard.locator('summary').click();
  await expect(shopCard).toHaveAttribute('open', '');
  await expect(shopCard.getByText('— · Indisponibles : aucune donnée Jumia')).toBeVisible();
  await expect(shopCard.getByRole('link', { name: /Voir le journal/ })).toHaveAttribute('href', /shop=\d+/);
  await page.getByRole('combobox', { name: 'Trier les boutiques' }).selectOption('name-desc');
  await page.getByRole('search').getByRole('button', { name: 'Filtrer' }).click();
  await expect(page).toHaveURL(/sort=name-desc/);
  await expect(page).toHaveURL(/view=cards/);
  await expect(page.locator('details.shop-card')).toHaveCount(1);
  await expectNoSeriousAccessibilityViolations(page);
  await page.getByRole('navigation', { name: 'Affichage des boutiques' }).getByRole('link', { name: 'Tableau' }).click();
  await expect(page.getByRole('table')).toContainText('Boutique CI fictive');
  // Next.js peut déjà avoir commencé le flux du layout : notFound() affiche alors
  // la page 404 avec un statut HTTP 200 (« soft 404 »). Vérifier le refus visible,
  // pas uniquement le code de transport d'une réponse streamée.
  await page.goto('/espace/boutiques?view=invalid');
  await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This page could not be found.' })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.goto('/espace/boutiques?sort=name-desc');
  await expect(page.getByRole('table')).toContainText('Boutique CI fictive');
  await expectNoSeriousAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Thème system : changer le thème' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectNoSeriousAccessibilityViolations(page);
  await page.goto('/espace/apparence');
  await expect(page.getByRole('heading', { name: 'Apparence' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Sombre/ })).toBeChecked();
  await page.getByRole('radio', { name: /Clair/ }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Thème light : changer le thème' }).click();
  await expect(page.getByRole('radio', { name: /Système/ })).toBeChecked();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  await page.getByRole('radio', { name: /Sombre/ }).check();
  await page.reload();
  await expect(page.getByRole('radio', { name: /Sombre/ })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectNoSeriousAccessibilityViolations(page);
  if (testInfo.project.name === 'mobile-375') {
    const menuTrigger = page.getByRole('button', { name: 'Ouvrir le menu' });
    await menuTrigger.click();
    await expect(page.locator('.workspace')).toHaveClass(/workspace-drawer-open/);
    await expectNoSeriousAccessibilityViolations(page);
    await page.keyboard.press('Escape');
    await expect(menuTrigger).toBeFocused();
  }
  const shopsResponse = await directApi(page.request).get('/api/shops');
  expect(shopsResponse.status()).toBe(200);
  const shopList = await shopsResponse.json() as { shops: { id: string; displayName: string }[] };
  expect(shopList.shops).toHaveLength(1);
  expect(shopList.shops[0]?.displayName).toBe('Boutique CI fictive');
  const shopId = shopList.shops[0]!.id;
  await page.keyboard.press('ControlOrMeta+k');
  const quickSearch = page.getByRole('dialog', { name: 'Recherche rapide dans mon espace' });
  await expect(quickSearch).toBeVisible();
  await quickSearch.getByRole('searchbox', { name: 'Rechercher dans mon espace' }).fill('Boutique CI');
  await expect(quickSearch.getByRole('link', { name: /Boutique CI fictive/ })).toBeVisible();
  const quickResults = await directApi(page.request).get('/api/search?q=proprietaire');
  expect(quickResults.status()).toBe(200);
  const directory = await quickResults.json() as { shops: unknown[]; users: { email: string }[] };
  expect(directory.users.map((user) => user.email)).toContain('proprietaire@ci.invalid');
  expect(JSON.stringify(directory)).not.toMatch(/password_hash|token_hash|totp_secret/);
  expect((await directApi(page.request).get('/api/search?q=x')).status()).toBe(400);
  await quickSearch.getByRole('searchbox', { name: 'Rechercher dans mon espace' }).fill('proprietaire');
  await expect(quickSearch.getByRole('link', { name: /Propriétaire CI · proprietaire@ci.invalid/ })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await page.keyboard.press('Escape');
  await expect(quickSearch).toBeHidden();
  await expect(page.getByRole('button', { name: 'Rechercher dans mon espace' })).toBeFocused();
  // Vrai clic dans le sélecteur de la barre, CSRF et permission contrôlés côté serveur.
  await page.getByRole('button', { name: 'Choisir une boutique' }).click();
  const picker = page.getByRole('dialog', { name: 'Choix de boutique' });
  await expect(picker.getByRole('button', { name: /Boutique CI fictive/ })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await expect(page.getByRole('button', { name: 'Choisir une boutique' })).toBeFocused();
  await page.getByRole('button', { name: 'Choisir une boutique' }).click();
  await picker.getByRole('button', { name: /Boutique CI fictive/ }).click();
  await expect(page.getByRole('button', { name: 'Choisir une boutique' })).toContainText('Préférence : Boutique CI fictive');
  // Recherche transversale : audit seulement dans la boutique sélectionnée et autorisée.
  const auditQuickResponse = await directApi(page.request).get('/api/search?q=fixture.created');
  expect(auditQuickResponse.status()).toBe(200);
  const auditQuick = await auditQuickResponse.json() as { auditShopId: string | null;
    audit: { module: string; action: string; shopId: string }[] };
  expect(auditQuick.auditShopId).toBe(shopId);
  expect(auditQuick.audit).toContainEqual(expect.objectContaining({ module: 'ci', action: 'fixture.created' }));
  expect(auditQuick.audit.every((event) => event.shopId === shopId)).toBe(true);
  expect(JSON.stringify(auditQuick)).not.toMatch(/token_hash|before|after|ip_hash/);
  await page.keyboard.press('ControlOrMeta+k');
  const scopedSearch = page.getByRole('dialog', { name: 'Recherche rapide dans mon espace' });
  await expect(scopedSearch).toBeVisible();
  // Une requête API Playwright et un fetch du navigateur ne sont pas nécessairement
  // équivalents (cookies, état de la page, erreurs réseau). Vérifier celui de la palette.
  const [paletteResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/search?q=fixture.created')
      && response.request().method() === 'GET', { timeout: 15_000 }),
    scopedSearch.getByRole('searchbox', { name: 'Rechercher dans mon espace' }).fill('fixture.created'),
  ]);
  expect(paletteResponse.status()).toBe(200);
  const paletteData = await paletteResponse.json() as { auditShopId: string | null;
    audit: { module: string; action: string; shopId: string }[] };
  expect(paletteData.auditShopId).toBe(shopId);
  expect(paletteData.audit).toContainEqual(expect.objectContaining({ module: 'ci', action: 'fixture.created' }));
  // La fixture seed-e2e-shop.mjs enregistre module='ci', pas 'shops'.
  // Vérifier le module réel et l'action, sans fabriquer un autre libellé.
  await expect(scopedSearch.getByRole('link', { name: 'ci · fixture.created' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(scopedSearch).toBeHidden();
  await page.goto('/espace/recherche?q=fixture.created');
  await expect(page.getByRole('heading', { name: 'Journal de la boutique sélectionnée' })).toBeVisible();
  await expect(page.getByRole('link', { name: /ci · fixture.created/ })).toBeVisible();
  // Une liste de membres vide ne doit pas fabriquer le propriétaire comme membre.
  await page.goto('/espace/membres');
  await expect(page.getByRole('heading', { name: 'Membres de la boutique' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Aucun membre' })).toBeVisible();
  const members = await directApi(page.request).get(`/api/shops/${shopId}/members`);
  expect(members.status()).toBe(200);
  expect(members.headers()['cache-control']).toBe('no-store');
  expect((await members.json() as { members: unknown[] }).members).toEqual([]);
  await expectNoSeriousAccessibilityViolations(page);
});

test('propriétaire CI : journal et sessions', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(!process.env.E2E_RECOVERY_FILE, 'PostgreSQL CI + bootstrap requis.');
  // Contexte indépendant : ouvrir sa session et choisir explicitement la boutique CI.
  await loginOwner(page, testInfo, 3);
  const shopsResponse = await directApi(page.request).get('/api/shops');
  expect(shopsResponse.status()).toBe(200);
  const shopList = await shopsResponse.json() as { shops: { id: string; displayName: string }[] };
  expect(shopList.shops).toHaveLength(1);
  expect(shopList.shops[0]?.displayName).toBe('Boutique CI fictive');
  const shopId = shopList.shops[0]!.id;
  await page.getByRole('button', { name: 'Choisir une boutique' }).click();
  const picker = page.getByRole('dialog', { name: 'Choix de boutique' });
  await picker.getByRole('button', { name: /Boutique CI fictive/ }).click();
  await expect(page.getByRole('button', { name: 'Choisir une boutique' })).toContainText('Préférence : Boutique CI fictive');
  // Le test conserve la vérification du mode sombre sur le journal sans partager un état de page.
  await page.goto('/espace/apparence');
  await page.getByRole('radio', { name: /Sombre/ }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/espace/journal');
  await page.getByRole('button', { name: 'Actions rapides' }).click();
  await expect(page.getByRole('navigation', { name: 'Actions rapides' })
    .getByRole('link', { name: 'Journal de la boutique sélectionnée' })).toHaveAttribute('href', '/espace/journal');
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('table')).toContainText('fixture.created');
  await expectNoSeriousAccessibilityViolations(page);
  await page.getByRole('combobox', { name: 'Résultat' }).selectOption('failure');
  await page.getByRole('search').getByRole('button', { name: 'Filtrer' }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get('result') === 'failure');
  await expect(page.getByRole('table')).toContainText('fixture.denied');
  await expect(page.getByRole('table')).not.toContainText('fixture.created');
  const failureCsvHref = await page.getByRole('link', { name: 'Exporter cette sélection en CSV' }).getAttribute('href');
  expect(new URL(failureCsvHref!, page.url()).searchParams.get('result')).toBe('failure');
  const failurePresetHref = await page.getByRole('navigation', { name: 'Périodes rapides du journal' })
    .getByRole('link', { name: '7 derniers jours (UTC)' }).getAttribute('href');
  expect(new URL(failurePresetHref!, page.url()).searchParams.get('result')).toBe('failure');
  const failureCsv = await directApi(page.request).get(failureCsvHref!);
  expect(failureCsv.status()).toBe(200);
  const failureCsvText = await failureCsv.text();
  expect(failureCsvText).toContain('fixture.denied');
  expect(failureCsvText).toContain('"Période fin UTC (incluse)"');
  expect(failureCsvText).toContain('"Module filtré","Acteur filtré"');
  const failureXlsxHref = await page.getByRole('link', { name: 'Exporter cette sélection en Excel' }).getAttribute('href');
  expect(new URL(failureXlsxHref!, page.url()).searchParams.get('result')).toBe('failure');
  const failureXlsx = await directApi(page.request).get(failureXlsxHref!);
  expect(failureXlsx.status()).toBe(200);
  expect(failureXlsx.headers()['cache-control']).toBe('no-store');
  expect(failureXlsx.headers()['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const auditWorkbook = new ExcelJS.Workbook(); await auditWorkbook.xlsx.load(Uint8Array.from(await failureXlsx.body()).buffer);
  const auditSheet = auditWorkbook.getWorksheet('Journal boutique')!;
  expect(auditSheet.getCell('B1').value).toBe(shopId); expect(auditSheet.getCell('B8').value).toBe('failure');
  expect(auditSheet.getColumn(5).values).toContain('fixture.denied');
  expect(auditSheet.getColumn(5).values).not.toContain('fixture.created');
  expect((await directApi(page.request).get(`/api/shops/${shopId}/audit/export/xlsx?result=unknown`)).status()).toBe(400);
  const auditPdfLink = page.getByRole('link', { name: 'Exporter cette sélection en PDF' });
  const auditPdfHref = await auditPdfLink.getAttribute('href');
  expect(new URL(auditPdfHref!, page.url()).searchParams.get('result')).toBe('failure');
  const auditPdf = await directApi(page.request).get(auditPdfHref!);
  expect(auditPdf.status()).toBe(200);
  expect(auditPdf.headers()['content-type']).toBe('application/pdf');
  expect(auditPdf.headers()['cache-control']).toBe('no-store');
  expect((await auditPdf.body()).subarray(0, 5).toString('ascii')).toBe('%PDF-');
  expect((await directApi(page.request).get(`/api/shops/${shopId}/audit/export/pdf?result=unknown`)).status()).toBe(400);
  const failureApi = await directApi(page.request).get(`/api/shops/${shopId}/audit?result=failure`);
  expect(failureApi.status()).toBe(200);
  expect((await failureApi.json() as { events: { result: string; action: string }[] }).events)
    .toEqual([expect.objectContaining({ result: 'failure', action: 'fixture.denied' })]);
  expect((await directApi(page.request).get(`/api/shops/${shopId}/audit?result=unknown`)).status()).toBe(400);
  await page.getByRole('combobox', { name: 'Résultat' }).selectOption('');
  await page.getByRole('search').getByRole('button', { name: 'Filtrer' }).click();
  await expect(page.getByRole('combobox', { name: 'Résultat' })).toHaveValue('');
  await expect(page.getByRole('table')).toContainText('fixture.created');
  if (testInfo.project.name === 'mobile-375') {
    const scrollableJournal = page.getByRole('region', { name: 'Tableau du journal défilant horizontalement' });
    await scrollableJournal.focus();
    await expect(scrollableJournal).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => scrollableJournal.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }
  const searchedAudit = await directApi(page.request).get(`/api/shops/${shopId}/audit?q=fixture.created`);
  expect(searchedAudit.status()).toBe(200);
  expect((await searchedAudit.json() as { events: { action: string }[] }).events.map((e) => e.action))
    .toEqual(['fixture.created']);
  await page.getByRole('searchbox', { name: 'Rechercher une action ou un module' }).fill('fixture.created');
  await page.getByRole('search').getByRole('button', { name: 'Filtrer' }).click();
  await expect(page.getByRole('table')).toContainText('fixture.created');
  await expect(page.getByRole('table')).not.toContainText('=cmd');
  const sevenLink = page.getByRole('navigation', { name: 'Périodes rapides du journal' })
    .getByRole('link', { name: '7 derniers jours (UTC)' });
  const sevenTarget = new URL((await sevenLink.getAttribute('href'))!, page.url());
  await sevenLink.click();
  // L'ancienne URL est déjà /espace/journal?... ; attendre la nouvelle plage,
  // pas simplement une URL ayant la même route (course du client router Next).
  await expect(page).toHaveURL((url) => url.pathname === sevenTarget.pathname
    && url.searchParams.get('from') === sevenTarget.searchParams.get('from')
    && url.searchParams.get('to') === sevenTarget.searchParams.get('to'));
  const presetParams = new URL(page.url()).searchParams;
  expect(presetParams.get('shop')).toBe(shopId);
  expect(presetParams.get('q')).toBe('fixture.created');
  expect(presetParams.has('page')).toBe(false);
  const presetFrom = presetParams.get('from'); const presetTo = presetParams.get('to');
  expect(presetFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(presetTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect((Date.parse(`${presetTo}T00:00:00Z`) - Date.parse(`${presetFrom}T00:00:00Z`)) / 86_400_000).toBe(6);
  await expect(page.getByRole('table')).toContainText('fixture.created');
  const filteredCsvUrl = await page.getByRole('link', { name: 'Exporter cette sélection en CSV' }).getAttribute('href');
  expect(filteredCsvUrl).toContain('q=fixture.created');
  expect(new URL(filteredCsvUrl!, page.url()).searchParams.get('from')).toBe(presetFrom);
  expect(new URL(filteredCsvUrl!, page.url()).searchParams.get('to')).toBe(presetTo);
  const filteredCsv = await directApi(page.request).get(filteredCsvUrl!);
  expect(filteredCsv.status()).toBe(200);
  expect(await filteredCsv.text()).not.toContain(`"'=cmd"`);
  const thirtyLink = page.getByRole('navigation', { name: 'Périodes rapides du journal' })
    .getByRole('link', { name: '30 derniers jours (UTC)' });
  const thirtyTarget = new URL((await thirtyLink.getAttribute('href'))!, page.url());
  await thirtyLink.click();
  await expect(page).toHaveURL((url) => url.pathname === thirtyTarget.pathname
    && url.searchParams.get('from') === thirtyTarget.searchParams.get('from')
    && url.searchParams.get('to') === thirtyTarget.searchParams.get('to'));
  const thirty = new URL(page.url()).searchParams;
  expect(thirty.get('shop')).toBe(shopId);
  expect(thirty.get('q')).toBe('fixture.created');
  expect((Date.parse(`${thirty.get('to')}T00:00:00Z`) - Date.parse(`${thirty.get('from')}T00:00:00Z`)) / 86_400_000).toBe(29);
  await expect(page.getByRole('table')).toContainText('fixture.created');
  await page.goto('/espace/journal');
  const exportResponse = await directApi(page.request).get(`/api/shops/${shopId}/audit/export`);
  expect(exportResponse.status()).toBe(200);
  expect(exportResponse.headers()['content-type']).toContain('text/csv');
  const csvText = await exportResponse.text();
  expect(csvText).toContain('fixture.created');
  expect(csvText).toContain(`"'=cmd"`);
  expect(csvText).toContain(`"'@hostile"`);
  await page.goto('/espace/boutiques');
  // Une sélection fabriquée par le navigateur doit échouer malgré une session owner.
  await directApi(page.request).get('/api/auth/csrf');
  const shopCsrf = (await page.context().cookies()).find((c) => c.name === 'toutenun_csrf')?.value;
  expect(shopCsrf).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const selectInvalid = await directApi(page.request).post('/api/preferences/shop', { headers: {
    origin: 'http://127.0.0.1:3100', 'x-csrf-token': shopCsrf!,
  }, data: { shopId: '999999' } });
  expect(selectInvalid.status()).toBe(403);
  const selectAll = await directApi(page.request).post('/api/preferences/shop', { headers: {
    origin: 'http://127.0.0.1:3100', 'x-csrf-token': shopCsrf!,
  }, data: { shopId: 'all' } });
  expect(selectAll.status()).toBe(200);
  await page.goto('/espace/journal');
  await expect(page.getByRole('heading', { name: 'Choisissez une boutique' })).toBeVisible();
  // Une boutique inexistante ne doit pas exposer de journal, même au propriétaire.
  expect((await directApi(page.request).get('/api/shops/999999/audit')).status()).toBe(403);
  expect((await directApi(page.request).get(`/api/shops/${shopId}/audit`)).status()).toBe(200);
  await page.goto('/espace');
  const sessionsLink = page.getByRole('link', { name: 'Consulter mes sessions actives' });
  await expect(sessionsLink).toHaveAttribute('href', '/espace/sessions');
  await sessionsLink.click();
  // Le rendu serveur Next en CI peut dépasser 5 s (trace du run 43511441768 : ~5,1 s).
  // Attendre l'arrivée sur la bonne route ET le contenu, sans rejouer le clic ni masquer les erreurs.
  await expect(page).toHaveURL(/\/espace\/sessions$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Mes sessions' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('table')).toContainText('cette session');
  const sessionResponse = await directApi(page.request).get('/api/auth/sessions');
  expect(sessionResponse.status()).toBe(200);
  const payload = await sessionResponse.json() as { sessions: { id: string; current: boolean }[] };
  expect(payload.sessions.some((entry) => entry.current)).toBe(true);
  // Les autres scénarios E2E et leurs tentatives créent aussi des sessions sur le même compte.
  // Vérifier la ligne de cet appareil, pas l'absence globale de boutons pour les AUTRES.
  const currentRow = page.getByRole('table').getByRole('row').filter({ hasText: '— cette session' });
  await expect(currentRow).toHaveCount(1);
  await expect(currentRow.getByText('Appareil actuel')).toBeVisible();
  await expect(currentRow.getByRole('button', { name: 'Déconnecter cet autre appareil' })).toHaveCount(0);
  const currentId = payload.sessions.find((entry) => entry.current)!.id;
  expect(JSON.stringify(payload)).not.toMatch(/token_hash|user_agent|ip_hash/);
  const csrf = await directApi(page.request).get('/api/auth/csrf');
  expect(csrf.status()).toBe(200);
  const csrfToken = (await page.context().cookies()).find((cookie) => cookie.name === 'toutenun_csrf')?.value;
  expect(csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const blockedCurrent = await directApi(page.request).post(`/api/auth/sessions/${currentId}/revoke`, {
    headers: { origin: 'http://127.0.0.1:3100', 'x-csrf-token': csrfToken! },
  });
  expect(blockedCurrent.status()).toBe(404);
  expect((await directApi(page.request).get('/api/auth/me')).status()).toBe(200);
  const blockedForeignOrigin = await directApi(page.request).post('/api/auth/sessions/999999/revoke', {
    headers: { origin: 'http://unauthorized.invalid', 'x-csrf-token': csrfToken! },
  });
  expect(blockedForeignOrigin.status()).toBe(403);
  // La révocation groupée ne doit jamais être déclenchée contre les autres scénarios CI
  // partageant ce compte ; vérifier ses barrières sans changer leurs sessions.
  expect((await directApi(page.request).post('/api/auth/sessions/revoke-others', {
    headers: { origin: 'http://unauthorized.invalid', 'x-csrf-token': csrfToken! },
  })).status()).toBe(403);
  expect((await directApi(page.request).get('/api/auth/me')).status()).toBe(200);
  const refresh = await directApi(page.request).post('/api/auth/refresh', {
    headers: { origin: 'http://127.0.0.1:3100', 'x-csrf-token': csrfToken! },
  });
  expect(refresh.status()).toBe(200);
  expect(new Date((await refresh.json() as { expiresAt: string }).expiresAt).getTime()).toBeGreaterThan(Date.now());
  expect((await directApi(page.request).get('/api/auth/me')).status()).toBe(200);
});
