import { describe, expect, it } from 'vitest';
import type { Activity } from './model/types';
import { localStartFieldsFor } from './model/schema';
import { parseActivities } from './data/parseActivities';
import {
  buildActivitySnapshot,
  standardizeCountryName,
} from './data/buildActivitySnapshot';
import { monthKeyFor, shiftMonthKey, sortDateFunc } from './lib/date';
import { formatDuration, formatPace } from './lib/format';
import { groupActivities } from './lib/group';
import { isMarathonEventRun } from './lib/event';
import { geoJsonForRuns, getBoundsForRuns, pathForRun } from './lib/route';

const activity = (overrides: Partial<Activity> = {}): Activity => {
  const startDateLocal = overrides.start_date_local ?? '2026-05-01 08:00:00';
  const dateFields = localStartFieldsFor(startDateLocal);

  if (!dateFields) {
    throw new Error('Invalid test activity date.');
  }

  return {
    run_id: 1,
    name: 'Morning Run',
    distance: 10000,
    moving_time: '1:00:00',
    type: 'Run',
    subtype: 'Run',
    start_date: '2026-05-01 00:00:00',
    start_date_local: startDateLocal,
    ...dateFields,
    location_country: '',
    summary_polyline: '',
    average_heartrate: null,
    elevation_gain: 0,
    average_speed: 2.777,
    streak: 1,
    ...overrides,
  };
};

describe('activity date helpers', () => {
  it('sorts activities by local start time descending', () => {
    const older = activity({
      run_id: 1,
      start_date_local: '2026-04-01 08:00:00',
    });
    const newer = activity({
      run_id: 2,
      start_date_local: '2026-05-01 08:00:00',
    });

    expect([older, newer].sort(sortDateFunc)).toEqual([newer, older]);
  });

  it('builds and shifts month keys', () => {
    expect(monthKeyFor('2026-05-01 08:00:00')).toBe('2026-05');
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
  });
});

describe('activity grouping and snapshot', () => {
  it('groups activities by date, month and year', () => {
    const runs = [
      activity({ run_id: 1, start_date_local: '2026-05-01 08:00:00' }),
      activity({ run_id: 2, start_date_local: '2026-05-01 19:00:00' }),
      activity({ run_id: 3, start_date_local: '2025-12-31 08:00:00' }),
    ];

    const groups = groupActivities(runs);

    expect(groups.byDate.get('2026-05-01')).toHaveLength(2);
    expect(groups.byMonth.get('2026-05')).toHaveLength(2);
    expect(groups.byYear.get('2025')).toHaveLength(1);
  });

  it('parses valid activity data and builds a sorted snapshot', () => {
    const older = activity({
      run_id: 1,
      start_date_local: '2025-12-31 08:00:00',
    });
    const newer = activity({
      run_id: 2,
      start_date_local: '2026-05-01 08:00:00',
    });

    const parsed = parseActivities([older, newer]);
    const snapshot = buildActivitySnapshot(parsed);

    expect(snapshot.years).toEqual(['2026', '2025']);
    expect(snapshot.latestRun?.run_id).toBe(2);
    expect(snapshot.latestMonth).toBe('2026-05');
    expect(snapshot.earliestMonth).toBe('2025-12');
  });

  it('rejects invalid activity data', () => {
    expect(() => parseActivities([{ run_id: 1 }])).toThrow(
      'Invalid activity record at index 0.'
    );
  });

  it('standardizes known country names', () => {
    expect(standardizeCountryName('美利坚合众国')).toBe('美国');
  });
});

describe('activity formatting and event helpers', () => {
  it('formats duration and pace', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatPace(4)).toBe('4\'10"');
  });

  it('identifies marathon event runs by name', () => {
    expect(isMarathonEventRun(activity({ name: '上海半程马拉松' }))).toBe(true);
    expect(isMarathonEventRun(activity({ name: 'Easy Run' }))).toBe(false);
  });
});

describe('activity route helpers', () => {
  it('returns the default map bounds when no route is available', () => {
    expect(getBoundsForRuns([activity()])).toEqual({
      longitude: 20,
      latitude: 20,
      zoom: 3,
    });
  });

  it('uses finite zero coordinates for duplicate-point fallback routes', () => {
    const run = activity({
      run_id: 100,
      summary_polyline: '_ibE_seK??',
      location_country:
        "浙江省, 中国, {'latitude': 0.000000, 'longitude': 10.000000}",
    });

    expect(pathForRun(run)).toEqual([
      [10, 0],
      [10, 0],
    ]);
  });

  it('filters empty route geometries from run GeoJSON', () => {
    const runWithoutRoute = activity({
      run_id: 101,
      summary_polyline: '',
    });
    const runWithRoute = activity({
      run_id: 102,
      summary_polyline: '_ibE_seK?_ibE',
    });

    const data = geoJsonForRuns([runWithoutRoute, runWithRoute]);

    expect(data.features).toHaveLength(1);
    expect(data.features[0].properties?.runId).toBe(runWithRoute.run_id);
    expect(data.features[0].geometry.coordinates).toHaveLength(2);
  });
});
