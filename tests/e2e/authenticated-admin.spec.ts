import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// Seulement en CI : utilisateur et codes FICTIFS créés dans une base PostgreSQL jetable.
// Jamais exécuté contre une base réelle de production.
test('propriétaire CI : connexion 2FA et liste utilisateurs autorisée', async ({ page }, testInfo) => {
  test.setTimeout(90_000); // Parcours connecté multi-pages sur PostgreSQL, bureau et mobile.
  test.skip(!process.env.E2E_RECOVERY_FILE, 'PostgreSQL CI + bootstrap requis.');
  const codes = readFileSync(process.env.E2E_RECOVERY_FILE!, 'utf8').trim().split('\n');
  // Chaque tentative consomme un code de secours : retry et appareils distincts.
  const code = codes[testInfo.retry * 2 + (testInfo.project.name === 'mobile-375' ? 1 : 0)];
  expect(code).toMatch(/^[A-Za-z0-9_-]{22}$/);

  await page.goto('/connexion');
  await page.getByLabel('Adresse e-mail').fill('proprietaire@ci.invalid');
  await page.getByLabel('Mot de passe').fill('MotDePasseCI!2026');
  await page.getByLabel('Code à 6 chiffres ou code de secours').fill(code!);
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeEnabled();
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/espace$/);
  await expect(page.locator('.topbar-user')).toHaveText('Propriétaire CI');
  const notificationLink = page.getByRole('link', { name: /^Mes notifications : (?:plus de 99|\d+) non lues?$/ });
  await expect(notificationLink).toBeVisible();
  await notificationLink.click();
  await expect(page.getByRole('heading', { name: 'Mes notifications' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nouvelle connexion' }).first()).toBeVisible();
  const noticeResponse = await page.request.get('/api/notifications');
  expect(noticeResponse.status()).toBe(200);
  const notices = await noticeResponse.json() as { notifications: { id: string; kind: string; message: string; readAt: string | null }[] };
  expect(notices.notifications.some((n) => n.kind === 'security_login')).toBe(true);
  expect(JSON.stringify(notices)).not.toMatch(/token_hash|totp_secret|user_agent/);
  // Une mutation réelle est appliquée à la première notification, puis confirmée via l’API.
  const firstNotice = notices.notifications[0];
  expect(firstNotice?.id).toMatch(/^[1-9]\d*$/);
  expect((await page.request.get('/api/notifications?filter=incorrect')).status()).toBe(400);
  const initialFilter = firstNotice?.readAt ? 'read' : 'unread';
  const initialFiltered = await page.request.get(`/api/notifications?filter=${initialFilter}`);
  expect(initialFiltered.status()).toBe(200);
  expect((await initialFiltered.json() as { notifications: { id: string }[] }).notifications.some((n) => n.id === firstNotice?.id)).toBe(true);
  const action = page.locator('.notification-list > li').first().getByRole('button',
    { name: firstNotice?.readAt ? 'Marquer comme non lue' : 'Marquer comme lue' });
  await action.click();
  await expect.poll(async () => {
    const result = await page.request.get('/api/notifications');
    const data = await result.json() as { notifications: { id: string; readAt: string | null }[] };
    return Boolean(data.notifications.find((n) => n.id === firstNotice?.id)?.readAt);
  }).toBe(!firstNotice?.readAt);
  const targetFilter = firstNotice?.readAt ? 'unread' : 'read';
  await page.getByRole('navigation', { name: 'Filtrer les notifications' }).getByRole('link',
    { name: firstNotice?.readAt ? 'Non lues' : 'Lues', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`filter=${targetFilter}`));
  await expect(page.locator('.notification-list > li').first()).toBeVisible();
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
  const response = await page.request.get('/api/admin/users');
  expect(response.status()).toBe(200);
  const result = await response.json() as { users: { id: string; email: string }[] };
  expect(result.users[0]?.email).toBe('proprietaire@ci.invalid');
  await page.getByRole('table').getByRole('link', { name: 'Propriétaire CI', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Propriétaire CI' })).toBeVisible();
  await expect(page.getByText('Global (toutes les boutiques)')).toBeVisible();
  // Les séquences PostgreSQL ne sont PAS rembobinées par ROLLBACK : la fixture RLS
  // peut consommer l'ID 1. Ne jamais supposer que le propriétaire porte cet ID.
  const ownerId = result.users.find((entry) => entry.email === 'proprietaire@ci.invalid')?.id;
  expect(ownerId).toMatch(/^[1-9]\d*$/);
  const user = await page.request.get(`/api/admin/users/${ownerId}`);
  expect(user.status()).toBe(200);
  expect((await user.json() as { roles: { shopId: string | null }[] }).roles[0]?.shopId).toBeNull();
  // Permission owner vérifiée côté serveur, puis page réelle dans les deux tailles d'écran.
  if (testInfo.project.name === 'mobile-375') await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
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
  const deep = await page.request.get('/api/health/deep');
  expect(deep.status()).toBe(200);
  const health = await deep.json() as { database: string; migrationsApplied: number };
  expect(health.database).toBe('ok');
  expect(health.migrationsApplied).toBe(10);
  await page.goto('/espace/boutiques');
  await expect(page.getByRole('heading', { name: 'Toutes les boutiques autorisées' })).toBeVisible();
  await expect(page.getByText('Boutique CI fictive', { exact: true })).toBeVisible();
  const shopsResponse = await page.request.get('/api/shops');
  expect(shopsResponse.status()).toBe(200);
  const shopList = await shopsResponse.json() as { shops: { id: string; displayName: string }[] };
  expect(shopList.shops).toHaveLength(1);
  expect(shopList.shops[0]?.displayName).toBe('Boutique CI fictive');
  const shopId = shopList.shops[0]!.id;
  // Vrai clic dans le sélecteur de la barre, CSRF et permission contrôlés côté serveur.
  await page.getByRole('button', { name: 'Choisir une boutique' }).click();
  const picker = page.getByRole('dialog', { name: 'Choix de boutique' });
  await expect(picker.getByRole('button', { name: /Boutique CI fictive/ })).toBeVisible();
  await picker.getByRole('button', { name: /Boutique CI fictive/ }).click();
  await expect(page.getByRole('button', { name: 'Choisir une boutique' })).toContainText('Préférence : Boutique CI fictive');
  await page.goto('/espace/journal');
  await expect(page.getByRole('table')).toContainText('fixture.created');
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
  const payload = await sessionResponse.json() as { sessions: { current: boolean }[] };
  expect(payload.sessions.some((entry) => entry.current)).toBe(true);
  expect(JSON.stringify(payload)).not.toMatch(/token_hash|user_agent|ip_hash/);
  const csrf = await page.request.get('/api/auth/csrf');
  expect(csrf.status()).toBe(200);
  const csrfToken = (await page.context().cookies()).find((cookie) => cookie.name === 'toutenun_csrf')?.value;
  expect(csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const refresh = await page.request.post('/api/auth/refresh', {
    headers: { origin: 'http://127.0.0.1:3100', 'x-csrf-token': csrfToken! },
  });
  expect(refresh.status()).toBe(200);
  expect(new Date((await refresh.json() as { expiresAt: string }).expiresAt).getTime()).toBeGreaterThan(Date.now());
  expect((await page.request.get('/api/auth/me')).status()).toBe(200);
});
