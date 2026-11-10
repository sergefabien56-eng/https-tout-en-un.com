import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// Seulement en CI : utilisateur et codes FICTIFS créés dans une base PostgreSQL jetable.
// Jamais exécuté contre une base réelle de production.
test('propriétaire CI : connexion 2FA et liste utilisateurs autorisée', async ({ page }, testInfo) => {
  test.skip(!process.env.E2E_RECOVERY_FILE, 'PostgreSQL CI + bootstrap requis.');
  const codes = readFileSync(process.env.E2E_RECOVERY_FILE!, 'utf8').trim().split('\n');
  const code = codes[testInfo.project.name === 'mobile-375' ? 1 : 0];
  expect(code).toMatch(/^[A-Za-z0-9_-]{22}$/);

  await page.goto('/connexion');
  await page.getByLabel('Adresse e-mail').fill('proprietaire@ci.invalid');
  await page.getByLabel('Mot de passe').fill('MotDePasseCI!2026');
  await page.getByLabel('Code à 6 chiffres ou code de secours').fill(code!);
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeEnabled();
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/espace$/);
  await expect(page.locator('.topbar-user')).toHaveText('Propriétaire CI');

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
  const result = await response.json() as { users: { email: string }[] };
  expect(result.users[0]?.email).toBe('proprietaire@ci.invalid');
});
