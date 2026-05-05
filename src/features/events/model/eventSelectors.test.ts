import { describe, expect, it } from 'vitest';
import type { Activity } from '@/entities/activity/model/types';
import { localStartFieldsFor } from '@/entities/activity/model/schema';
import {
  eventPbLabelsFor,
  eventRunsFor,
  groupedEventsFor,
} from './eventSelectors';

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

describe('eventSelectors', () => {
  it('filters marathon event runs by title', () => {
    const eventRun = activity({ run_id: 1, name: '上海半程马拉松' });
    const normalRun = activity({ run_id: 2, name: 'Easy Run' });

    expect(eventRunsFor([eventRun, normalRun])).toEqual([eventRun]);
  });

  it('groups event runs by year descending', () => {
    const runs = [
      activity({
        run_id: 1,
        name: '2025 半程马拉松',
        start_date_local: '2025-05-01 08:00:00',
      }),
      activity({
        run_id: 2,
        name: '2026 半程马拉松',
        start_date_local: '2026-05-01 08:00:00',
      }),
    ];

    expect(groupedEventsFor(runs).map(([year]) => year)).toEqual([
      '2026',
      '2025',
    ]);
  });

  it('marks fastest half and full marathon events as PB', () => {
    const halfFast = activity({
      run_id: 1,
      name: '上海半程马拉松',
      moving_time: '1:20:00',
    });
    const halfSlow = activity({
      run_id: 2,
      name: '苏州半程马拉松',
      moving_time: '1:30:00',
    });
    const fullFast = activity({
      run_id: 3,
      name: '上海马拉松',
      moving_time: '3:10:00',
    });

    const labels = eventPbLabelsFor([halfSlow, halfFast, fullFast]);

    expect(labels.get(halfFast.run_id)).toBe('PB');
    expect(labels.has(halfSlow.run_id)).toBe(false);
    expect(labels.get(fullFast.run_id)).toBe('PB');
  });
});
