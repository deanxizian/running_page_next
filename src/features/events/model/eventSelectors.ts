import type { Activity } from '@/entities/activity/model/types';
import { convertMovingTime2Sec } from '@/entities/activity/lib/format';
import {
  getRacePbCategory,
  isMarathonEventRun,
} from '@/entities/activity/lib/event';
import type { RacePbCategory } from '@/entities/activity/lib/event';
import type { EventGroup } from './types';

const eventRunsFor = (runs: Activity[]) => runs.filter(isMarathonEventRun);

const groupedEventsFor = (eventRuns: Activity[]): EventGroup[] => {
  const groups = new Map<string, Activity[]>();

  eventRuns.forEach((run) => {
    const year = run.year_key;
    groups.set(year, [...(groups.get(year) ?? []), run]);
  });

  return [...groups.entries()].sort(([a], [b]) => Number(b) - Number(a));
};

const eventPbLabelsFor = (eventRuns: Activity[]) => {
  const bestByCategory = new Map<
    RacePbCategory,
    { run: Activity; seconds: number }
  >();

  eventRuns.forEach((run) => {
    const category = getRacePbCategory(run);
    const seconds = convertMovingTime2Sec(run.moving_time);

    if (!category || seconds <= 0) {
      return;
    }

    const currentBest = bestByCategory.get(category);
    if (!currentBest || seconds < currentBest.seconds) {
      bestByCategory.set(category, { run, seconds });
    }
  });

  const labels = new Map<number, string>();
  const halfPb = bestByCategory.get('half');
  const fullPb = bestByCategory.get('full');

  if (halfPb) {
    labels.set(halfPb.run.run_id, 'PB');
  }
  if (fullPb) {
    labels.set(fullPb.run.run_id, 'PB');
  }

  return labels;
};

export { eventPbLabelsFor, eventRunsFor, groupedEventsFor };
