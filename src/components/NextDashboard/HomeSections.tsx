import type {
  ButtonHTMLAttributes,
  PointerEvent as ReactPointerEvent,
} from 'react';
import RunMap from '@/components/RunMap/LazyRunMap';
import type { Activity, IViewState } from '@/entities/activity/model/types';
import {
  DIST_UNIT,
  M_TO_DIST,
  convertMovingTime2Sec,
  formatPace,
} from '@/entities/activity/lib/format';
import type { FeatureCollection } from '@/types/geojson';
import type { RPGeometry } from '@/static/run_countries';
import {
  MAP_PANEL_HEIGHT,
  MONTH_GOAL,
  ROWS_PER_PAGE,
  ROW_FADE_BASE_DELAY_MS,
  ROW_FADE_STAGGER_MS,
  WEEKDAY_LABELS,
  YEAR_GOAL,
  activityTitleForRun,
  formatDuration,
  formatDurationShort,
  totalSeconds,
} from './shared';
import { MetricCard, RouteSpark, ChevronIcon } from './ui';
import styles from './style.module.css';

export interface CalendarCell {
  day: number | null;
  runs: Activity[];
  distance: number;
}

export interface MonthlyBar {
  month: string;
  monthKey: string;
  distanceLabel: string;
  height: string;
  inRange: boolean;
}

type TouchRevealHandlers = ButtonHTMLAttributes<HTMLButtonElement>;

const HomeMetricCards = ({
  allDistance,
  allSeconds,
  totalRunCount,
  yearDistance,
  previousYearDistance,
  monthDistance,
  previousMonthDistance,
  currentYearRuns,
  currentMonthRuns,
  openHeatmap,
  clearEventTouchReveal,
  totalTouchRevealResetSignal,
}: {
  allDistance: number;
  allSeconds: number;
  totalRunCount: number;
  yearDistance: number;
  previousYearDistance: number;
  monthDistance: number;
  previousMonthDistance: number;
  currentYearRuns: Activity[];
  currentMonthRuns: Activity[];
  openHeatmap: () => void;
  clearEventTouchReveal: () => void;
  totalTouchRevealResetSignal: number;
}) => (
  <>
    <MetricCard
      label="Total Distance"
      value={allDistance.toFixed(2)}
      unit={` ${DIST_UNIT}`}
      detailIcons={['bolt', 'clock']}
      details={[`${totalRunCount} runs`, formatDurationShort(allSeconds)]}
      stackDetails
      overlay="点击打开热力图"
      onClick={openHeatmap}
      onTouchRevealStart={clearEventTouchReveal}
      touchRevealResetSignal={totalTouchRevealResetSignal}
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

const HomeEventSummary = ({
  id,
  eventCount,
  latestLongRun,
  thisYear,
  isTouchRevealActive,
  touchRevealHandlers,
}: {
  id?: string;
  eventCount: number;
  latestLongRun: Activity | null;
  thisYear: string;
  isTouchRevealActive: boolean;
  touchRevealHandlers: TouchRevealHandlers;
}) => (
  <button
    type="button"
    id={id}
    className={`${styles.panel} ${styles.eventPanel} ${
      isTouchRevealActive ? styles.cardTouchRevealActive : ''
    }`}
    {...touchRevealHandlers}
  >
    <span className={styles.eventCount}>{eventCount}</span>
    <span className={styles.eventTitle}>
      <strong>Marathon Events</strong>
      <span>in {thisYear}</span>
    </span>
    <span className={styles.latestFinish}>
      <span>Latest Finish</span>
      <strong>
        {latestLongRun ? activityTitleForRun(latestLongRun) : '-'}
      </strong>
      <small>
        {latestLongRun
          ? latestLongRun.start_date_local.slice(0, 10).replaceAll('-', '/')
          : '-'}
      </small>
    </span>
    <span className={styles.cardOverlay}>点击打开赛事记录</span>
  </button>
);

const HomeMapPanel = ({
  id,
  viewState,
  geoData,
  countries,
  provinces,
  setViewState,
  onReady,
}: {
  id?: string;
  viewState: IViewState;
  geoData: FeatureCollection<RPGeometry>;
  countries: string[];
  provinces: string[];
  setViewState: (viewState: IViewState) => void;
  onReady: () => void;
}) => (
  <section id={id} className={`${styles.panel} ${styles.mapPanel}`}>
    <RunMap
      viewState={viewState}
      geoData={geoData}
      countries={countries}
      provinces={provinces}
      setViewState={setViewState}
      height={MAP_PANEL_HEIGHT}
      onReady={onReady}
    />
  </section>
);

const ActivityLog = ({
  years,
  yearFilter,
  displayedActivities,
  pagedRuns,
  page,
  pageCount,
  selectedRun,
  changeFilter,
  toggleRunSelection,
  goToPreviousPage,
  goToNextPage,
}: {
  years: string[];
  yearFilter: string;
  displayedActivities: Activity[];
  pagedRuns: Activity[];
  page: number;
  pageCount: number;
  selectedRun: Activity | null;
  changeFilter: (year: string) => void;
  toggleRunSelection: (run: Activity) => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
}) => (
  <section id="activity-log" className={styles.panel}>
    <div className={styles.panelHeader}>
      <h2>Activity Log</h2>
      <span>
        Showing {displayedActivities.length ? page * ROWS_PER_PAGE + 1 : 0}-
        {Math.min((page + 1) * ROWS_PER_PAGE, displayedActivities.length)} of{' '}
        {displayedActivities.length}
      </span>
    </div>
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
    <div className={styles.tableWrap}>
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
        <tbody key={`${yearFilter}-${page}`}>
          {pagedRuns.map((run, index) => {
            const selected = selectedRun?.run_id === run.run_id;
            const [activityDate, activityTime = ''] =
              run.start_date_local.split(' ');
            const activityDisplayTime = activityTime.slice(0, 5);

            return (
              <tr
                key={run.run_id}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                className={`${styles.activityRow} ${
                  selected ? styles.selectedRow : ''
                }`}
                style={{
                  animationDelay: `${
                    ROW_FADE_BASE_DELAY_MS + index * ROW_FADE_STAGGER_MS
                  }ms`,
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
                <td>
                  {formatDuration(convertMovingTime2Sec(run.moving_time))}
                </td>
                <td>{formatPace(run.average_speed)}</td>
                <td>
                  {run.average_heartrate
                    ? Math.round(run.average_heartrate)
                    : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <div className={styles.pagination}>
      <button
        type="button"
        onClick={goToPreviousPage}
        disabled={page === 0}
        aria-label="Previous page"
      >
        <ChevronIcon direction="left" />
      </button>
      <span>
        Page {page + 1} of {pageCount}
      </span>
      <button
        type="button"
        onClick={goToNextPage}
        disabled={page >= pageCount - 1}
        aria-label="Next page"
      >
        <ChevronIcon direction="right" />
      </button>
    </div>
  </section>
);

const CalendarPanel = ({
  calendarMonth,
  calendar,
  previousCalendarMonth,
  nextCalendarMonth,
  canGoToPreviousMonth,
  canGoToNextMonth,
  selectedRun,
  previewedCalendarKey,
  calendarSlideClass,
  changeCalendarMonth,
  toggleRunSelection,
  previewCalendarCell,
  clearCalendarPreview,
  previewCalendarCellAtPoint,
}: {
  calendarMonth: string;
  calendar: { cells: CalendarCell[]; monthlyDistance: number };
  previousCalendarMonth: string;
  nextCalendarMonth: string;
  canGoToPreviousMonth: boolean;
  canGoToNextMonth: boolean;
  selectedRun: Activity | null;
  previewedCalendarKey: string | null;
  calendarSlideClass: string;
  changeCalendarMonth: (monthKey: string) => void;
  toggleRunSelection: (run: Activity) => void;
  previewCalendarCell: (key: string | undefined) => void;
  clearCalendarPreview: () => void;
  previewCalendarCellAtPoint: (
    event: ReactPointerEvent<HTMLDivElement>
  ) => void;
}) => (
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
      {calendar.cells.map((cell, index) => {
        const isSelectedCell = Boolean(
          selectedRun &&
          cell.runs.some((run) => run.run_id === selectedRun.run_id)
        );
        const calendarRun = isSelectedCell
          ? selectedRun
          : (cell.runs[0] ?? null);
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
                <span>
                  {cell.distance.toFixed(cell.distance >= 10 ? 0 : 1)}{' '}
                  {DIST_UNIT}
                </span>
              </span>
            ) : (
              <small>{cell.day}</small>
            )}
          </button>
        );
      })}
    </div>
  </section>
);

const MonthlyChart = ({
  monthlyChartYear,
  monthlyBars,
  activeMonthlyBarKey,
  olderMonthlyChartYear,
  newerMonthlyChartYear,
  monthlyChartSlideClass,
  changeMonthlyChartYear,
  changeCalendarMonth,
  setHoveredMonthKey,
  previewMonthlyBar,
  clearMonthlyBarPreview,
  previewMonthlyBarAtPoint,
}: {
  monthlyChartYear: string;
  monthlyBars: MonthlyBar[];
  activeMonthlyBarKey: string;
  olderMonthlyChartYear: string | null;
  newerMonthlyChartYear: string | null;
  monthlyChartSlideClass: string;
  changeMonthlyChartYear: (year: string | null) => void;
  changeCalendarMonth: (monthKey: string) => void;
  setHoveredMonthKey: (monthKey: string | null) => void;
  previewMonthlyBar: (monthKey: string | undefined) => void;
  clearMonthlyBarPreview: () => void;
  previewMonthlyBarAtPoint: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) => (
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
      {monthlyBars.map((bar) => {
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
              if (
                bar.inRange &&
                event.currentTarget.matches(':focus-visible')
              ) {
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
      })}
    </div>
  </section>
);

export {
  HomeMetricCards,
  HomeEventSummary,
  HomeMapPanel,
  ActivityLog,
  CalendarPanel,
  MonthlyChart,
};
