import type { Activity } from '../model/types';
import { M_TO_DIST, convertMovingTime2Sec, formatPaceDuration } from './format';
import { titleForRun } from './title';

interface SummaryStats {
  distance: number;
  count: number;
  seconds: number;
  avgPace: string;
  avgHeartRate: number;
  maxDistance: number;
  avgDistance: number;
}

export type RacePbCategory = 'half' | 'full';

const HALF_MARATHON_NAME_PATTERN = /半程|半马|half\s*marathon/i;
const FULL_MARATHON_NAME_PATTERN = /全马|马拉松|marathon/i;
const STRAVA_RACE_WORKOUT_TYPE = 1;
const HALF_MARATHON_MIN_DISTANCE = 20_000;
const HALF_MARATHON_MAX_DISTANCE = 23_000;
const FULL_MARATHON_MIN_DISTANCE = 40_000;
const FULL_MARATHON_MAX_DISTANCE = 45_000;

const totalDistance = (runs: Activity[]) =>
  runs.reduce((sum, run) => sum + run.distance / M_TO_DIST, 0);

const totalSeconds = (runs: Activity[]) =>
  runs.reduce((sum, run) => sum + convertMovingTime2Sec(run.moving_time), 0);

const rawActivityName = (run: Activity) => (run.name || '').trim();

const activityTitleForRun = (run: Activity) =>
  rawActivityName(run) || titleForRun(run);

const racePbCategoryForDistance = (distance: number): RacePbCategory | null => {
  if (
    distance >= HALF_MARATHON_MIN_DISTANCE &&
    distance <= HALF_MARATHON_MAX_DISTANCE
  ) {
    return 'half';
  }

  if (
    distance >= FULL_MARATHON_MIN_DISTANCE &&
    distance <= FULL_MARATHON_MAX_DISTANCE
  ) {
    return 'full';
  }

  return null;
};

const fallbackRaceCategoryFor = (run: Activity): RacePbCategory | null => {
  const title = rawActivityName(run);
  const distanceCategory = racePbCategoryForDistance(run.distance);
  const isHalfByName = HALF_MARATHON_NAME_PATTERN.test(title);
  const isFullByName = !isHalfByName && FULL_MARATHON_NAME_PATTERN.test(title);

  if (isHalfByName && distanceCategory === 'half') {
    return 'half';
  }

  if (isFullByName && distanceCategory === 'full') {
    return 'full';
  }

  return null;
};

const isRaceEventRun = (run: Activity) =>
  run.workout_type === STRAVA_RACE_WORKOUT_TYPE ||
  fallbackRaceCategoryFor(run) !== null;

const getRacePbCategory = (run: Activity): RacePbCategory | null => {
  if (!isRaceEventRun(run)) {
    return null;
  }

  return racePbCategoryForDistance(run.distance);
};

const summarizeRuns = (runs: Activity[]): SummaryStats => {
  const distance = totalDistance(runs);
  const seconds = totalSeconds(runs);
  const heartRuns = runs.filter((run) => run.average_heartrate);

  return {
    distance,
    count: runs.length,
    seconds,
    avgPace: distance > 0 ? formatPaceDuration(seconds / distance) : '-',
    avgHeartRate: heartRuns.length
      ? Math.round(
          heartRuns.reduce(
            (sum, run) => sum + (run.average_heartrate ?? 0),
            0
          ) / heartRuns.length
        )
      : 0,
    maxDistance: Math.max(...runs.map((run) => run.distance / M_TO_DIST), 0),
    avgDistance: runs.length ? distance / runs.length : 0,
  };
};

export {
  totalDistance,
  totalSeconds,
  activityTitleForRun,
  isRaceEventRun,
  getRacePbCategory,
  summarizeRuns,
};
