import { expect, test } from '@playwright/test';

const routeCases = [
  { path: '/', navLabel: '首页' },
  { path: '/heatmap', navLabel: '热力图' },
  { path: '/events', navLabel: '赛事记录' },
];

test.describe('app smoke', () => {
  for (const { path, navLabel } of routeCases) {
    test(`${path} renders`, async ({ page }) => {
      await page.goto(path);

      await expect(
        page.getByRole('link', { name: /Running Page/ })
      ).toBeVisible();
      await expect(page.getByRole('link', { name: navLabel })).toBeVisible();
    });
  }

  test('events modal opens and closes with Escape', async ({ page }) => {
    await page.goto('/events');

    const firstEvent = page.locator('[data-event-id]').first();
    await expect(firstEvent).toBeVisible();
    await firstEvent.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});
