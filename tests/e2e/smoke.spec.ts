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
    const mapMetadataRequests: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    page.on('request', (request) => {
      if (
        request.url().includes('dark-matter-gl-style/style.json') ||
        request.url().endsWith('/tiles.json')
      ) {
        mapMetadataRequests.push(request.url());
      }
    });

    await page.goto('/');

    await expect(page.locator('.maplibregl-map').first()).toBeVisible();
    await expect(page.locator('.maplibregl-ctrl-attrib')).toBeHidden();
    await expect(page.locator('.mapboxgl-map')).toHaveCount(0);
    expect(mapMetadataRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('reuses the map canvas when navigating away and back', async ({
    page,
  }) => {
    await page.goto('/');

    const canvas = page.locator('.maplibregl-canvas');
    await expect(canvas).toBeVisible();
    await expect(page.locator('[class*="mapBaseShieldHidden"]')).toBeAttached();
    const initialCanvas = await canvas.elementHandle();
    expect(initialCanvas).not.toBeNull();

    await page.getByRole('link', { name: '热力图' }).click();
    await expect(page).toHaveURL(/\/heatmap$/);
    await page.getByRole('link', { name: '首页' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(canvas).toBeVisible();

    const reusedCanvas = await canvas.evaluate(
      (currentCanvas, previousCanvas) => currentCanvas === previousCanvas,
      initialCanvas
    );
    expect(reusedCanvas).toBe(true);
  });

  test('preloads the event map without mounting it', async ({ page }) => {
    const mapModuleRequest = page.waitForRequest((request) =>
      request.url().includes('/src/shared/map/RunMap.tsx')
    );

    await page.goto('/events');
    await mapModuleRequest;

    await expect(page.locator('[data-event-id]').first()).toBeVisible();
    await expect(page.locator('.maplibregl-map')).toHaveCount(0);
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
