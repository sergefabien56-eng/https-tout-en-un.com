import { resolve } from 'node:path';
import { expect, type Page } from '@playwright/test';

/** Axe dans Chromium réel (contraste inclus), sans réseau ni CDN. */
export async function expectNoSeriousAccessibilityViolations(page: Page): Promise<void> {
  await page.addScriptTag({ path: resolve(process.cwd(), 'node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => {
    const engine = (window as unknown as { axe: { run: (root: Document) => Promise<{
      violations: { id: string; impact: string | null; nodes: { target: string[] }[] }[];
    }> } }).axe;
    const result = await engine.run(document);
    return result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.map((n) => n.target.join(' ')).slice(0, 5) }));
  });
  expect(violations, 'Axe serious/critical sur la page active').toEqual([]);
}
