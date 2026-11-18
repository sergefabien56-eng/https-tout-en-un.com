import { readFileSync } from 'node:fs';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { ownerRecoveryIndex, type OwnerScenario } from './owner-codes';

/** Connexion propriétaire CI réutilisable, codes de secours réservés par scénario. */
export async function loginOwnerScenario(page: Page, testInfo: TestInfo, scenario: OwnerScenario): Promise<void> {
  const codes = readFileSync(process.env.E2E_RECOVERY_FILE!, 'utf8').trim().split('\n');
  const code = codes[ownerRecoveryIndex(scenario, testInfo.retry, testInfo.project.name)];
  expect(code).toMatch(/^[A-Za-z0-9_-]{22}$/);
  await page.goto('/connexion');
  await page.getByLabel('Adresse e-mail').fill('proprietaire@ci.invalid');
  await page.getByLabel('Mot de passe').fill('MotDePasseCI!2026');
  await page.getByLabel('Code à 6 chiffres ou code de secours').fill(code!);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/espace$/);
}

export const espacePages = [
  '/espace', '/espace/boutiques', '/espace/utilisateurs', '/espace/roles', '/espace/journal',
  '/espace/journal/global', '/espace/parametres', '/espace/systeme', '/espace/sessions',
  '/espace/notifications', '/espace/apparence', '/espace/recherche', '/espace/membres',
] as const;

/**
 * Recette L10 — débordement horizontal : aucun écran ne doit dépasser la largeur du
 * viewport, ni à la connexion ni dans l'espace privé connecté, formulaire compris.
 * Le test échoue avec la liste précise des pages fautives.
 */
export function expectNoHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const viewport = window.innerWidth;
    const doc = document.documentElement.scrollWidth;
    const offenders: string[] = [];
    // Un tableau large est acceptable s'il défile DANS son conteneur dédié
    // (overflow-x auto/scroll) : la page, elle, ne doit jamais défiler horizontalement.
    const contained = (element: Element): boolean => {
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const overflow = getComputedStyle(parent).overflowX;
        if (overflow === 'auto' || overflow === 'scroll') return true;
      }
      return false;
    };
    for (const element of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      // Seul un dépassement À DROITE peut créer un défilement horizontal de page.
      if (box.right > viewport + 1 && !contained(element)) {
        const name = `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).trim().split(/\s+/).join('.')}` : ''}`;
        offenders.push(`${name} (${Math.round(box.left)}→${Math.round(box.right)})`);
      }
    }
    // Le défilement de page lui-même reste l'arbitre : il ne doit jamais dépasser.
    return { viewport, doc, offenders: doc > viewport ? offenders.slice(0, 5) : [] };
  });
}

test('mobile 375 px : connexion et espace privé sans débordement horizontal', async ({ page }, testInfo) => {
  // Le serveur Next dev compile chaque route à la demande : marge large, assertions strictes.
  test.setTimeout(480_000);
  test.skip(!process.env.E2E_RECOVERY_FILE, 'PostgreSQL CI + bootstrap requis.');
  // Contrôle 375 px : sans objet sur le projet bureau (menu latéral toujours visible).
  test.skip(testInfo.project.name !== 'mobile-375', 'Vérification réservée au viewport 375 px.');
  await page.goto('/connexion');
  await expect(page.getByRole('heading', { name: /Connexion à votre espace/ })).toBeVisible();
  const loginSizes = await expectNoHorizontalOverflow(page);
  expect(loginSizes.doc, `connexion : document ${loginSizes.doc} > viewport ${loginSizes.viewport} ${JSON.stringify(loginSizes.offenders)}`)
    .toBeLessThanOrEqual(loginSizes.viewport);

  // Scénario 4 : réservé à ce fichier, distinct de ceux d'authenticated-admin.spec.ts.
  // Un code de secours est à usage unique : partager un scénario ferait échouer la seconde
  // connexion de la suite CI.
  await loginOwnerScenario(page, testInfo, 4);
  const offenders: string[] = [];
  for (const path of espacePages) {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `statut HTTP de ${path}`).toBe(200);
    const menu = page.getByRole('button', { name: 'Ouvrir le menu' });
    // La colonne latérale est un <aside aria-label="Navigation principale"> (rôle complementary),
    // présente hors écran quand elle est fermée : on ne vérifie que la présence du menu.
    const sidebar = page.locator('#app-sidebar');
    await expect(menu).toBeVisible();
    let sizes = await expectNoHorizontalOverflow(page);
    if (sizes.doc > sizes.viewport || sizes.offenders.length > 0) {
      offenders.push(`${path} fermé : document ${sizes.doc}/${sizes.viewport} ${JSON.stringify(sizes.offenders)}`);
    }
    // Tiroir de navigation ouvert : le panneau doit tenir dans la largeur, sans déborder.
    if (await menu.isVisible()) {
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await menu.click();
      // Le tiroir est un panneau translaté, jamais réellement masqué : son état se lit
      // sur aria-expanded, et sa position doit être dans le viewport quand il est ouvert.
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      // Le panneau glisse en 0,2 s : attendre la fin de la transition avant de mesurer.
      await expect.poll(async () => (await sidebar.boundingBox())?.x ?? -999,
        { message: 'tiroir ouvert ancré à gauche' }).toBeGreaterThanOrEqual(0);
      const openBox = await sidebar.boundingBox();
      expect(openBox!.width, 'tiroir ouvert contenu dans 375 px').toBeLessThanOrEqual(375);
      sizes = await expectNoHorizontalOverflow(page);
      if (sizes.doc > sizes.viewport || sizes.offenders.length > 0) {
        offenders.push(`${path} tiroir ouvert : document ${sizes.doc}/${sizes.viewport} ${JSON.stringify(sizes.offenders)}`);
      }
      // Fermer par le bouton DANS le tiroir : le voile extérieur est recouvert par le panneau.
      await page.locator('button.drawer-close').click();
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await expect.poll(async () => (await sidebar.boundingBox())?.x ?? 0,
        { message: 'tiroir refermé hors du viewport' }).toBeLessThan(0);
    }
  }
  expect(offenders).toEqual([]);
});
