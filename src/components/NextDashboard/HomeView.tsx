import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import RunMap from '@/components/RunMap';
import type { ActivityGroups } from '@/hooks/useActivities';
import type { Activity, IViewState } from '@/utils/utils';
import {
  DIST_UNIT,
  M_TO_DIST,
  convertMovingTime2Sec,
  formatPace,
} from '@/utils/utils';
import {
  EMPTY_ACTIVITIES,
  ROWS_PER_PAGE,
  YEAR_GOAL,
  MONTH_GOAL,
  ROW_FADE_BASE_DELAY_MS,
  ROW_FADE_STAGGER_MS,
  MAP_PANEL_HEIGHT,
  WEEKDAY_LABELS,
  monthKeyFor,
  monthOrderFor,
  shiftMonthKey,
  isMonthWithinRange,
  clampMonthKey,
  getMondayFirstDayIndex,
  formatDuration,
  formatDurationShort,
  totalDistance,
  totalSeconds,
  formatMonthlyBarDistance,
  activityTitleForRun,
  isMarathonEventRun,
  emphasizePrimaryRuns,
  getBoundsForRuns,
  getIntroViewState,
  viewStatesNearlyEqual,
} from './shared';
import {
  useTouchRevealAction,
  useTouchPreview,
} from './hooks';
import {
  MetricCard,
  RouteSpark,
  ChevronIcon,
} from './ui';
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
  const {
    isTouchRevealActive: isEventTouchRevealActive,
    touchRevealHandlers: eventTouchRevealHandlers,
  } = useTouchRevealAction(openEvents);
  const [yearFilter, setYearFilter] = useState(thisYear || 'All');
  const [page, setPage] = useState(0);
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

  const isMonthWithinActivityRange = useCallback(
    (monthKey: string) => isMonthWithinRange(monthKey, earliestMonth, latestMonth),
    [earliestMonth, latestMonth]
  );

  const clampMonthToActivityRange = useCallback(
    (monthKey: string) => clampMonthKey(monthKey, earliestMonth, latestMonth),
    [earliestMonth, latestMonth]
  );

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
  const selectedGeoData = useMemo(
    () => emphasizePrimaryRuns(mapRuns, selectedRun),
    [mapRuns, selectedRun]
  );
  const [mapReady, setMapReady] = useState(false);
  const [viewState, setViewState] = useState<IViewState>(() =>
    getIntroViewState(getBoundsForRuns(mapRuns))
  );
  const viewStateRef = useRef<IViewState>(viewState);
  const hasPlayedInitialMapFocusRef = useRef(false);

  const setMapViewState = useCallback((nextViewState: IViewState) => {
    viewStateRef.current = nextViewState;
    setViewState(nextViewState);
  }, []);

  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!hasPlayedInitialMapFocusRef.current && !mapReady) {
      return;
    }

    const targetViewState = getBoundsForRuns(mapRuns);
    const startViewState = viewStateRef.current;

    if (viewStatesNearlyEqual(startViewState, targetViewState)) {
      hasPlayedInitialMapFocusRef.current = true;
      setMapViewState(targetViewState);
      return;
    }

    hasPlayedInitialMapFocusRef.current = true;
    setMapViewState(targetViewState);
  }, [mapReady, mapRuns, setMapViewState]);

  const pagedRuns = useMemo(() => {
    const start = page * ROWS_PER_PAGE;
    return displayedActivities.slice(start, start + ROWS_PER_PAGE);
  }, [displayedActivities, page]);
  const pageCount = Math.max(
    1,
    Math.ceil(displayedActivities.length / ROWS_PER_PAGE)
  );

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
        cells: [] as Array<{
          day: number | null;
          runs: Activity[];
          distance: number;
        }>,
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

    const cells = Array.from({ length: firstDay }, () => ({
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

  const monthlyBars = useMemo(() => {
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

  const goToPreviousPage = () => setPage((current) => Math.max(0, current - 1));
  const goToNextPage = () =>
    setPage((current) => Math.min(pageCount - 1, current + 1));

  const renderMetricCards = () => (
    <>
      <MetricCard
        label="Total Distance"
        value={allDistance.toFixed(2)}
        unit={` ${DIST_UNIT}`}
        detailIcons={['bolt', 'clock']}
        details={[`${sortedActivities.length} runs`, formatDurationShort(allSeconds)]}
        stackDetails
        overlay="点击打开热力图"
        onClick={openHeatmap}
        className={styles.totalMetricCard}
      />
      <MetricCard
        label="Yearly Goal"
        value={yearDistance.toFixed(2)}
        unit={` / ${YEAR_GOAL} ${DIST_UNIT}`}
        detailIcons={['bolt', 'clock']}
        details={[
          `${currentYearRuns.length} runs`,
          formatDurationShort(totalSeconds(currentYearRuns)),
        ]}
        progress={(yearDistance / YEAR_GOAL) * 100}
        trend={{
          text: `${Math.abs(yearDistance - previousYearDistance).toFixed(
            2
          )} ${DIST_UNIT} vs last year`,
          positive: yearDistance >= previousYearDistance,
        }}
      />
      <MetricCard
        label="Monthly Goal"
        value={monthDistance.toFixed(2)}
        unit={` / ${MONTH_GOAL} ${DIST_UNIT}`}
        detailIcons={['bolt', 'clock']}
        details={[
          `${currentMonthRuns.length} runs`,
          formatDurationShort(totalSeconds(currentMonthRuns)),
        ]}
        progress={(monthDistance / MONTH_GOAL) * 100}
        trend={{
          text: `${Math.abs(monthDistance - previousMonthDistance).toFixed(
            2
          )} ${DIST_UNIT} vs last month`,
          positive: monthDistance >= previousMonthDistance,
        }}
      />
    </>
  );

  const renderEventSummary = (id?: string) => (
    <button
      type="button"
      id={id}
      className={`${styles.panel} ${styles.eventPanel} ${
        isEventTouchRevealActive ? styles.cardTouchRevealActive : ''
      }`}
      {...eventTouchRevealHandlers}
    >
      <span className={styles.eventCount}>{marathonRuns.length}</span>
      <span className={styles.eventTitle}>
        <strong>Marathon Events</strong>
        <span>in {thisYear}</span>
      </span>
      <span className={styles.latestFinish}>
        <span>Latest Finish</span>
        <strong>{latestLongRun ? activityTitleForRun(latestLongRun) : '-'}</strong>
        <small>
          {latestLongRun
            ? latestLongRun.start_date_local.slice(0, 10).replaceAll('-', '/')
            : '-'}
        </small>
      </span>
      <span className={styles.cardOverlay}>点击打开赛事记录</span>
    </button>
  );

  const renderMapPanel = (
    className: string,
    height: number | string,
    id?: string
  ) => (
    <section id={id} className={className}>
      <RunMap
        viewState={viewState}
        geoData={selectedGeoData}
        setViewState={setMapViewState}
        height={height}
        onReady={handleMapReady}
      />
    </section>
  );

  const renderCalendarCell = (
    cell: (typeof calendar.cells)[number],
    index: number
  ) => {
    const isSelectedCell = Boolean(
      selectedRun && cell.runs.some((run) => run.run_id === selectedRun.run_id)
    );
    const calendarRun = isSelectedCell ? selectedRun : cell.runs[0] ?? null;
    const cellKey = cell.day ? `${calendarMonth}-${cell.day}` : '';
    const canSelectCell = Boolean(calendarRun);

    return (
      <button
        type="button"
        key={`${cell.day ?? 'empty'}-${index}`}
        className={`${cell.runs.length ? styles.calendarActive : ''} ${
          isSelectedCell ? styles.calendarSelected : ''
        } ${
          cellKey && previewedCalendarKey === cellKey
            ? styles.calendarPreviewed
            : ''
        }`}
        data-calendar-key={canSelectCell ? cellKey : undefined}
        disabled={!canSelectCell}
        aria-pressed={cell.day ? isSelectedCell : undefined}
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse' && canSelectCell) {
            previewCalendarCell(cellKey);
          }
        }}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'mouse' && canSelectCell) {
            previewCalendarCell(cellKey);
          }
        }}
        onClick={() => {
          clearCalendarPreview();
          if (calendarRun) {
            toggleRunSelection(calendarRun);
          }
        }}
      >
        {calendarRun ? <RouteSpark run={calendarRun} /> : <span />}
        {cell.runs.length ? (
          <span className={styles.calendarHoverMeta}>
            <strong>{cell.day}日</strong>
            <span>{cell.distance.toFixed(cell.distance >= 10 ? 0 : 1)} km</span>
          </span>
        ) : (
          <small>{cell.day}</small>
        )}
      </button>
    );
  };

  const renderCalendarPanel = () => (
    <section className={`${styles.panel} ${styles.calendarPanel}`}>
      <div className={styles.calendarHeader}>
        <div>
          <strong>{calendarMonth.replace('-', '/')}</strong>
          <span>
            {calendar.monthlyDistance.toFixed(0)} {DIST_UNIT}
          </span>
        </div>
        <div className={styles.calendarControls}>
          <button
            type="button"
            onClick={() => changeCalendarMonth(previousCalendarMonth)}
            disabled={!canGoToPreviousMonth}
            aria-label="Previous month"
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={() => changeCalendarMonth(nextCalendarMonth)}
            disabled={!canGoToNextMonth}
            aria-label="Next month"
          >
            <ChevronIcon direction="right" />
          </button>
        </div>
      </div>
      <div className={styles.weekdays}>
        {WEEKDAY_LABELS.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div
        key={`calendar-${calendarMonth}`}
        className={`${styles.calendarGrid} ${calendarSlideClass}`}
        onPointerMove={previewCalendarCellAtPoint}
      >
        {calendar.cells.map(renderCalendarCell)}
      </div>
    </section>
  );

  const renderMonthlyBar = (bar: (typeof monthlyBars)[number]) => {
    const isActive = bar.monthKey === activeMonthlyBarKey && bar.inRange;

    return (
      <button
        type="button"
        key={bar.month}
        className={`${styles.barItem} ${
          isActive ? styles.barItemActive : ''
        } ${!bar.inRange ? styles.barItemDisabled : ''}`}
        data-month-key={bar.monthKey}
        disabled={!bar.inRange}
        title={`${bar.month} ${bar.distanceLabel} ${DIST_UNIT}`}
        onPointerEnter={(event) => {
          if (!bar.inRange) {
            return;
          }

          if (event.pointerType === 'mouse') {
            setHoveredMonthKey(bar.monthKey);
            return;
          }

          previewMonthlyBar(bar.monthKey);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') {
            setHoveredMonthKey(null);
          }
        }}
        onFocus={(event) => {
          if (bar.inRange && event.currentTarget.matches(':focus-visible')) {
            setHoveredMonthKey(bar.monthKey);
          }
        }}
        onBlur={() => setHoveredMonthKey(null)}
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse' && bar.inRange) {
            previewMonthlyBar(bar.monthKey);
          }
        }}
        onClick={() => {
          if (!bar.inRange) {
            return;
          }

          clearMonthlyBarPreview();
          changeCalendarMonth(bar.monthKey);
        }}
      >
        <span className={styles.barColumn}>
          <span className={styles.barValue}>
            {bar.distanceLabel}
            <em>{DIST_UNIT}</em>
          </span>
          <span className={styles.barFill} style={{ height: bar.height }} />
        </span>
        <small>{bar.month}</small>
      </button>
    );
  };

  const renderMonthlyChart = () => (
    <section className={`${styles.panel} ${styles.chartPanel}`}>
      <div className={styles.chartHeader}>
        <strong>Monthly Distance</strong>
        <div className={styles.chartYearControls}>
          <button
            type="button"
            onClick={() => changeMonthlyChartYear(olderMonthlyChartYear)}
            disabled={!olderMonthlyChartYear}
            aria-label="Previous year"
          >
            <ChevronIcon direction="left" />
          </button>
          <span>{monthlyChartYear}</span>
          <button
            type="button"
            onClick={() => changeMonthlyChartYear(newerMonthlyChartYear)}
            disabled={!newerMonthlyChartYear}
            aria-label="Next year"
          >
            <ChevronIcon direction="right" />
          </button>
        </div>
      </div>
      <div
        key={`monthly-chart-${monthlyChartYear}`}
        className={`${styles.barChart} ${monthlyChartSlideClass}`}
        onPointerMove={previewMonthlyBarAtPoint}
      >
        {monthlyBars.map(renderMonthlyBar)}
      </div>
    </section>
  );

  const renderYearFilters = () => (
    <div className={styles.filterRow}>
      {[...years, 'All'].map((year) => (
        <button
          key={year}
          type="button"
          className={yearFilter === year ? styles.filterActive : ''}
          onClick={() => changeFilter(year)}
        >
          {year}
        </button>
      ))}
    </div>
  );

  const renderActivityRow = (
    run: Activity,
    index: number,
    animationBaseDelay = 0
  ) => {
    const selected = selectedRun?.run_id === run.run_id;
    const [activityDate, activityTime = ''] = run.start_date_local.split(' ');
    const activityDisplayTime = activityTime.slice(0, 5);

    return (
      <tr
        key={run.run_id}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        className={`${styles.activityRow} ${selected ? styles.selectedRow : ''}`}
        style={{
          animationDelay: `${animationBaseDelay + index * ROW_FADE_STAGGER_MS}ms`,
        }}
        onClick={() => toggleRunSelection(run)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') {
            return;
          }

          event.preventDefault();
          toggleRunSelection(run);
        }}
      >
        <td className={styles.activityDateCell}>
          <span>{activityDate}</span>
          {activityDisplayTime && <small>{activityDisplayTime}</small>}
        </td>
        <td>{activityTitleForRun(run)}</td>
        <td>
          {(run.distance / M_TO_DIST).toFixed(2)}
          <span>{DIST_UNIT}</span>
        </td>
        <td>{formatDuration(convertMovingTime2Sec(run.moving_time))}</td>
        <td>{formatPace(run.average_speed)}</td>
        <td>{run.average_heartrate ? Math.round(run.average_heartrate) : '-'}</td>
      </tr>
    );
  };

  const renderActivityTable = (
    runs: Activity[],
    tbodyKey: string,
    animationBaseDelay = 0,
    extraWrapClass = ''
  ) => (
    <div
      className={
        extraWrapClass
          ? `${styles.tableWrap} ${extraWrapClass}`
          : styles.tableWrap
      }
    >
      <table className={styles.activityTable}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Distance</th>
            <th>Duration</th>
            <th>Pace</th>
            <th>HR</th>
          </tr>
        </thead>
        <tbody key={tbodyKey}>
          {runs.map((run, index) =>
            renderActivityRow(run, index, animationBaseDelay)
          )}
        </tbody>
      </table>
    </div>
  );

  const renderPagination = (
    currentPage: number,
    currentPageCount: number,
    onPrevious: () => void,
    onNext: () => void
  ) => (
    <div className={styles.pagination}>
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentPage === 0}
        aria-label="Previous page"
      >
        <ChevronIcon direction="left" />
      </button>
      <span>
        Page {currentPage + 1} of {currentPageCount}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage >= currentPageCount - 1}
        aria-label="Next page"
      >
        <ChevronIcon direction="right" />
      </button>
    </div>
  );

  return (
    <main className={styles.main}>
      <section className={styles.dashboardGrid}>
        <div className={styles.leftColumn}>
          <div className={styles.metricsGrid}>
            {renderMetricCards()}
          </div>

          <section id="activity-log" className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Activity Log</h2>
              <span>
                Showing{' '}
                {displayedActivities.length ? page * ROWS_PER_PAGE + 1 : 0}-
                {Math.min(
                  (page + 1) * ROWS_PER_PAGE,
                  displayedActivities.length
                )}{' '}
                of {displayedActivities.length}
              </span>
            </div>
            {renderYearFilters()}
            {renderActivityTable(
              pagedRuns,
              `${yearFilter}-${page}`,
              ROW_FADE_BASE_DELAY_MS
            )}
            {renderPagination(page, pageCount, goToPreviousPage, goToNextPage)}
          </section>
        </div>

        <aside className={styles.rightColumn}>
          {renderEventSummary('events')}
          {renderMapPanel(
            `${styles.panel} ${styles.mapPanel}`,
            MAP_PANEL_HEIGHT,
            'map-panel'
          )}
          {renderCalendarPanel()}
          {renderMonthlyChart()}
        </aside>
      </section>
    </main>
  );
};


export default HomeView;
