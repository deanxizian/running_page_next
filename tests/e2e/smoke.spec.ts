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

  test('unknown routes render the not-found page', async ({ page }) => {
    await page.goto('/missing-page');

    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });

  test('MapCN is the only map renderer', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await page.goto('/');

    await expect(page.locator('.maplibregl-map').first()).toBeVisible();
    await expect(page.locator('.maplibregl-ctrl-attrib')).toBeHidden();
    await expect(page.locator('.mapboxgl-map')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test('events modal opens and closes with Escape', async ({ page }) => {
    await page.goto('/events');

    const firstEvent = page.locator('[data-event-id]').first();
    await expect(firstEvent).toBeVisible();
    await firstEvent.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('dt')).toHaveCount(6);
    await expect(dialog.getByText('Temperature:')).toBeVisible();
    await expect(dialog.getByText('Elevation:')).toBeVisible();
    await expect(dialog.getByText('Avg. HR:')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
