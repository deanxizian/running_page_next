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

const localDateKeyFor = (run: Activity) => run.start_date_local.slice(0, 10);

const daysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

const dateKeyFor = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const cutoffDateForYear = (year: number, anchorDateKey: string) => {
  const [, anchorMonth, anchorDay] = anchorDateKey.split('-').map(Number);
  return dateKeyFor(
    year,
    anchorMonth,
    Math.min(anchorDay, daysInMonth(year, anchorMonth))
  );
};

const cutoffDateForMonth = (monthKey: string, anchorDateKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  const anchorDay = Number(anchorDateKey.slice(8, 10));
  return dateKeyFor(year, month, Math.min(anchorDay, daysInMonth(year, month)));
};

const runsUpToDate = (runs: Activity[], cutoffDateKey: string) =>
  runs.filter((run) => localDateKeyFor(run) <= cutoffDateKey);

const currentPeriodRunsFor = (
  activityGroups: ActivityGroups,
  anchorDateKey: string
) => {
  const thisYear = anchorDateKey.slice(0, 4);
  const currentMonth = anchorDateKey.slice(0, 7);
  const currentYearRuns =
    activityGroups.byYear.get(thisYear) ?? EMPTY_ACTIVITIES;
  const lastYearRuns =
    activityGroups.byYear.get(String(Number(thisYear) - 1)) ?? EMPTY_ACTIVITIES;
  const currentMonthRuns = currentMonth
    ? (activityGroups.byMonth.get(currentMonth) ?? EMPTY_ACTIVITIES)
    : EMPTY_ACTIVITIES;
  const previousMonth = currentMonth ? shiftMonthKey(currentMonth, -1) : '';
  const previousMonthRuns = previousMonth
    ? (activityGroups.byMonth.get(previousMonth) ?? EMPTY_ACTIVITIES)
    : EMPTY_ACTIVITIES;

  if (!anchorDateKey) {
    return {
      currentYearRuns,
      lastYearSamePeriodRuns: lastYearRuns,
      currentMonthRuns,
      lastMonthSamePeriodRuns: previousMonthRuns,
    };
  }

  return {
    currentYearRuns: runsUpToDate(
      currentYearRuns,
      cutoffDateForYear(Number(thisYear), anchorDateKey)
    ),
    lastYearSamePeriodRuns: runsUpToDate(
      lastYearRuns,
      cutoffDateForYear(Number(thisYear) - 1, anchorDateKey)
    ),
    currentMonthRuns: runsUpToDate(
      currentMonthRuns,
      cutoffDateForMonth(currentMonth, anchorDateKey)
    ),
    lastMonthSamePeriodRuns: previousMonth
      ? runsUpToDate(
          previousMonthRuns,
          cutoffDateForMonth(previousMonth, anchorDateKey)
        )
      : EMPTY_ACTIVITIES,
  };
};

const metricsFor = (
  sortedActivities: Activity[],
  currentYearRuns: Activity[],
  lastYearSamePeriodRuns: Activity[],
  currentMonthRuns: Activity[],
  lastMonthSamePeriodRuns: Activity[]
) => ({
  yearDistance: totalDistance(currentYearRuns),
  lastYearSamePeriodDistance: totalDistance(lastYearSamePeriodRuns),
  monthDistance: totalDistance(currentMonthRuns),
  lastMonthSamePeriodDistance: totalDistance(lastMonthSamePeriodRuns),
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
