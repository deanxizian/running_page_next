import { describe, expect, it } from 'vitest';
import type { Activity } from '@/entities/activity/model/types';
import { localStartFieldsFor } from '@/entities/activity/model/schema';
import { groupActivities } from '@/entities/activity/lib/group';
import { currentPeriodRunsFor, metricsFor } from './selectors';

const activity = (
  runId: number,
  startDateLocal: string,
  distance: number
): Activity => {
  const dateFields = localStartFieldsFor(startDateLocal);

  if (!dateFields) {
    throw new Error('Invalid test activity date.');
  }

  return {
    run_id: runId,
    name: 'Run',
    distance,
    moving_time: '1:00:00',
    type: 'Run',
    subtype: 'Run',
    start_date: startDateLocal,
    start_date_local: startDateLocal,
    ...dateFields,
    location_country: '',
    summary_polyline: '',
    average_heartrate: null,
    elevation_gain: 0,
    average_speed: 2.777,
    streak: 1,
  };
};

describe('home selectors', () => {
  it('compares goals against the same period last year and last month', () => {
    const latestRun = activity(1, '2026-05-17 08:00:00', 20000);
    const activities = [
      latestRun,
      activity(2, '2026-05-20 08:00:00', 300000),
      activity(3, '2026-01-10 08:00:00', 10000),
      activity(4, '2025-05-17 08:00:00', 90000),
      activity(5, '2025-05-18 08:00:00', 200000),
      activity(6, '2025-04-10 08:00:00', 30000),
      activity(7, '2026-04-17 08:00:00', 50000),
      activity(8, '2026-04-18 08:00:00', 60000),
    ];
    const groups = groupActivities(activities);

    const periodRuns = currentPeriodRunsFor(
      groups,
      '2026',
      '2026-05',
      latestRun
    );
    const metrics = metricsFor(
      activities,
      periodRuns.currentYearRuns,
      periodRuns.lastYearSamePeriodRuns,
      periodRuns.currentMonthRuns,
      periodRuns.lastMonthSamePeriodRuns
    );

    expect(metrics.yearDistance).toBe(140);
    expect(metrics.lastYearSamePeriodDistance).toBe(120);
    expect(metrics.monthDistance).toBe(20);
    expect(metrics.lastMonthSamePeriodDistance).toBe(50);
  });
});
