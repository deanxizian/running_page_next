import { describe, expect, it } from 'vitest';
import type { Activity } from '@/entities/activity/model/types';
import { localStartFieldsFor } from '@/entities/activity/model/schema';
import { createHomeDashboardState, homeReducer } from './homeReducer';

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

describe('homeReducer', () => {
  it('initializes the default year filter and latest calendar month', () => {
    expect(
      createHomeDashboardState({
        thisYear: '2026',
        latestMonth: '2026-05',
      })
    ).toMatchObject({
      yearFilter: '2026',
      calendarMonth: '2026-05',
      page: 0,
      selectedRun: null,
    });
  });

  it('changes month and synchronizes year filter when requested', () => {
    const state = createHomeDashboardState({
      thisYear: '2026',
      latestMonth: '2026-05',
    });

    const nextState = homeReducer(state, {
      type: 'changeMonth',
      monthKey: '2025-12',
      years: ['2026', '2025'],
      earliestMonth: '2025-01',
      latestMonth: '2026-05',
      syncYearFilter: true,
    });

    expect(nextState).toMatchObject({
      calendarMonth: '2025-12',
      yearFilter: '2025',
      page: 0,
      selectedRun: null,
      calendarSlideDirection: 'backward',
      monthlyChartSlideDirection: 'backward',
    });
  });

  it('ignores out-of-range month changes', () => {
    const state = createHomeDashboardState({
      thisYear: '2026',
      latestMonth: '2026-05',
    });

    expect(
      homeReducer(state, {
        type: 'changeMonth',
        monthKey: '2024-12',
        years: ['2026', '2025'],
        earliestMonth: '2025-01',
        latestMonth: '2026-05',
        syncYearFilter: true,
      })
    ).toBe(state);
  });

  it('selects a run and applies the requested page and year filter', () => {
    const state = {
      ...createHomeDashboardState({
        thisYear: '2026',
        latestMonth: '2026-05',
      }),
      yearFilter: '2026',
      page: 0,
    };
    const run = activity({
      run_id: 42,
      start_date_local: '2025-12-31 07:00:00',
    });

    const nextState = homeReducer(state, {
      type: 'selectRun',
      run,
      nextYearFilter: '2025',
      nextPage: 2,
      years: ['2026', '2025'],
      earliestMonth: '2025-01',
      latestMonth: '2026-05',
    });

    expect(nextState).toMatchObject({
      selectedRun: run,
      calendarMonth: '2025-12',
      yearFilter: '2025',
      page: 2,
    });
  });

  it('resets selection and page when changing year', () => {
    const selectedRun = activity();
    const state = {
      ...createHomeDashboardState({
        thisYear: '2026',
        latestMonth: '2026-05',
      }),
      selectedRun,
      page: 3,
    };

    const nextState = homeReducer(state, {
      type: 'changeYear',
      year: '2025',
      monthKey: '2025-05',
      years: ['2026', '2025'],
      earliestMonth: '2025-01',
      latestMonth: '2026-05',
    });

    expect(nextState).toMatchObject({
      yearFilter: '2025',
      calendarMonth: '2025-05',
      selectedRun: null,
      page: 0,
    });
  });

  it('keeps pagination within valid bounds', () => {
    const state = {
      ...createHomeDashboardState({
        thisYear: '2026',
        latestMonth: '2026-05',
      }),
      page: 1,
    };

    expect(homeReducer(state, { type: 'previousPage' }).page).toBe(0);
    expect(homeReducer(state, { type: 'nextPage', pageCount: 2 }).page).toBe(1);
    expect(homeReducer(state, { type: 'nextPage', pageCount: 5 }).page).toBe(2);
    expect(homeReducer(state, { type: 'setPage', page: -10 }).page).toBe(0);
  });
});
