import type { Activity } from '@/entities/activity/model/types';
import {
  isMonthWithinRange,
  monthKeyFor,
  monthOrderFor,
} from '@/entities/activity/lib/date';

export type HomeSlideDirection = 'idle' | 'forward' | 'backward';

export type HomeDashboardState = {
  yearFilter: string;
  selectedRun: Activity | null;
  calendarMonth: string;
  page: number;
  calendarSlideDirection: HomeSlideDirection;
  monthlyChartSlideDirection: HomeSlideDirection;
};

export type CreateHomeStateParams = {
  thisYear: string;
  latestMonth: string;
};

type MonthRangePayload = {
  earliestMonth: string;
  latestMonth: string;
};

export type HomeDashboardAction =
  | { type: 'initializeMonth'; monthKey: string }
  | ({ type: 'clampMonth'; monthKey: string } & MonthRangePayload)
  | ({
      type: 'changeMonth';
      monthKey: string;
      years: string[];
      syncYearFilter: boolean;
    } & MonthRangePayload)
  | ({
      type: 'selectRun';
      run: Activity | null;
      nextYearFilter?: string;
      nextPage?: number;
      years: string[];
    } & MonthRangePayload)
  | ({
      type: 'changeYear';
      year: string;
      monthKey: string;
      years: string[];
    } & MonthRangePayload)
  | { type: 'setPage'; page: number }
  | { type: 'previousPage' }
  | { type: 'nextPage'; pageCount: number };

const createHomeDashboardState = ({
  thisYear,
  latestMonth,
}: CreateHomeStateParams): HomeDashboardState => ({
  yearFilter: thisYear || 'All',
  selectedRun: null,
  calendarMonth: latestMonth,
  page: 0,
  calendarSlideDirection: 'idle',
  monthlyChartSlideDirection: 'idle',
});

const pageWithinRange = (page: number) => Math.max(0, Math.floor(page));

const applyMonthChange = (
  state: HomeDashboardState,
  {
    monthKey,
    years,
    earliestMonth,
    latestMonth,
    syncYearFilter,
  }: {
    monthKey: string;
    years: string[];
    syncYearFilter: boolean;
  } & MonthRangePayload
): HomeDashboardState => {
  if (!monthKey) {
    return { ...state, selectedRun: null };
  }

  if (!isMonthWithinRange(monthKey, earliestMonth, latestMonth)) {
    return state;
  }

  const monthYear = monthKey.slice(0, 4);
  const shouldSyncYear =
    syncYearFilter &&
    years.includes(monthYear) &&
    state.yearFilter !== monthYear;
  const nextYearFilter = shouldSyncYear ? monthYear : state.yearFilter;
  const nextPage = shouldSyncYear ? 0 : state.page;

  if (monthKey === state.calendarMonth) {
    return {
      ...state,
      yearFilter: nextYearFilter,
      page: nextPage,
      selectedRun: null,
    };
  }

  const nextSlideDirection =
    state.calendarMonth &&
    monthOrderFor(monthKey) < monthOrderFor(state.calendarMonth)
      ? 'backward'
      : 'forward';

  return {
    ...state,
    yearFilter: nextYearFilter,
    page: nextPage,
    calendarMonth: monthKey,
    selectedRun: null,
    calendarSlideDirection: nextSlideDirection,
    monthlyChartSlideDirection:
      state.calendarMonth.slice(0, 4) !== monthYear
        ? nextSlideDirection
        : 'idle',
  };
};

const homeReducer = (
  state: HomeDashboardState,
  action: HomeDashboardAction
): HomeDashboardState => {
  switch (action.type) {
    case 'initializeMonth':
      if (state.calendarMonth || !action.monthKey) {
        return state;
      }
      return { ...state, calendarMonth: action.monthKey };

    case 'clampMonth':
      if (
        !state.calendarMonth ||
        isMonthWithinRange(
          state.calendarMonth,
          action.earliestMonth,
          action.latestMonth
        )
      ) {
        return state;
      }
      return {
        ...state,
        calendarMonth: action.monthKey,
        selectedRun: null,
      };

    case 'changeMonth':
      return applyMonthChange(state, action);

    case 'selectRun':
      if (!action.run) {
        return { ...state, selectedRun: null };
      }

      return {
        ...applyMonthChange(state, {
          monthKey: monthKeyFor(action.run),
          years: action.years,
          earliestMonth: action.earliestMonth,
          latestMonth: action.latestMonth,
          syncYearFilter: false,
        }),
        selectedRun: action.run,
        yearFilter: action.nextYearFilter ?? state.yearFilter,
        page: pageWithinRange(action.nextPage ?? state.page),
      };

    case 'changeYear': {
      const nextState: HomeDashboardState = {
        ...state,
        yearFilter: action.year,
        page: 0,
        selectedRun: null,
      };

      if (
        action.year === 'All' ||
        !state.calendarMonth ||
        state.calendarMonth.slice(0, 4) === action.year
      ) {
        return nextState;
      }

      return applyMonthChange(nextState, {
        monthKey: action.monthKey,
        years: action.years,
        earliestMonth: action.earliestMonth,
        latestMonth: action.latestMonth,
        syncYearFilter: false,
      });
    }

    case 'setPage':
      return { ...state, page: pageWithinRange(action.page) };

    case 'previousPage':
      return { ...state, page: Math.max(0, state.page - 1) };

    case 'nextPage':
      return {
        ...state,
        page: Math.min(Math.max(0, action.pageCount - 1), state.page + 1),
      };

    default:
      return state;
  }
};

export { createHomeDashboardState, homeReducer };
