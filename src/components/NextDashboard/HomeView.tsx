import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ActivityGroups } from '@/entities/activity/lib/group';
import type { Activity } from '@/entities/activity/model/types';
import { useHomeDashboard } from '@/features/home/model/useHomeDashboard';
import {
  ActivityLog,
  CalendarPanel,
  HomeEventSummary,
  HomeMapPanel,
  HomeMetricCards,
  MonthlyChart,
} from './HomeSections';
import styles from './style.module.css';

const HomeView = ({
  years,
  thisYear,
  sortedActivities,
  activityGroups,
  latestRun,
  latestMonth,
  earliestMonth,
  countries,
  provinces,
}: {
  years: string[];
  thisYear: string;
  sortedActivities: Activity[];
  activityGroups: ActivityGroups;
  latestRun: Activity | null;
  latestMonth: string;
  earliestMonth: string;
  countries: string[];
  provinces: string[];
}) => {
  const navigate = useNavigate();
  const openHeatmap = useCallback(() => navigate('/heatmap'), [navigate]);
  const openEvents = useCallback(() => navigate('/events'), [navigate]);
  const dashboard = useHomeDashboard({
    years,
    thisYear,
    sortedActivities,
    activityGroups,
    latestRun,
    latestMonth,
    earliestMonth,
    openEvents,
  });

  return (
    <main className={styles.main}>
      <section className={styles.dashboardGrid}>
        <div className={styles.leftColumn}>
          <div className={styles.metricsGrid}>
            <HomeMetricCards
              allDistance={dashboard.metrics.allDistance}
              allSeconds={dashboard.metrics.allSeconds}
              totalRunCount={dashboard.metrics.totalRunCount}
              yearDistance={dashboard.metrics.yearDistance}
              previousYearDistance={dashboard.metrics.previousYearDistance}
              monthDistance={dashboard.metrics.monthDistance}
              previousMonthDistance={dashboard.metrics.previousMonthDistance}
              currentYearRuns={dashboard.metrics.currentYearRuns}
              currentMonthRuns={dashboard.metrics.currentMonthRuns}
              openHeatmap={openHeatmap}
              clearEventTouchReveal={dashboard.metrics.clearEventTouchReveal}
              totalTouchRevealResetSignal={
                dashboard.metrics.totalTouchRevealResetSignal
              }
            />
          </div>

          <ActivityLog
            years={dashboard.log.years}
            yearFilter={dashboard.log.yearFilter}
            displayedActivities={dashboard.log.displayedActivities}
            pagedRuns={dashboard.log.pagedRuns}
            page={dashboard.log.page}
            pageCount={dashboard.log.pageCount}
            selectedRun={dashboard.log.selectedRun}
            changeFilter={dashboard.actions.changeFilter}
            toggleRunSelection={dashboard.actions.toggleRunSelection}
            goToPreviousPage={dashboard.actions.goToPreviousPage}
            goToNextPage={dashboard.actions.goToNextPage}
          />
        </div>

        <aside className={styles.rightColumn}>
          <HomeEventSummary
            id="events"
            eventCount={dashboard.eventSummary.marathonRuns.length}
            latestLongRun={dashboard.eventSummary.latestLongRun}
            thisYear={thisYear}
            isTouchRevealActive={
              dashboard.eventSummary.isEventTouchRevealActive
            }
            touchRevealHandlers={
              dashboard.eventSummary.eventTouchRevealHandlers
            }
          />
          <HomeMapPanel
            id="map-panel"
            viewState={dashboard.map.viewState}
            geoData={dashboard.map.selectedGeoData}
            countries={countries}
            provinces={provinces}
            setViewState={dashboard.map.setMapViewState}
            onReady={dashboard.map.handleMapReady}
          />
          <CalendarPanel
            calendarMonth={dashboard.calendar.calendarMonth}
            calendar={dashboard.calendar.calendar}
            previousCalendarMonth={dashboard.calendar.previousCalendarMonth}
            nextCalendarMonth={dashboard.calendar.nextCalendarMonth}
            canGoToPreviousMonth={dashboard.calendar.canGoToPreviousMonth}
            canGoToNextMonth={dashboard.calendar.canGoToNextMonth}
            selectedRun={dashboard.calendar.selectedRun}
            previewedCalendarKey={dashboard.calendar.previewedCalendarKey}
            calendarSlideClass={dashboard.calendar.calendarSlideClass}
            changeCalendarMonth={dashboard.actions.changeCalendarMonth}
            toggleRunSelection={dashboard.actions.toggleRunSelection}
            previewCalendarCell={dashboard.calendar.previewCalendarCell}
            clearCalendarPreview={dashboard.calendar.clearCalendarPreview}
            previewCalendarCellAtPoint={
              dashboard.calendar.previewCalendarCellAtPoint
            }
          />
          <MonthlyChart
            monthlyChartYear={dashboard.monthlyChart.monthlyChartYear}
            monthlyBars={dashboard.monthlyChart.monthlyBars}
            activeMonthlyBarKey={dashboard.monthlyChart.activeMonthlyBarKey}
            olderMonthlyChartYear={dashboard.monthlyChart.olderMonthlyChartYear}
            newerMonthlyChartYear={dashboard.monthlyChart.newerMonthlyChartYear}
            monthlyChartSlideClass={
              dashboard.monthlyChart.monthlyChartSlideClass
            }
            changeMonthlyChartYear={dashboard.actions.changeMonthlyChartYear}
            changeCalendarMonth={dashboard.actions.changeCalendarMonth}
            setHoveredMonthKey={dashboard.monthlyChart.setHoveredMonthKey}
            previewMonthlyBar={dashboard.monthlyChart.previewMonthlyBar}
            clearMonthlyBarPreview={
              dashboard.monthlyChart.clearMonthlyBarPreview
            }
            previewMonthlyBarAtPoint={
              dashboard.monthlyChart.previewMonthlyBarAtPoint
            }
          />
        </aside>
      </section>
    </main>
  );
};

export default HomeView;
