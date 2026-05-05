import { useCallback } from 'react';
import type { Dispatch } from 'react';
import type { Activity } from '@/entities/activity/model/types';
import type { ActivityGroups } from '@/entities/activity/lib/group';
import { pageForRun } from './selectors';
import type { HomeDashboardAction, HomeDashboardState } from './homeReducer';

type UseHomeActionsParams = {
  activityGroups: ActivityGroups;
  clampMonthToActivityRange: (monthKey: string) => string;
  dispatch: Dispatch<HomeDashboardAction>;
  earliestMonth: string;
  latestMonth: string;
  sortedActivities: Activity[];
  state: HomeDashboardState;
  thisYear: string;
  years: string[];
};

const useHomeActions = ({
  activityGroups,
  clampMonthToActivityRange,
  dispatch,
  earliestMonth,
  latestMonth,
  sortedActivities,
  state,
  thisYear,
  years,
}: UseHomeActionsParams) => {
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
    [dispatch, earliestMonth, latestMonth, years]
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
        nextPage: pageForRun(
          run,
          nextYearFilter,
          sortedActivities,
          activityGroups,
          state.page
        ),
        years,
        earliestMonth,
        latestMonth,
      });
    },
    [
      activityGroups,
      dispatch,
      earliestMonth,
      latestMonth,
      sortedActivities,
      state.page,
      state.yearFilter,
      years,
    ]
  );

  const toggleRunSelection = useCallback(
    (run: Activity) => {
      selectRun(state.selectedRun?.run_id === run.run_id ? null : run);
    },
    [selectRun, state.selectedRun]
  );

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
    [
      dispatch,
      earliestMonth,
      latestMonth,
      monthKeyForSelectedMonthInYear,
      years,
    ]
  );

  const goToPreviousPage = useCallback(
    () => dispatch({ type: 'previousPage' }),
    [dispatch]
  );
  const goToNextPage = useCallback(
    (pageCount: number) => dispatch({ type: 'nextPage', pageCount }),
    [dispatch]
  );

  return {
    changeCalendarMonth,
    changeFilter,
    changeMonthlyChartYear,
    goToNextPage,
    goToPreviousPage,
    toggleRunSelection,
  };
};

export { useHomeActions };
