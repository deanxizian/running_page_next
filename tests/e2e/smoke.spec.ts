import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const raceActivity = {
  run_id: 990001,
  name: 'Fixture Half Marathon',
  distance: 21_100,
  moving_time: '2:00:00',
  workout_type: 1,
  start_date_local: '2026-07-20 08:00:00',
  start_time_local_ms: Date.UTC(2026, 6, 20, 8, 0, 0),
  month_key: '2026-07',
  year_key: '2026',
  location_country: '上海市, 中国',
  weather_temperature: 25.2,
  average_heartrate: 151,
  elevation_gain: 30,
  average_speed: 2.93,
};
const regularActivity = {
  ...raceActivity,
  run_id: 990002,
  name: 'Fixture Regular Run',
  distance: 10_000,
  workout_type: null,
  weather_temperature: undefined,
};
const recentActivity = {
  ...regularActivity,
  run_id: 990003,
  name: 'Fixture Recent Run',
  start_date_local: '2026-08-31 08:00:00',
  start_time_local_ms: Date.UTC(2026, 7, 31, 8, 0, 0),
  month_key: '2026-08',
  year_key: '2026',
};
const raceRoute = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

const fulfillJsonModule = async (
  page: Page,
  fileName: string,
  value: unknown
) => {
  await page.route(
    new RegExp(`/src/static/${fileName.replace('.', '\\.')}(?:\\?.*)?$`),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `export default ${JSON.stringify(value)};`,
      })
  );
};

const useEventFixture = async (
  page: Page,
  activities: Array<Record<string, unknown>> = [raceActivity]
) => {
  await fulfillJsonModule(page, 'activities.json', activities);
  await fulfillJsonModule(
    page,
    'event_routes.json',
    activities.some((activity) => activity.run_id === raceActivity.run_id)
      ? { [raceActivity.run_id]: raceRoute }
      : {}
  );
};

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

  test('shows hours when the latest run was less than one day ago', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(2026, 7, 31, 18, 30, 0));
    await fulfillJsonModule(page, 'activities.json', [recentActivity]);

    await page.goto('/');

    await expect(
      page.getByText('last run 10 hours ago', { exact: true })
    ).toBeVisible();
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
    await useEventFixture(page);
    const mapModuleRequest = page.waitForRequest((request) =>
      request.url().includes('/src/shared/map/RunMap.tsx')
    );

    await page.goto('/events');
    await mapModuleRequest;

    await expect(page.locator('[data-event-id]').first()).toBeVisible();
    await expect(page.locator('.maplibregl-map')).toHaveCount(0);
  });

  test('events modal opens and closes with Escape', async ({ page }) => {
    await useEventFixture(page);
    await page.goto('/events');

    const firstEvent = page.locator('[data-event-id]').first();
    await expect(firstEvent).toBeVisible();
    await firstEvent.focus();
    await firstEvent.press('Enter');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await expect(dialog.locator('dt')).toHaveCount(6);
    await expect(dialog.getByText('Temperature:')).toBeVisible();
    await expect(dialog.getByText('Elevation:')).toBeVisible();
    await expect(dialog.getByText('Avg. HR:')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(dialog).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(firstEvent).toBeFocused();
  });

  test('events page supports datasets without races', async ({ page }) => {
    await useEventFixture(page, [regularActivity]);

    await page.goto('/events');

    await expect(page.locator('[data-event-id]')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('event modal remains usable in a short viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 360 });
    await useEventFixture(page);
    await page.goto('/events');
    await page.locator('[data-event-id]').first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const dimensions = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      };
    });

    expect(dimensions.top).toBeGreaterThanOrEqual(0);
    expect(dimensions.bottom).toBeLessThanOrEqual(360);
    expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  });

  test('only route-owning pages request the full activity route bundle', async ({
    page,
  }) => {
    const routeRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/src/static/activity_routes.json')) {
        routeRequests.push(request.url());
      }
    });

    await useEventFixture(page);
    await page.goto('/events');
    await expect(page.locator('[data-event-id]').first()).toBeVisible();
    expect(routeRequests).toEqual([]);

    await page.goto('/heatmap');
    await expect(page.locator('[data-heat-key]').first()).toBeVisible();
    expect(routeRequests).toEqual([]);

    await page.goto('/');
    await expect.poll(() => routeRequests.length).toBeGreaterThan(0);
  });
});
