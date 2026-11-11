import { readFileSync } from 'node:fs';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { expectNoSeriousAccessibilityViolations } from './accessibility';

// Seulement en CI : utilisateur et codes FICTIFS créés dans une base PostgreSQL jetable.
// Jamais exécuté contre une base réelle de production.
/** Quatre codes réservés par scénario : bureau/mobile et première tentative/retry. */
async function loginOwner(page: Page, testInfo: TestInfo, scenario: 0 | 1): Promise<void> {
  const codes = readFileSync(process.env.E2E_RECOVERY_FILE!, 'utf8').trim().split('\n');
  const index = scenario * 4 + testInfo.retry * 2 + (testInfo.project.name === 'mobile-375' ? 1 : 0);
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
  test.setTimeout(90_000);
  test.skip(!process.env.E2E_RECOVERY_FILE, 'PostgreSQL CI + bootstrap requis.');
  await loginOwner(page, testInfo, 0);
  const notificationLink = page.getByRole('link', { name: /^Mes notifications : (?:plus de 99|\d+) non lues?$/ });
  await expect(notificationLink).toBeVisible();
  await notificationLink.click();
  await expect(page.getByRole('heading', { name: 'Mes notifications' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nouvelle connexion' }).first()).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  const noticeResponse = await page.request.get('/api/notifications');
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
  expect((await page.request.get('/api/notifications?filter=incorrect')).status()).toBe(400);
  const initialFilter = firstNotice?.readAt ? 'read' : 'unread';
  const initialFiltered = await page.request.get(`/api/notifications?filter=${initialFilter}`);
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
    const result = await page.request.get('/api/notifications');
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
  await filterLink.click();
  await expect(page).toHaveURL(new RegExp(`filter=${targetFilter}`), { timeout: 15_000 });
  await expect(page.locator('.notification-list > li').first()).toBeVisible();
  const refreshFiltered = page.getByRole('link', { name: 'Actualiser les notifications' });
  await expect(refreshFiltered).toHaveAttribute('href', `/espace/notifications?filter=${targetFilter}&page=1`);
  await refreshFiltered.click();
  await expect(page).toHaveURL(new RegExp(`filter=${targetFilter}&page=1$`));
  await expect(page.locator(`.notification-list > li[data-notification-id="${visibleId}"]`)).toBeVisible();
  const afterFilter = await page.request.get(`/api/notifications?filter=${targetFilter}`);
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
  const response = await page.request.get('/api/admin/users');
  expect(response.status()).toBe(200);
  const result = await response.json() as { users: { id: string; email: string }[] };
  expect(result.users[0]?.email).toBe('proprietaire@ci.invalid');
  const filteredUsers = await page.request.get('/api/admin/users?q=proprietaire');
  expect(filteredUsers.status()).toBe(200);
  expect((await filteredUsers.json() as { users: { email: string }[] }).users.map((u) => u.email))
    .toEqual(['proprietaire@ci.invalid']);
  expect((await page.request.get('/api/admin/users?q=%0A')).status()).toBe(400);
  const activeUsers = await page.request.get('/api/admin/users?status=active&q=proprietaire');
  expect((await activeUsers.json() as { users: { email: string }[] }).users.map((u) => u.email))
    .toEqual(['proprietaire@ci.invalid']);
  expect((await page.request.get('/api/admin/users?status=invited')).status()).toBe(200);
  expect((await page.request.get('/api/admin/users?status=unexpected')).status()).toBe(400);
  const ownerRole = await page.request.get('/api/admin/users?role=owner&status=active');
  expect(ownerRole.status()).toBe(200);
  expect((await ownerRole.json() as { users: { email: string }[] }).users.map((u) => u.email))
    .toEqual(['proprietaire@ci.invalid']);
  expect((await page.request.get('/api/admin/users?role=manager')).status()).toBe(200);
  expect((await page.request.get('/api/admin/users?role=invalid')).status()).toBe(400);
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
  await page.getByRole('table').getByRole('link', { name: 'Propriétaire CI', exact: true }).click();
  await expect(page).toHaveURL(/\/espace\/utilisateurs\/[1-9]\d*$/);
  await expect(page.getByRole('heading', { name: 'Propriétaire CI' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Global (toutes les boutiques)')).toBeVisible();
  // Les séquences PostgreSQL ne sont PAS rembobinées par ROLLBACK : la fixture RLS
  // peut consommer l'ID 1. Ne jamais supposer que le propriétaire porte cet ID.
  const ownerId = result.users.find((entry) => entry.email === 'proprietaire@ci.invalid')?.id;
  expect(ownerId).toMatch(/^[1-9]\d*$/);
  const user = await page.request.get(`/api/admin/users/${ownerId}`);
  expect(user.status()).toBe(200);
  expect((await user.json() as { roles: { shopId: string | null }[] }).roles[0]?.shopId).toBeNull();
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

test('propriétaire CI : rôles, boutiques, journal et sessions', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(!process.env.E2E_RECOVERY_FILE, 'PostgreSQL CI + bootstrap requis.');
  await loginOwner(page, testInfo, 1);
  if (testInfo.project.name === 'mobile-375') await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('button', { name: 'Administration' }).click();
  // Permission owner vérifiée côté serveur, puis page réelle dans les deux tailles d'écran.
  await page.getByRole('link', { name: 'Rôles' }).click();
  await expect(page).toHaveURL(/\/espace\/roles$/);
  await expect(page.getByRole('heading', { name: 'Rôles et permissions' })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Propriétaire');
  const roles = await page.request.get('/api/admin/roles');
  expect(roles.status()).toBe(200);
  if (testInfo.project.name === 'mobile-375') await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('link', { name: 'Système' }).click();
  await expect(page.getByRole('heading', { name: 'Système' })).toBeVisible();
  await expect(page.getByText(/File de tâches/)).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  const deep = await page.request.get('/api/health/deep');
  expect(deep.status()).toBe(200);
  const health = await deep.json() as { database: string; migrationsApplied: number };
  expect(health.database).toBe('ok');
  expect(health.migrationsApplied).toBe(10);
  await page.goto('/espace/boutiques');
  await expect(page.getByRole('heading', { name: 'Toutes les boutiques autorisées' })).toBeVisible();
  await expect(page.getByText('Boutique CI fictive', { exact: true })).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await page.getByRole('button', { name: 'Thème system : changer le thème' }).click();
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
  const shopsResponse = await page.request.get('/api/shops');
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
  const quickResults = await page.request.get('/api/search?q=proprietaire');
  expect(quickResults.status()).toBe(200);
  const directory = await quickResults.json() as { shops: unknown[]; users: { email: string }[] };
  expect(directory.users.map((user) => user.email)).toContain('proprietaire@ci.invalid');
  expect(JSON.stringify(directory)).not.toMatch(/password_hash|token_hash|totp_secret/);
  expect((await page.request.get('/api/search?q=x')).status()).toBe(400);
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
  const auditQuickResponse = await page.request.get('/api/search?q=fixture.created');
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
  await page.goto('/espace/journal');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('table')).toContainText('fixture.created');
  await expectNoSeriousAccessibilityViolations(page);
  if (testInfo.project.name === 'mobile-375') {
    const scrollableJournal = page.getByRole('region', { name: 'Tableau du journal défilant horizontalement' });
    await scrollableJournal.focus();
    await expect(scrollableJournal).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => scrollableJournal.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }
  const searchedAudit = await page.request.get(`/api/shops/${shopId}/audit?q=fixture.created`);
  expect(searchedAudit.status()).toBe(200);
  expect((await searchedAudit.json() as { events: { action: string }[] }).events.map((e) => e.action))
    .toEqual(['fixture.created']);
  await page.getByRole('searchbox', { name: 'Rechercher une action ou un module' }).fill('fixture.created');
  await page.getByRole('search').getByRole('button', { name: 'Filtrer' }).click();
  await expect(page.getByRole('table')).toContainText('fixture.created');
  await expect(page.getByRole('table')).not.toContainText('=cmd');
  await page.getByRole('navigation', { name: 'Périodes rapides du journal' })
    .getByRole('link', { name: '7 derniers jours (UTC)' }).click();
  await expect(page).toHaveURL(/\/espace\/journal\?/);
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
  const filteredCsv = await page.request.get(filteredCsvUrl!);
  expect(filteredCsv.status()).toBe(200);
  expect(await filteredCsv.text()).not.toContain(`"'=cmd"`);
  await page.getByRole('navigation', { name: 'Périodes rapides du journal' })
    .getByRole('link', { name: '30 derniers jours (UTC)' }).click();
  await expect(page).toHaveURL(/\/espace\/journal\?/);
  const thirty = new URL(page.url()).searchParams;
  expect(thirty.get('shop')).toBe(shopId);
  expect(thirty.get('q')).toBe('fixture.created');
  expect((Date.parse(`${thirty.get('to')}T00:00:00Z`) - Date.parse(`${thirty.get('from')}T00:00:00Z`)) / 86_400_000).toBe(29);
  await expect(page.getByRole('table')).toContainText('fixture.created');
  await page.goto('/espace/journal');
  const exportResponse = await page.request.get(`/api/shops/${shopId}/audit/export`);
  expect(exportResponse.status()).toBe(200);
  expect(exportResponse.headers()['content-type']).toContain('text/csv');
  const csvText = await exportResponse.text();
  expect(csvText).toContain('fixture.created');
  expect(csvText).toContain(`"'=cmd"`);
  expect(csvText).toContain(`"'@hostile"`);
  await page.goto('/espace/boutiques');
  // Une sélection fabriquée par le navigateur doit échouer malgré une session owner.
  await page.request.get('/api/auth/csrf');
  const shopCsrf = (await page.context().cookies()).find((c) => c.name === 'toutenun_csrf')?.value;
  expect(shopCsrf).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const selectInvalid = await page.request.post('/api/preferences/shop', { headers: {
    origin: 'http://127.0.0.1:3100', 'x-csrf-token': shopCsrf!,
  }, data: { shopId: '999999' } });
  expect(selectInvalid.status()).toBe(403);
  const selectAll = await page.request.post('/api/preferences/shop', { headers: {
    origin: 'http://127.0.0.1:3100', 'x-csrf-token': shopCsrf!,
  }, data: { shopId: 'all' } });
  expect(selectAll.status()).toBe(200);
  await page.goto('/espace/journal');
  await expect(page.getByRole('heading', { name: 'Choisissez une boutique' })).toBeVisible();
  // Une boutique inexistante ne doit pas exposer de journal, même au propriétaire.
  expect((await page.request.get('/api/shops/999999/audit')).status()).toBe(403);
  expect((await page.request.get(`/api/shops/${shopId}/audit`)).status()).toBe(200);
  await page.goto('/espace');
  await page.getByRole('link', { name: 'Consulter mes sessions actives' }).click();
  await expect(page.getByRole('heading', { name: 'Mes sessions' })).toBeVisible();
  await expect(page.getByRole('table')).toContainText('cette session');
  const sessionResponse = await page.request.get('/api/auth/sessions');
  expect(sessionResponse.status()).toBe(200);
  const payload = await sessionResponse.json() as { sessions: { id: string; current: boolean }[] };
  expect(payload.sessions.some((entry) => entry.current)).toBe(true);
  // Les deux scénarios E2E et leurs tentatives créent aussi des sessions sur le même compte.
  // Vérifier la ligne de cet appareil, pas l'absence globale de boutons pour les AUTRES.
  const currentRow = page.getByRole('table').getByRole('row').filter({ hasText: '— cette session' });
  await expect(currentRow).toHaveCount(1);
  await expect(currentRow.getByText('Appareil actuel')).toBeVisible();
  await expect(currentRow.getByRole('button', { name: 'Déconnecter cet autre appareil' })).toHaveCount(0);
  const currentId = payload.sessions.find((entry) => entry.current)!.id;
  expect(JSON.stringify(payload)).not.toMatch(/token_hash|user_agent|ip_hash/);
  const csrf = await page.request.get('/api/auth/csrf');
  expect(csrf.status()).toBe(200);
  const csrfToken = (await page.context().cookies()).find((cookie) => cookie.name === 'toutenun_csrf')?.value;
  expect(csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const blockedCurrent = await page.request.post(`/api/auth/sessions/${currentId}/revoke`, {
    headers: { origin: 'http://127.0.0.1:3100', 'x-csrf-token': csrfToken! },
  });
  expect(blockedCurrent.status()).toBe(404);
  expect((await page.request.get('/api/auth/me')).status()).toBe(200);
  const blockedForeignOrigin = await page.request.post('/api/auth/sessions/999999/revoke', {
    headers: { origin: 'http://unauthorized.invalid', 'x-csrf-token': csrfToken! },
  });
  expect(blockedForeignOrigin.status()).toBe(403);
  // La révocation groupée ne doit jamais être déclenchée contre les autres scénarios CI
  // partageant ce compte ; vérifier ses barrières sans changer leurs sessions.
  expect((await page.request.post('/api/auth/sessions/revoke-others', {
    headers: { origin: 'http://unauthorized.invalid', 'x-csrf-token': csrfToken! },
  })).status()).toBe(403);
  expect((await page.request.get('/api/auth/me')).status()).toBe(200);
  const refresh = await page.request.post('/api/auth/refresh', {
    headers: { origin: 'http://127.0.0.1:3100', 'x-csrf-token': csrfToken! },
  });
  expect(refresh.status()).toBe(200);
  expect(new Date((await refresh.json() as { expiresAt: string }).expiresAt).getTime()).toBeGreaterThan(Date.now());
  expect((await page.request.get('/api/auth/me')).status()).toBe(200);
});
