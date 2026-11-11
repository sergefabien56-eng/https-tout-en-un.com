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

test('espace privé inaccessible sans session, côté serveur', async ({ page }) => {
  await page.goto('/espace');
  await expect(page).toHaveURL(/\/connexion$/);
  await expect(page.getByText(/Bienvenue,/)).toHaveCount(0);
  const result = await page.request.get('/api/auth/me');
  expect(result.status()).toBe(401);
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
