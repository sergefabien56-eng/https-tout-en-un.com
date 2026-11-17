import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { directApi } from './direct-api';

test('journal global propriétaire : lecture limitée et refus délégué', async ({ page, context }, info) => {
  test.setTimeout(120_000);
  test.skip(!process.env.E2E_DELEGATION_FILE, 'Fixtures PostgreSQL CI requises.');
  const fixtures = JSON.parse(readFileSync(process.env.E2E_DELEGATION_FILE!, 'utf8')) as Record<string,
    { token: string; ownerToken: string }>;
  const fixture = fixtures[info.project.name]!;
  const cookie = (value: string) => ({ name: 'toutenun_session', value, url: 'http://127.0.0.1:3100', httpOnly: true, sameSite: 'Strict' as const });
  await context.addCookies([cookie(fixture.ownerToken)]);
  await page.goto('/espace/journal/global?module=fixture_global');
  await expect(page.getByRole('heading', { name: 'Journal global', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'fixture_global_audit' })).toBeVisible();
  await expect(page.getByText('SECRET_SHOP_EVENT')).toHaveCount(0);
  const response = await directApi(page.request).get('/api/admin/audit/global?module=fixture_global');
  expect(response.status()).toBe(200); expect(response.headers()['cache-control']).toBe('no-store');
  const text = await response.text();
  expect(text).toContain('fixture_global_audit');
  expect(text).not.toMatch(/SECRET_BEFORE_FIXTURE|SECRET_AFTER_FIXTURE|SECRET_SHOP_EVENT/);
  await context.addCookies([cookie(fixture.token)]);
  expect((await directApi(page.request).get('/api/admin/audit/global')).status()).toBe(403);
});
