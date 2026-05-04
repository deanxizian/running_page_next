import type { Activity } from '@/types/activity';
import { RUN_TITLES } from './const';

export type { Activity, Coordinate, IViewState } from '@/types/activity';
export {
  DIST_UNIT,
  M_TO_DIST,
  convertMovingTime2Sec,
  formatDuration,
  formatDurationShort,
  formatMonthlyBarDistance,
  formatPace,
  formatPaceDuration,
  formatRoundedHours,
} from './activityFormat';
export { locationForRun } from './activityLocation';
export {
  emphasizePrimaryRuns,
  geoJsonForMap,
  geoJsonForRuns,
  getBoundsForRuns,
  getEventModalMapViewport,
  getEventModalViewState,
  getIntroViewState,
  getRoutePath,
  pathForRun,
  viewStatesNearlyEqual,
} from './routeGeometry';

const titleForRun = (run: Activity): string => {
  const runDistance = run.distance / 1000;
  const runHour = +run.start_date_local.slice(11, 13);
  if (runDistance > 20 && runDistance < 40) {
    return RUN_TITLES.HALF_MARATHON_RUN_TITLE;
  }
  if (runDistance >= 40) {
    return RUN_TITLES.FULL_MARATHON_RUN_TITLE;
  }
  if (runHour >= 0 && runHour <= 10) {
    return RUN_TITLES.MORNING_RUN_TITLE;
  }
  if (runHour > 10 && runHour <= 14) {
    return RUN_TITLES.MIDDAY_RUN_TITLE;
  }
  if (runHour > 14 && runHour <= 18) {
    return RUN_TITLES.AFTERNOON_RUN_TITLE;
  }
  if (runHour > 18 && runHour <= 21) {
    return RUN_TITLES.EVENING_RUN_TITLE;
  }
  return RUN_TITLES.NIGHT_RUN_TITLE;
};

const sortDateFunc = (a: Activity, b: Activity) => {
  return (
    new Date(b.start_date_local.replace(' ', 'T')).getTime() -
    new Date(a.start_date_local.replace(' ', 'T')).getTime()
  );
};

export { titleForRun, sortDateFunc };
