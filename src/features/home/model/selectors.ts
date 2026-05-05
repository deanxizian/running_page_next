import type { Activity } from '@/entities/activity/model/types';
import type { ActivityGroups } from '@/entities/activity/lib/group';
import { shiftMonthKey } from '@/entities/activity/lib/date';
import {
  EMPTY_ACTIVITIES,
  ROWS_PER_PAGE,
  formatMonthlyBarDistance,
  getMondayFirstDayIndex,
  isMarathonEventRun,
  totalDistance,
  totalSeconds,
} from '@/shared/lib/dashboard';
import type { CalendarCellViewModel, MonthlyBarViewModel } from './types';

const activitiesForFilter = (
  filter: string,
  sortedActivities: Activity[],
  activityGroups: ActivityGroups
) => {
  if (filter === 'All') {
    return sortedActivities;
  }
  return activityGroups.byYear.get(filter) ?? EMPTY_ACTIVITIES;
};

const pageCountFor = (runs: Activity[]) =>
  Math.max(1, Math.ceil(runs.length / ROWS_PER_PAGE));

const pagedRunsFor = (runs: Activity[], page: number) => {
  const start = page * ROWS_PER_PAGE;
  return runs.slice(start, start + ROWS_PER_PAGE);
};

const pageForRun = (
  run: Activity,
  filter: string,
  sortedActivities: Activity[],
  activityGroups: ActivityGroups,
  fallbackPage: number
) => {
  const runIndex = activitiesForFilter(
    filter,
    sortedActivities,
    activityGroups
  ).findIndex((activity) => activity.run_id === run.run_id);

  if (runIndex === -1) {
    return fallbackPage;
  }

  return Math.floor(runIndex / ROWS_PER_PAGE);
};

const currentPeriodRunsFor = (
  activityGroups: ActivityGroups,
  thisYear: string,
  latestMonth: string
) => {
  const currentYearRuns =
    activityGroups.byYear.get(thisYear) ?? EMPTY_ACTIVITIES;
  const previousYearRuns =
    activityGroups.byYear.get(String(Number(thisYear) - 1)) ?? EMPTY_ACTIVITIES;
  const currentMonthRuns = latestMonth
    ? (activityGroups.byMonth.get(latestMonth) ?? EMPTY_ACTIVITIES)
    : EMPTY_ACTIVITIES;
  const previousMonth = latestMonth ? shiftMonthKey(latestMonth, -1) : '';
  const previousMonthRuns = previousMonth
    ? (activityGroups.byMonth.get(previousMonth) ?? EMPTY_ACTIVITIES)
    : EMPTY_ACTIVITIES;

  return {
    currentYearRuns,
    previousYearRuns,
    currentMonthRuns,
    previousMonthRuns,
  };
};

const metricsFor = (
  sortedActivities: Activity[],
  currentYearRuns: Activity[],
  previousYearRuns: Activity[],
  currentMonthRuns: Activity[],
  previousMonthRuns: Activity[]
) => ({
  yearDistance: totalDistance(currentYearRuns),
  previousYearDistance: totalDistance(previousYearRuns),
  monthDistance: totalDistance(currentMonthRuns),
  previousMonthDistance: totalDistance(previousMonthRuns),
  allDistance: totalDistance(sortedActivities),
  allSeconds: totalSeconds(sortedActivities),
});

const eventSummaryFor = (
  currentYearRuns: Activity[],
  sortedActivities: Activity[],
  latestRun: Activity | null
) => {
  const marathonRuns = currentYearRuns.filter(isMarathonEventRun);
  const latestLongRun =
    marathonRuns[0] ?? sortedActivities.find(isMarathonEventRun) ?? latestRun;

  return {
    marathonRuns,
    latestLongRun: latestLongRun ?? null,
  };
};

const calendarFor = (
  activityGroups: ActivityGroups,
  calendarMonth: string
): { cells: CalendarCellViewModel[]; monthlyDistance: number } => {
  if (!calendarMonth) {
    return {
      cells: [],
      monthlyDistance: 0,
    };
  }

  const [year, month] = calendarMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = getMondayFirstDayIndex(new Date(year, month - 1, 1));
  const runsByDay = new Map<number, Activity[]>();
  const monthRuns =
    activityGroups.byMonth.get(calendarMonth) ?? EMPTY_ACTIVITIES;

  monthRuns.forEach((run) => {
    const day = Number(run.start_date_local.slice(8, 10));
    const runs = runsByDay.get(day) ?? [];
    runs.push(run);
    runsByDay.set(day, runs);
  });

  const cells: CalendarCellViewModel[] = Array.from(
    { length: firstDay },
    () => ({
      day: null,
      runs: [],
      distance: 0,
    })
  );

  for (let day = 1; day <= daysInMonth; day += 1) {
    const runs = runsByDay.get(day) ?? [];
    cells.push({
      day,
      runs,
      distance: totalDistance(runs),
    });
  }

  while (cells.length < 42) {
    cells.push({
      day: null,
      runs: [],
      distance: 0,
    });
  }

  return {
    cells,
    monthlyDistance: totalDistance(monthRuns),
  };
};

const monthlyChartYearFor = (
  calendarMonth: string,
  latestMonth: string,
  thisYear: string
) => (calendarMonth || latestMonth || `${thisYear}-01`).slice(0, 4);

const monthlyBarsFor = (
  activityGroups: ActivityGroups,
  monthlyChartYear: string,
  isMonthWithinActivityRange: (monthKey: string) => boolean
): MonthlyBarViewModel[] => {
  const year = Number(monthlyChartYear);
  const totals = Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`;
    return totalDistance(activityGroups.byMonth.get(month) ?? EMPTY_ACTIVITIES);
  });
  const max = Math.max(...totals, 1);

  return totals.map((value, index) => {
    const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;

    return {
      month: `${index + 1}月`,
      monthKey,
      distanceLabel: formatMonthlyBarDistance(value),
      height: `${Math.max(4, (value / max) * 100)}%`,
      inRange: isMonthWithinActivityRange(monthKey),
    };
  });
};

const chartYearsFor = (years: string[], monthlyChartYear: string) => {
  const currentMonthlyChartYearNumber = Number(monthlyChartYear);
  const olderMonthlyChartYear =
    years
      .map(Number)
      .filter((year) => year < currentMonthlyChartYearNumber)
      .sort((a, b) => b - a)[0]
      ?.toString() ?? null;
  const newerMonthlyChartYear =
    years
      .map(Number)
      .filter((year) => year > currentMonthlyChartYearNumber)
      .sort((a, b) => a - b)[0]
      ?.toString() ?? null;

  return {
    olderMonthlyChartYear,
    newerMonthlyChartYear,
  };
};

export {
  activitiesForFilter,
  calendarFor,
  chartYearsFor,
  currentPeriodRunsFor,
  eventSummaryFor,
  metricsFor,
  monthlyBarsFor,
  monthlyChartYearFor,
  pageCountFor,
  pageForRun,
  pagedRunsFor,
};
