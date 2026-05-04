import type { Activity } from '@/types/activity';
import {
  formatDuration,
  formatDurationShort,
  formatMonthlyBarDistance,
  formatRoundedHours,
} from '@/utils/activityFormat';
import {
  activityTitleForRun,
  getRacePbCategory,
  isMarathonEventRun,
  summarizeRuns,
  totalDistance,
  totalSeconds,
} from '@/utils/activityStats';
import {
  emphasizePrimaryRuns,
  getBoundsForRuns,
  getEventModalMapViewport,
  getEventModalViewState,
  getIntroViewState,
  getRoutePath,
  viewStatesNearlyEqual,
} from '@/utils/routeGeometry';
import type { RacePbCategory, SummaryStats } from '@/utils/activityStats';

const ROWS_PER_PAGE = 16;
const YEAR_GOAL = 3000;
const MONTH_GOAL = 300;
const ROW_FADE_BASE_DELAY_MS = 120;
const ROW_FADE_STAGGER_MS = 36;
const MAP_PANEL_HEIGHT = 'clamp(220px, 32vw, 300px)';
const TOUCH_REVEAL_DURATION_MS = 1800;
const EVENT_MODAL_EXIT_DURATION_MS = 360;
const EVENT_MODAL_MAP_HEIGHT = 260;
const EMPTY_ACTIVITIES: Activity[] = [];

const NAV_LINKS = [
  { to: '/', label: '首页' },
  { to: '/heatmap', label: '热力图' },
  { to: '/events', label: '赛事记录' },
];

const NAV_INDICATOR_STEP_DURATION_MS = 340;

const navIndexForPath = (pathname: string) => {
  if (pathname.startsWith('/events') || pathname.startsWith('/mls')) {
    return 2;
  }

  if (pathname.startsWith('/heatmap')) {
    return 1;
  }

  return 0;
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getMondayFirstDayIndex = (date: Date) => (date.getDay() + 6) % 7;

const monthKeyFor = (value: string) => value.slice(0, 7);

const shiftMonthKey = (monthKey: string, delta: number) => {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const monthOrderFor = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return year * 12 + month;
};

const isMonthWithinRange = (
  monthKey: string,
  firstMonthKey: string,
  lastMonthKey: string
) => {
  if (!monthKey || !firstMonthKey || !lastMonthKey) {
    return false;
  }

  const monthOrder = monthOrderFor(monthKey);
  return (
    monthOrder >= monthOrderFor(firstMonthKey) &&
    monthOrder <= monthOrderFor(lastMonthKey)
  );
};

const clampMonthKey = (
  monthKey: string,
  firstMonthKey: string,
  lastMonthKey: string
) => {
  if (!monthKey || !firstMonthKey || !lastMonthKey) {
    return monthKey;
  }

  if (monthOrderFor(monthKey) < monthOrderFor(firstMonthKey)) {
    return firstMonthKey;
  }

  if (monthOrderFor(monthKey) > monthOrderFor(lastMonthKey)) {
    return lastMonthKey;
  }

  return monthKey;
};

export {
  ROWS_PER_PAGE,
  YEAR_GOAL,
  MONTH_GOAL,
  ROW_FADE_BASE_DELAY_MS,
  ROW_FADE_STAGGER_MS,
  MAP_PANEL_HEIGHT,
  TOUCH_REVEAL_DURATION_MS,
  EVENT_MODAL_EXIT_DURATION_MS,
  EVENT_MODAL_MAP_HEIGHT,
  EMPTY_ACTIVITIES,
  NAV_LINKS,
  NAV_INDICATOR_STEP_DURATION_MS,
  navIndexForPath,
  WEEKDAY_LABELS,
  monthKeyFor,
  shiftMonthKey,
  monthOrderFor,
  isMonthWithinRange,
  clampMonthKey,
  getMondayFirstDayIndex,
  formatDuration,
  formatDurationShort,
  formatRoundedHours,
  totalDistance,
  totalSeconds,
  formatMonthlyBarDistance,
  activityTitleForRun,
  isMarathonEventRun,
  getRacePbCategory,
  summarizeRuns,
  getRoutePath,
  emphasizePrimaryRuns,
  getBoundsForRuns,
  getIntroViewState,
  viewStatesNearlyEqual,
  getEventModalMapViewport,
  getEventModalViewState,
};
export type { SummaryStats, RacePbCategory };
