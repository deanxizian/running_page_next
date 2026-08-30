import { useEffect, useMemo, useReducer } from 'react';
import type { Activity } from '@/entities/activity/model/types';
import type { ActivityGroups } from '@/entities/activity/lib/group';
import {
  latestStartedMonthKey,
  shiftMonthKey,
} from '@/entities/activity/lib/date';
import {
  activitiesForFilter,
  calendarFor,
  chartYearsFor,
  currentPeriodRunsFor,
  eventSummaryFor,
  metricsFor,
  monthlyBarsFor,
  monthlyChartYearFor,
  pageCountFor,
  pagedRunsFor,
} from './selectors';
import { useCalendarRange } from './useCalendarRange';
import { useHomeActions } from './useHomeActions';
import { useHomeInteractions } from './useHomeInteractions';
import { useRunMapFocus } from './useRunMapFocus';
import { createHomeDashboardState, homeReducer } from './homeReducer';
import type { HomeDashboardViewModel } from './types';
import { useTodayDateKey } from '@/shared/hooks/useTodayDateKey';

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
}: UseHomeDashboardParams): HomeDashboardViewModel => {
  const todayDateKey = useTodayDateKey();
  const latestSelectableMonth = latestStartedMonthKey(latestMonth);
  const [state, dispatch] = useReducer(
    homeReducer,
    { thisYear, latestMonth: latestSelectableMonth },
    createHomeDashboardState
  );
  const { isMonthWithinActivityRange, clampMonthToActivityRange } =
    useCalendarRange(earliestMonth, latestSelectableMonth);
  const interactions = useHomeInteractions(openEvents);
  const actions = useHomeActions({
    activityGroups,
    clampMonthToActivityRange,
    dispatch,
    earliestMonth,
    latestMonth: latestSelectableMonth,
    sortedActivities,
    state,
    thisYear,
    years,
  });

  useEffect(() => {
    dispatch({ type: 'initializeMonth', monthKey: latestSelectableMonth });
  }, [latestSelectableMonth]);

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
      latestMonth: latestSelectableMonth,
    });
  }, [
    clampMonthToActivityRange,
    earliestMonth,
    isMonthWithinActivityRange,
    latestSelectableMonth,
    state.calendarMonth,
  ]);

  const displayedActivities = useMemo(
    () =>
      activitiesForFilter(state.yearFilter, sortedActivities, activityGroups),
    [activityGroups, sortedActivities, state.yearFilter]
  );
  const pageCount = pageCountFor(displayedActivities);
  const pagedRuns = useMemo(
    () => pagedRunsFor(displayedActivities, state.page),
    [displayedActivities, state.page]
  );

  useEffect(() => {
    if (state.page <= pageCount - 1) {
      return;
    }

    dispatch({ type: 'setPage', page: pageCount - 1 });
  }, [pageCount, state.page]);

  const periodRuns = currentPeriodRunsFor(activityGroups, todayDateKey);
  const metricValues = metricsFor(
    sortedActivities,
    periodRuns.currentYearRuns,
    periodRuns.lastYearSamePeriodRuns,
    periodRuns.currentMonthRuns,
    periodRuns.lastMonthSamePeriodRuns
  );
  const eventSummary = eventSummaryFor(
    periodRuns.currentYearRuns,
    sortedActivities,
    latestRun
  );
  const mapRuns = useMemo(
    () => (state.selectedRun ? [state.selectedRun] : displayedActivities),
    [displayedActivities, state.selectedRun]
  );
  const mapFocus = useRunMapFocus(mapRuns, state.selectedRun);
  const calendar = useMemo(
    () => calendarFor(activityGroups, state.calendarMonth),
    [activityGroups, state.calendarMonth]
  );
  const monthlyChartYear = monthlyChartYearFor(
    state.calendarMonth,
    latestSelectableMonth,
    thisYear,
    todayDateKey.slice(0, 4)
  );
  const monthlyBars = useMemo(
    () =>
      monthlyBarsFor(
        activityGroups,
        monthlyChartYear,
        isMonthWithinActivityRange
      ),
    [activityGroups, isMonthWithinActivityRange, monthlyChartYear]
  );
  const chartYears = chartYearsFor(
    years,
    monthlyChartYear,
    latestSelectableMonth.slice(0, 4)
  );
  const previousCalendarMonth = state.calendarMonth
    ? shiftMonthKey(state.calendarMonth, -1)
    : '';
  const nextCalendarMonth = state.calendarMonth
    ? shiftMonthKey(state.calendarMonth, 1)
    : '';

  return {
    metrics: {
      ...metricValues,
      totalRunCount: sortedActivities.length,
      currentYearRuns: periodRuns.currentYearRuns,
      currentMonthRuns: periodRuns.currentMonthRuns,
      latestRun,
      ...interactions.metrics,
    },
    eventSummary: {
      year: todayDateKey.slice(0, 4),
      ...eventSummary,
      ...interactions.eventSummary,
    },
    map: {
      viewState: mapFocus.viewState,
      selectedGeoData: mapFocus.selectedGeoData,
      setMapViewState: mapFocus.setMapViewState,
      handleMapReady: mapFocus.handleMapReady,
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
      canGoToPreviousMonth: isMonthWithinActivityRange(previousCalendarMonth),
      canGoToNextMonth: isMonthWithinActivityRange(nextCalendarMonth),
      selectedRun: state.selectedRun,
      slideDirection: state.calendarSlideDirection,
      ...interactions.calendar,
    },
    monthlyChart: {
      monthlyChartYear,
      monthlyBars,
      activeMonthlyBarKey:
        interactions.monthlyChart.hoveredMonthKey ??
        interactions.monthlyChart.previewedMonthlyBarKey ??
        state.calendarMonth ??
        latestSelectableMonth,
      olderMonthlyChartYear: chartYears.olderMonthlyChartYear,
      newerMonthlyChartYear: chartYears.newerMonthlyChartYear,
      slideDirection: state.monthlyChartSlideDirection,
      setHoveredMonthKey: interactions.monthlyChart.setHoveredMonthKey,
      previewMonthlyBar: interactions.monthlyChart.previewMonthlyBar,
      clearMonthlyBarPreview: interactions.monthlyChart.clearMonthlyBarPreview,
      previewMonthlyBarAtPoint:
        interactions.monthlyChart.previewMonthlyBarAtPoint,
    },
    actions: {
      changeFilter: actions.changeFilter,
      toggleRunSelection: actions.toggleRunSelection,
      goToPreviousPage: actions.goToPreviousPage,
      goToNextPage: () => actions.goToNextPage(pageCount),
      changeCalendarMonth: actions.changeCalendarMonth,
      changeMonthlyChartYear: actions.changeMonthlyChartYear,
    },
  };
};

export { useHomeDashboard };
