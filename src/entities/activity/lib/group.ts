import type { Activity } from '../model/types';
import { monthKeyFor, yearKeyFor } from './date';

export type ActivityGroups = {
  byDate: Map<string, Activity[]>;
  byMonth: Map<string, Activity[]>;
  byYear: Map<string, Activity[]>;
};

const groupActivities = (runs: Activity[]): ActivityGroups => {
  const byDate = new Map<string, Activity[]>();
  const byMonth = new Map<string, Activity[]>();
  const byYear = new Map<string, Activity[]>();

  runs.forEach((run) => {
    const date = run.start_date_local.slice(0, 10);
    const month = monthKeyFor(run.start_date_local);
    const year = yearKeyFor(run.start_date_local);

    byDate.set(date, [...(byDate.get(date) ?? []), run]);
    byMonth.set(month, [...(byMonth.get(month) ?? []), run]);
    byYear.set(year, [...(byYear.get(year) ?? []), run]);
  });

  return { byDate, byMonth, byYear };
};

export { groupActivities };
