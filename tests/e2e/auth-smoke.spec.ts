import { directApi } from './direct-api';
import { expect, test } from '@playwright/test';
import { expectNoSeriousAccessibilityViolations } from './accessibility';

test('page connexion accessible et aucun débordement horizontal', async ({ page }) => {
  await page.goto('/connexion');
  await expect(page.getByRole('heading', { name: /Connexion à votre espace/ })).toBeVisible();
  await expect(page.getByLabel('Adresse e-mail')).toBeVisible();
  await expect(page.getByLabel('Mot de passe')).toBeVisible();
  await expect(page.getByLabel('Code à 6 chiffres ou code de secours')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeEnabled();
  const sizes = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
  await expectNoSeriousAccessibilityViolations(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => page.locator('.login-card').evaluate((card) => getComputedStyle(card).backgroundColor))
    .toBe('rgb(19, 27, 46)');
  await expectNoSeriousAccessibilityViolations(page);
});

// Des scénarios indépendants gardent toutes les assertions de refus sans cumuler
// la compilation de onze routes et deux navigations dans un unique délai de 30 s.
// Aucun délai, retry ou contrôle de sécurité n'est supprimé.
test('espace privé et apparence inaccessibles sans session', async ({ page }) => {
  await page.goto('/espace');
  await expect(page).toHaveURL(/\/connexion$/);
  await expect(page.getByText(/Bienvenue,/)).toHaveCount(0);
  const result = await directApi(page.request).get('/api/auth/me');
  expect(result.status()).toBe(401);
  await page.goto('/espace/apparence');
  await expect(page).toHaveURL(/\/connexion$/);
});

test('exports système et paramètres inaccessibles sans session', async ({ page }) => {
  for (const path of ['/api/admin/system/export', '/api/admin/system/export/xlsx', '/api/admin/system/export/pdf'])
    expect((await directApi(page.request).get(path)).status()).toBe(401);
  expect((await directApi(page.request).get('/api/admin/settings/export')).status()).toBe(401);
  expect((await directApi(page.request).get('/api/admin/settings/export/xlsx')).status()).toBe(401);
  expect((await directApi(page.request).get('/api/admin/settings/export/pdf')).status()).toBe(401);
});

test('exports rôles, utilisateurs, boutiques et journal inaccessibles sans session', async ({ page }) => {
  expect((await directApi(page.request).get('/api/admin/roles/export/pdf')).status()).toBe(401);
  expect((await directApi(page.request).get('/api/admin/users/export/pdf')).status()).toBe(401);
  expect((await directApi(page.request).get('/api/shops/export/pdf')).status()).toBe(401);
  expect((await directApi(page.request).get('/api/shops/1/audit/export/pdf')).status()).toBe(401);
});

test('membres de boutique inaccessibles sans session', async ({ request }) => {
  expect((await directApi(request).get('/api/shops/1/members')).status()).toBe(401);
});

test('connexion sans vrai compte : aucune donnée métier inventée', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/aucun indicateur n’est affiché/i)).toBeVisible();
  await expect(page.getByText(/rien n’est simulé/i)).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => page.locator('.card').first().evaluate((card) => getComputedStyle(card).backgroundColor))
    .toBe('rgb(19, 27, 46)');
  await expectNoSeriousAccessibilityViolations(page);
});
