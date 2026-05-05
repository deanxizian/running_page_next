import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
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
} from '@/components/NextDashboard/shared';
import {
  useTouchRevealAction,
  useTouchPreview,
} from '@/components/NextDashboard/hooks';
import {
  useCalendarRange,
  useRunMapFocus,
} from '@/components/NextDashboard/homeHooks';
import type {
  CalendarCell,
  MonthlyBar,
} from '@/components/NextDashboard/HomeSections';
import styles from '@/components/NextDashboard/style.module.css';
import { createHomeDashboardState, homeReducer } from './homeReducer';

type UseHomeDashboardParams = {
  years: string[];
  thisYear: string;
  sortedActivities: Activity[];
  activityGroups: ActivityGroups;
  latestRun: Activity | null;
  latestMonth: string;
  earliestMonth: string;
  openEvents: () => void;
};

const useHomeDashboard = ({
  years,
  thisYear,
  sortedActivities,
  activityGroups,
  latestRun,
  latestMonth,
  earliestMonth,
  openEvents,
}: UseHomeDashboardParams) => {
  const [state, dispatch] = useReducer(
    homeReducer,
    { thisYear, latestMonth },
    createHomeDashboardState
  );
  const [totalTouchRevealResetSignal, setTotalTouchRevealResetSignal] =
    useState(0);
  const [eventTouchRevealResetSignal, setEventTouchRevealResetSignal] =
    useState(0);
  const [hoveredMonthKey, setHoveredMonthKey] = useState<string | null>(null);
  const clearTotalTouchReveal = useCallback(
    () => setTotalTouchRevealResetSignal((signal) => signal + 1),
    []
  );
  const clearEventTouchReveal = useCallback(
    () => setEventTouchRevealResetSignal((signal) => signal + 1),
    []
  );
  const {
    isTouchRevealActive: isEventTouchRevealActive,
    touchRevealHandlers: eventTouchRevealHandlers,
  } = useTouchRevealAction(openEvents, {
    onRevealStart: clearTotalTouchReveal,
    resetSignal: eventTouchRevealResetSignal,
  });
  const {
    previewedKey: previewedCalendarKey,
    showTouchPreview: previewCalendarCell,
    clearTouchPreview: clearCalendarPreview,
  } = useTouchPreview<string>();
  const {
    previewedKey: previewedMonthlyBarKey,
    showTouchPreview: previewMonthlyBar,
    clearTouchPreview: clearMonthlyBarPreview,
  } = useTouchPreview<string>();
  const { isMonthWithinActivityRange, clampMonthToActivityRange } =
    useCalendarRange(earliestMonth, latestMonth);

  useEffect(() => {
    dispatch({ type: 'initializeMonth', monthKey: latestMonth });
  }, [latestMonth]);

  useEffect(() => {
    if (
      !state.calendarMonth ||
      isMonthWithinActivityRange(state.calendarMonth)
    ) {
      return;
    }

    dispatch({
      type: 'clampMonth',
      monthKey: clampMonthToActivityRange(state.calendarMonth),
      earliestMonth,
      latestMonth,
    });
  }, [
    clampMonthToActivityRange,
    earliestMonth,
    isMonthWithinActivityRange,
    latestMonth,
    state.calendarMonth,
  ]);

  const previewCalendarCellAtPoint = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') {
        return;
      }

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const calendarButton = element?.closest<HTMLButtonElement>(
        '[data-calendar-key]'
      );

      if (!calendarButton || calendarButton.disabled) {
        return;
      }

      previewCalendarCell(calendarButton.dataset.calendarKey);
    },
    [previewCalendarCell]
  );

  const previewMonthlyBarAtPoint = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') {
        return;
      }

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const barButton = element?.closest<HTMLButtonElement>('[data-month-key]');

      if (!barButton || barButton.disabled) {
        return;
      }

      previewMonthlyBar(barButton.dataset.monthKey);
    },
    [previewMonthlyBar]
  );

  const getActivitiesForFilter = useCallback(
    (filter: string) => {
      if (filter === 'All') {
        return sortedActivities;
      }
      return activityGroups.byYear.get(filter) ?? EMPTY_ACTIVITIES;
    },
    [activityGroups, sortedActivities]
  );

  const displayedActivities = useMemo(
    () => getActivitiesForFilter(state.yearFilter),
    [getActivitiesForFilter, state.yearFilter]
  );
  const pageCount = Math.max(
    1,
    Math.ceil(displayedActivities.length / ROWS_PER_PAGE)
  );
  const pagedRuns = useMemo(() => {
    const start = state.page * ROWS_PER_PAGE;
    return displayedActivities.slice(start, start + ROWS_PER_PAGE);
  }, [displayedActivities, state.page]);

  useEffect(() => {
    if (state.page <= pageCount - 1) {
      return;
    }

    dispatch({ type: 'setPage', page: pageCount - 1 });
  }, [pageCount, state.page]);

  const pageForRun = useCallback(
    (run: Activity, filter: string) => {
      const runIndex = getActivitiesForFilter(filter).findIndex(
        (activity) => activity.run_id === run.run_id
      );

      if (runIndex === -1) {
        return state.page;
      }

      return Math.floor(runIndex / ROWS_PER_PAGE);
    },
    [getActivitiesForFilter, state.page]
  );

  const changeCalendarMonth = useCallback(
    (monthKey: string) => {
      dispatch({
        type: 'changeMonth',
        monthKey,
        years,
        earliestMonth,
        latestMonth,
        syncYearFilter: true,
      });
    },
    [earliestMonth, latestMonth, years]
  );

  const selectRun = useCallback(
    (run: Activity | null) => {
      if (!run) {
        dispatch({
          type: 'selectRun',
          run: null,
          years,
          earliestMonth,
          latestMonth,
        });
        return;
      }

      const runYear = run.start_date_local.slice(0, 4);
      const nextYearFilter =
        state.yearFilter === 'All' || state.yearFilter === runYear
          ? state.yearFilter
          : runYear;

      dispatch({
        type: 'selectRun',
        run,
        nextYearFilter,
        nextPage: pageForRun(run, nextYearFilter),
        years,
        earliestMonth,
        latestMonth,
      });
    },
    [earliestMonth, latestMonth, pageForRun, state.yearFilter, years]
  );

  const toggleRunSelection = useCallback(
    (run: Activity) => {
      selectRun(state.selectedRun?.run_id === run.run_id ? null : run);
    },
    [selectRun, state.selectedRun]
  );

  const currentYearRuns =
    activityGroups.byYear.get(thisYear) ?? EMPTY_ACTIVITIES;
  const previousYear = String(Number(thisYear) - 1);
  const previousYearRuns =
    activityGroups.byYear.get(previousYear) ?? EMPTY_ACTIVITIES;
  const currentMonthRuns = latestMonth
    ? (activityGroups.byMonth.get(latestMonth) ?? EMPTY_ACTIVITIES)
    : EMPTY_ACTIVITIES;
  const previousMonth = latestMonth ? shiftMonthKey(latestMonth, -1) : '';
  const previousMonthRuns = previousMonth
    ? (activityGroups.byMonth.get(previousMonth) ?? EMPTY_ACTIVITIES)
    : EMPTY_ACTIVITIES;

  const mapRuns = useMemo(
    () => (state.selectedRun ? [state.selectedRun] : displayedActivities),
    [displayedActivities, state.selectedRun]
  );
  const { selectedGeoData, viewState, setMapViewState, handleMapReady } =
    useRunMapFocus(mapRuns, state.selectedRun);

  const yearDistance = totalDistance(currentYearRuns);
  const previousYearDistance = totalDistance(previousYearRuns);
  const monthDistance = totalDistance(currentMonthRuns);
  const previousMonthDistance = totalDistance(previousMonthRuns);
  const allDistance = totalDistance(sortedActivities);
  const allSeconds = totalSeconds(sortedActivities);
  const marathonRuns = useMemo(
    () => currentYearRuns.filter(isMarathonEventRun),
    [currentYearRuns]
  );
  const latestLongRun =
    marathonRuns[0] ?? sortedActivities.find(isMarathonEventRun) ?? latestRun;

  const calendar = useMemo(() => {
    if (!state.calendarMonth) {
      return {
        cells: [] as CalendarCell[],
        monthlyDistance: 0,
      };
    }

    const [year, month] = state.calendarMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = getMondayFirstDayIndex(new Date(year, month - 1, 1));
    const runsByDay = new Map<number, Activity[]>();
    const monthRuns =
      activityGroups.byMonth.get(state.calendarMonth) ?? EMPTY_ACTIVITIES;

    monthRuns.forEach((run) => {
      const day = Number(run.start_date_local.slice(8, 10));
      const runs = runsByDay.get(day) ?? [];
      runs.push(run);
      runsByDay.set(day, runs);
    });

    const cells: CalendarCell[] = Array.from({ length: firstDay }, () => ({
      day: null,
      runs: [],
      distance: 0,
    }));

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
  }, [activityGroups, state.calendarMonth]);

  const monthlyChartYear = (
    state.calendarMonth ||
    latestMonth ||
    `${thisYear}-01`
  ).slice(0, 4);

  const monthlyBars = useMemo<MonthlyBar[]>(() => {
    const year = Number(monthlyChartYear);
    const totals = Array.from({ length: 12 }, (_, index) => {
      const month = `${year}-${String(index + 1).padStart(2, '0')}`;
      return totalDistance(
        activityGroups.byMonth.get(month) ?? EMPTY_ACTIVITIES
      );
    });
    const max = Math.max(...totals, 1);
    return totals.map((value, index) => ({
      month: `${index + 1}月`,
      monthKey: `${year}-${String(index + 1).padStart(2, '0')}`,
      distanceLabel: formatMonthlyBarDistance(value),
      height: `${Math.max(4, (value / max) * 100)}%`,
      inRange: isMonthWithinActivityRange(
        `${year}-${String(index + 1).padStart(2, '0')}`
      ),
    }));
  }, [activityGroups, isMonthWithinActivityRange, monthlyChartYear]);

  const activeMonthlyBarKey =
    hoveredMonthKey ??
    previewedMonthlyBarKey ??
    state.calendarMonth ??
    latestMonth;
  const calendarSlideClass =
    state.calendarSlideDirection === 'backward'
      ? styles.calendarSlideBackward
      : state.calendarSlideDirection === 'forward'
        ? styles.calendarSlideForward
        : '';
  const monthlyChartSlideClass =
    state.monthlyChartSlideDirection === 'backward'
      ? styles.calendarSlideBackward
      : state.monthlyChartSlideDirection === 'forward'
        ? styles.calendarSlideForward
        : '';

  const monthKeyForSelectedMonthInYear = useCallback(
    (year: string) => {
      const selectedMonth = (
        state.calendarMonth ||
        latestMonth ||
        `${thisYear}-01`
      ).slice(5, 7);
      return clampMonthToActivityRange(`${year}-${selectedMonth}`);
    },
    [clampMonthToActivityRange, latestMonth, state.calendarMonth, thisYear]
  );

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
  const previousCalendarMonth = state.calendarMonth
    ? shiftMonthKey(state.calendarMonth, -1)
    : '';
  const nextCalendarMonth = state.calendarMonth
    ? shiftMonthKey(state.calendarMonth, 1)
    : '';
  const canGoToPreviousMonth = isMonthWithinActivityRange(
    previousCalendarMonth
  );
  const canGoToNextMonth = isMonthWithinActivityRange(nextCalendarMonth);

  const changeMonthlyChartYear = useCallback(
    (year: string | null) => {
      if (!year) {
        return;
      }

      changeCalendarMonth(monthKeyForSelectedMonthInYear(year));
    },
    [changeCalendarMonth, monthKeyForSelectedMonthInYear]
  );

  const changeFilter = useCallback(
    (year: string) => {
      dispatch({
        type: 'changeYear',
        year,
        monthKey: monthKeyForSelectedMonthInYear(year),
        years,
        earliestMonth,
        latestMonth,
      });
    },
    [earliestMonth, latestMonth, monthKeyForSelectedMonthInYear, years]
  );

  const goToPreviousPage = useCallback(
    () => dispatch({ type: 'previousPage' }),
    []
  );
  const goToNextPage = useCallback(
    () => dispatch({ type: 'nextPage', pageCount }),
    [pageCount]
  );

  return {
    metrics: {
      allDistance,
      allSeconds,
      totalRunCount: sortedActivities.length,
      yearDistance,
      previousYearDistance,
      monthDistance,
      previousMonthDistance,
      currentYearRuns,
      currentMonthRuns,
      totalTouchRevealResetSignal,
      clearEventTouchReveal,
    },
    eventSummary: {
      marathonRuns,
      latestLongRun: latestLongRun ?? null,
      isEventTouchRevealActive,
      eventTouchRevealHandlers,
    },
    map: {
      viewState,
      selectedGeoData,
      setMapViewState,
      handleMapReady,
    },
    log: {
      years,
      yearFilter: state.yearFilter,
      displayedActivities,
      pagedRuns,
      page: state.page,
      pageCount,
      selectedRun: state.selectedRun,
    },
    calendar: {
      calendarMonth: state.calendarMonth,
      calendar,
      previousCalendarMonth,
      nextCalendarMonth,
      canGoToPreviousMonth,
      canGoToNextMonth,
      selectedRun: state.selectedRun,
      previewedCalendarKey,
      calendarSlideClass,
      previewCalendarCell,
      clearCalendarPreview,
      previewCalendarCellAtPoint,
    },
    monthlyChart: {
      monthlyChartYear,
      monthlyBars,
      activeMonthlyBarKey,
      olderMonthlyChartYear,
      newerMonthlyChartYear,
      monthlyChartSlideClass,
      setHoveredMonthKey,
      previewMonthlyBar,
      clearMonthlyBarPreview,
      previewMonthlyBarAtPoint,
    },
    actions: {
      changeFilter,
      toggleRunSelection,
      goToPreviousPage,
      goToNextPage,
      changeCalendarMonth,
      changeMonthlyChartYear,
    },
  };
};

export { useHomeDashboard };
