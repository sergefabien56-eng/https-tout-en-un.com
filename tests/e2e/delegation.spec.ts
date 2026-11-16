import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { directApi } from './direct-api';

test('délégation réelle : membres, attribution, retrait et isolation', async ({ page, context }, info) => {
  test.setTimeout(120_000);
  test.skip(!process.env.E2E_DELEGATION_FILE, 'Fixtures PostgreSQL CI requises.');
  const fixtures = JSON.parse(readFileSync(process.env.E2E_DELEGATION_FILE!, 'utf8')) as Record<string,
    { token: string; shop: string; otherShop: string; actor: string; member: string; other: string }>;
  const fixture = fixtures[info.project.name]!;
  await context.addCookies([{ name: 'toutenun_session', value: fixture.token, url: 'http://127.0.0.1:3100', httpOnly: true, sameSite: 'Strict' }]);
  await page.goto(`/espace/membres?shop=${fixture.shop}`);
  await expect(page.getByRole('heading', { name: 'Membres de la boutique' })).toBeVisible();
  const member = page.getByRole('row').filter({ hasText: `Membre ${info.project.name}` });
  await expect(member).toBeVisible();
  await expect(page.getByText(`Membre privé ${info.project.name}`)).toHaveCount(0);
  await expect(member.getByText('Aucun rôle boutique')).toBeVisible();
  await expect(member.locator('option[value=stock_manager]')).toHaveCount(0);
  await member.getByRole('combobox', { name: `Rôle pour Membre ${info.project.name}` }).selectOption('assistant');
  page.once('dialog', (dialog) => void dialog.accept());
  const response = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith(`/api/admin/users/${fixture.member}/shop-roles`));
  await member.getByRole('button', { name: 'Attribuer' }).click();
  expect((await response).status()).toBe(200);
  await expect(member.getByRole('cell').nth(3)).toHaveText('Assistant');
  page.once('dialog', (dialog) => void dialog.accept());
  const removal = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith(`/api/admin/users/${fixture.member}/shop-roles`));
  await member.getByRole('button', { name: 'Retirer' }).click();
  expect((await removal).status()).toBe(200);
  await expect(member.getByText('Aucun rôle boutique')).toBeVisible();
  const list = await directApi(page.request).get(`/api/shops/${fixture.otherShop}/members`);
  expect(list.status()).toBe(403);
  expect((await directApi(page.request).get('/api/admin/users')).status()).toBe(403);
  const csrf = (await context.cookies()).find((cookie) => cookie.name === 'toutenun_csrf')?.value;
  expect(csrf).toBeTruthy();
  const headers = { origin: 'http://127.0.0.1:3100', 'x-csrf-token': csrf! };
  expect((await directApi(page.request).post(`/api/admin/users/${fixture.other}/shop-roles`, {
    headers, data: { shopId: fixture.otherShop, roleCode: 'assistant', grant: true },
  })).status()).toBe(403);
  expect((await directApi(page.request).post(`/api/admin/users/${fixture.member}/shop-roles`, {
    headers, data: { shopId: fixture.shop, roleCode: 'stock_manager', grant: true },
  })).status()).toBe(403);
  expect((await directApi(page.request).post(`/api/admin/users/${fixture.actor}/shop-roles`, {
    headers, data: { shopId: fixture.shop, roleCode: 'assistant', grant: true },
  })).status()).toBe(403);
});
