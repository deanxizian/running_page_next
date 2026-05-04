import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { ActivityGroups } from '@/hooks/useActivities';
import type { Activity } from '@/utils/utils';
import {
  EMPTY_ACTIVITIES,
  ROWS_PER_PAGE,
  monthKeyFor,
  monthOrderFor,
  shiftMonthKey,
  getMondayFirstDayIndex,
  totalDistance,
  totalSeconds,
  formatMonthlyBarDistance,
  isMarathonEventRun,
} from './shared';
import {
  useTouchRevealAction,
  useTouchPreview,
} from './hooks';
import {
  useActivityPagination,
  useCalendarRange,
  useRunMapFocus,
} from './homeHooks';
import {
  ActivityLog,
  CalendarPanel,
  HomeEventSummary,
  HomeMapPanel,
  HomeMetricCards,
  MonthlyChart,
} from './HomeSections';
import type { CalendarCell, MonthlyBar } from './HomeSections';
import styles from './style.module.css';

const HomeView = ({
  years,
  thisYear,
  sortedActivities,
  activityGroups,
  latestRun,
  latestMonth,
  earliestMonth,
}: {
  years: string[];
  thisYear: string;
  sortedActivities: Activity[];
  activityGroups: ActivityGroups;
  latestRun: Activity | null;
  latestMonth: string;
  earliestMonth: string;
}) => {
  const navigate = useNavigate();
  const openHeatmap = useCallback(() => navigate('/heatmap'), [navigate]);
  const openEvents = useCallback(() => navigate('/events'), [navigate]);
  const [totalTouchRevealResetSignal, setTotalTouchRevealResetSignal] =
    useState(0);
  const [eventTouchRevealResetSignal, setEventTouchRevealResetSignal] =
    useState(0);
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
  const [yearFilter, setYearFilter] = useState(thisYear || 'All');
  const [selectedRun, setSelectedRun] = useState<Activity | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(latestMonth);
  const [hoveredMonthKey, setHoveredMonthKey] = useState<string | null>(null);
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
  const [calendarSlideDirection, setCalendarSlideDirection] = useState<
    'idle' | 'forward' | 'backward'
  >('idle');
  const [monthlyChartSlideDirection, setMonthlyChartSlideDirection] = useState<
    'idle' | 'forward' | 'backward'
  >('idle');

  useEffect(() => {
    if (!calendarMonth && latestMonth) {
      setCalendarMonth(latestMonth);
    }
  }, [calendarMonth, latestMonth]);

  const { isMonthWithinActivityRange, clampMonthToActivityRange } =
    useCalendarRange(earliestMonth, latestMonth);

  useEffect(() => {
    if (!calendarMonth || isMonthWithinActivityRange(calendarMonth)) {
      return;
    }

    setCalendarMonth(clampMonthToActivityRange(calendarMonth));
    setSelectedRun(null);
  }, [calendarMonth, clampMonthToActivityRange, isMonthWithinActivityRange]);

  const previewCalendarCellAtPoint = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') {
        return;
      }

      const element = document.elementFromPoint(
        event.clientX,
        event.clientY
      );
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

      const element = document.elementFromPoint(
        event.clientX,
        event.clientY
      );
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
    () => getActivitiesForFilter(yearFilter),
    [getActivitiesForFilter, yearFilter]
  );
  const {
    page,
    setPage,
    pagedRuns,
    pageCount,
    goToPreviousPage,
    goToNextPage,
  } = useActivityPagination(displayedActivities);

  const syncLogPageForRun = useCallback(
    (run: Activity, filter: string) => {
      const runIndex = getActivitiesForFilter(filter).findIndex(
        (activity) => activity.run_id === run.run_id
      );

      if (runIndex === -1) {
        return;
      }

      setPage(Math.floor(runIndex / ROWS_PER_PAGE));
    },
    [getActivitiesForFilter]
  );

  const changeCalendarMonth = useCallback(
    (monthKey: string) => {
      if (!monthKey) {
        setSelectedRun(null);
        return;
      }

      if (!isMonthWithinActivityRange(monthKey)) {
        return;
      }

      const monthYear = monthKey.slice(0, 4);
      if (years.includes(monthYear) && yearFilter !== monthYear) {
        setYearFilter(monthYear);
        setPage(0);
      }

      if (monthKey === calendarMonth) {
        setSelectedRun(null);
        return;
      }

      const nextSlideDirection =
        calendarMonth && monthOrderFor(monthKey) < monthOrderFor(calendarMonth)
          ? 'backward'
          : 'forward';

      setCalendarSlideDirection(nextSlideDirection);
      setMonthlyChartSlideDirection(
        calendarMonth.slice(0, 4) !== monthYear ? nextSlideDirection : 'idle'
      );
      setCalendarMonth(monthKey);
      setSelectedRun(null);
    },
    [calendarMonth, isMonthWithinActivityRange, yearFilter, years]
  );

  const selectRun = useCallback(
    (run: Activity | null) => {
      if (!run) {
        setSelectedRun(null);
        return;
      }

      const runYear = run.start_date_local.slice(0, 4);
      const runMonth = monthKeyFor(run.start_date_local);
      const nextYearFilter =
        yearFilter === 'All' || yearFilter === runYear ? yearFilter : runYear;

      if (nextYearFilter !== yearFilter) {
        setYearFilter(nextYearFilter);
      }
      if (runMonth !== calendarMonth) {
        changeCalendarMonth(runMonth);
      }

      syncLogPageForRun(run, nextYearFilter);
      setSelectedRun(run);
    },
    [calendarMonth, changeCalendarMonth, syncLogPageForRun, yearFilter]
  );

  const toggleRunSelection = useCallback(
    (run: Activity) => {
      selectRun(selectedRun?.run_id === run.run_id ? null : run);
    },
    [selectRun, selectedRun]
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
    () => (selectedRun ? [selectedRun] : displayedActivities),
    [displayedActivities, selectedRun]
  );
  const { selectedGeoData, viewState, setMapViewState, handleMapReady } =
    useRunMapFocus(mapRuns, selectedRun);

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
    if (!calendarMonth) {
      return {
        cells: [] as CalendarCell[],
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
  }, [activityGroups, calendarMonth]);

  const monthlyChartYear = (
    calendarMonth ||
    latestMonth ||
    `${thisYear}-01`
  ).slice(0, 4);

  const monthlyBars = useMemo<MonthlyBar[]>(() => {
    const year = Number(monthlyChartYear);
    const totals = Array.from({ length: 12 }, (_, index) => {
      const month = `${year}-${String(index + 1).padStart(2, '0')}`;
      return totalDistance(activityGroups.byMonth.get(month) ?? EMPTY_ACTIVITIES);
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
    calendarMonth ??
    latestMonth;
  const calendarSlideClass =
    calendarSlideDirection === 'backward'
      ? styles.calendarSlideBackward
      : calendarSlideDirection === 'forward'
        ? styles.calendarSlideForward
        : '';
  const monthlyChartSlideClass =
    monthlyChartSlideDirection === 'backward'
      ? styles.calendarSlideBackward
      : monthlyChartSlideDirection === 'forward'
        ? styles.calendarSlideForward
        : '';

  const monthKeyForSelectedMonthInYear = useCallback(
    (year: string) => {
      const selectedMonth = (
        calendarMonth ||
        latestMonth ||
        `${thisYear}-01`
      ).slice(5, 7);
      return clampMonthToActivityRange(`${year}-${selectedMonth}`);
    },
    [calendarMonth, clampMonthToActivityRange, latestMonth, thisYear]
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
  const previousCalendarMonth = calendarMonth
    ? shiftMonthKey(calendarMonth, -1)
    : '';
  const nextCalendarMonth = calendarMonth
    ? shiftMonthKey(calendarMonth, 1)
    : '';
  const canGoToPreviousMonth = isMonthWithinActivityRange(previousCalendarMonth);
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
      setYearFilter(year);
      setPage(0);
      setSelectedRun(null);

      if (year === 'All' || calendarMonth.slice(0, 4) === year) {
        return;
      }

      changeCalendarMonth(monthKeyForSelectedMonthInYear(year));
    },
    [calendarMonth, changeCalendarMonth, monthKeyForSelectedMonthInYear]
  );

  return (
    <main className={styles.main}>
      <section className={styles.dashboardGrid}>
        <div className={styles.leftColumn}>
          <div className={styles.metricsGrid}>
            <HomeMetricCards
              allDistance={allDistance}
              allSeconds={allSeconds}
              totalRunCount={sortedActivities.length}
              yearDistance={yearDistance}
              previousYearDistance={previousYearDistance}
              monthDistance={monthDistance}
              previousMonthDistance={previousMonthDistance}
              currentYearRuns={currentYearRuns}
              currentMonthRuns={currentMonthRuns}
              openHeatmap={openHeatmap}
              clearEventTouchReveal={clearEventTouchReveal}
              totalTouchRevealResetSignal={totalTouchRevealResetSignal}
            />
          </div>

          <ActivityLog
            years={years}
            yearFilter={yearFilter}
            displayedActivities={displayedActivities}
            pagedRuns={pagedRuns}
            page={page}
            pageCount={pageCount}
            selectedRun={selectedRun}
            changeFilter={changeFilter}
            toggleRunSelection={toggleRunSelection}
            goToPreviousPage={goToPreviousPage}
            goToNextPage={goToNextPage}
          />
        </div>

        <aside className={styles.rightColumn}>
          <HomeEventSummary
            id="events"
            eventCount={marathonRuns.length}
            latestLongRun={latestLongRun ?? null}
            thisYear={thisYear}
            isTouchRevealActive={isEventTouchRevealActive}
            touchRevealHandlers={eventTouchRevealHandlers}
          />
          <HomeMapPanel
            id="map-panel"
            viewState={viewState}
            geoData={selectedGeoData}
            setViewState={setMapViewState}
            onReady={handleMapReady}
          />
          <CalendarPanel
            calendarMonth={calendarMonth}
            calendar={calendar}
            previousCalendarMonth={previousCalendarMonth}
            nextCalendarMonth={nextCalendarMonth}
            canGoToPreviousMonth={canGoToPreviousMonth}
            canGoToNextMonth={canGoToNextMonth}
            selectedRun={selectedRun}
            previewedCalendarKey={previewedCalendarKey}
            calendarSlideClass={calendarSlideClass}
            changeCalendarMonth={changeCalendarMonth}
            toggleRunSelection={toggleRunSelection}
            previewCalendarCell={previewCalendarCell}
            clearCalendarPreview={clearCalendarPreview}
            previewCalendarCellAtPoint={previewCalendarCellAtPoint}
          />
          <MonthlyChart
            monthlyChartYear={monthlyChartYear}
            monthlyBars={monthlyBars}
            activeMonthlyBarKey={activeMonthlyBarKey}
            olderMonthlyChartYear={olderMonthlyChartYear}
            newerMonthlyChartYear={newerMonthlyChartYear}
            monthlyChartSlideClass={monthlyChartSlideClass}
            changeMonthlyChartYear={changeMonthlyChartYear}
            changeCalendarMonth={changeCalendarMonth}
            setHoveredMonthKey={setHoveredMonthKey}
            previewMonthlyBar={previewMonthlyBar}
            clearMonthlyBarPreview={clearMonthlyBarPreview}
            previewMonthlyBarAtPoint={previewMonthlyBarAtPoint}
          />
        </aside>
      </section>
    </main>
  );
};


export default HomeView;
