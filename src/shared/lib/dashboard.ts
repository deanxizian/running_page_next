import type { Activity } from '@/entities/activity/model/types';
import {
  DIST_UNIT,
  M_TO_DIST,
  formatDuration,
  formatDurationShort,
  formatMonthlyBarDistance,
  formatRoundedHours,
} from '@/entities/activity/lib/format';
import {
  clampMonthKey,
  getMondayFirstDayIndex,
  isMonthWithinRange,
  monthKeyFor,
  monthOrderFor,
  shiftMonthKey,
} from '@/entities/activity/lib/date';
import {
  activityTitleForRun,
  getRacePbCategory,
  isMarathonEventRun,
  summarizeRuns,
  totalDistance,
  totalSeconds,
} from '@/entities/activity/lib/stats';
import {
  emphasizePrimaryRuns,
  getBoundsForRuns,
  getEventModalMapViewport,
  getEventModalViewState,
  getIntroViewState,
  getRoutePath,
  viewStatesNearlyEqual,
} from '@/entities/activity/lib/route';
import type {
  RacePbCategory,
  SummaryStats,
} from '@/entities/activity/lib/stats';

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
  DIST_UNIT,
  M_TO_DIST,
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
