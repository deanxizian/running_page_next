import { WebMercatorViewport } from '@math.gl/web-mercator';
import type { FeatureCollection } from '@/types/geojson';
import type { Activity, Coordinate, IViewState } from '@/utils/utils';
import {
  M_TO_DIST,
  convertMovingTime2Sec,
  geoJsonForRuns,
  pathForRun,
  titleForRun,
} from '@/utils/utils';
import type { RPGeometry } from '@/static/run_countries';

interface SummaryStats {
  distance: number;
  count: number;
  seconds: number;
  avgPace: string;
  avgHeartRate: number;
  maxDistance: number;
  avgDistance: number;
}

const ROWS_PER_PAGE = 16;
const YEAR_GOAL = 3000;
const MONTH_GOAL = 300;
const ROW_FADE_BASE_DELAY_MS = 120;
const ROW_FADE_STAGGER_MS = 36;
const MAP_PANEL_HEIGHT = 'clamp(220px, 32vw, 300px)';
const MAP_FIT_MARGIN_RATIO = 0.14;
const MAP_FIT_MIN_MARGIN = 0.0025;
const MAP_FIT_PADDING = 155;
const MAP_TARGET_ZOOM_PULLBACK = 0.14;
const TOUCH_REVEAL_DURATION_MS = 1800;
const EVENT_MODAL_EXIT_DURATION_MS = 360;
const EVENT_MODAL_MAP_HEIGHT = 260;
const EVENT_MODAL_MAP_MAX_WIDTH = 620;
const EVENT_MODAL_MAP_MIN_WIDTH = 260;
const EVENT_MODAL_MAP_HORIZONTAL_CHROME = 96;
const MARATHON_EVENT_NAME_PATTERN =
  /马拉松|半程|半马|全马|marathon|half\s*marathon/i;
const HALF_MARATHON_NAME_PATTERN = /半程|半马|half\s*marathon/i;
const FULL_MARATHON_NAME_PATTERN = /全马|马拉松|marathon/i;
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

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(
    2,
    '0'
  )}`;
};

const formatPaceDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

const formatDurationShort = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatRoundedHours = (seconds: number) =>
  Math.round(Math.max(0, seconds) / 3600).toString();

const totalDistance = (runs: Activity[]) =>
  runs.reduce((sum, run) => sum + run.distance / M_TO_DIST, 0);

const totalSeconds = (runs: Activity[]) =>
  runs.reduce((sum, run) => sum + convertMovingTime2Sec(run.moving_time), 0);

const formatMonthlyBarDistance = (distance: number) => {
  if (distance === 0) {
    return '0';
  }
  if (distance < 10) {
    return distance.toFixed(1);
  }
  return distance.toFixed(0);
};

const rawActivityName = (run: Activity) => (run.name || '').trim();

const activityTitleForRun = (run: Activity) =>
  rawActivityName(run) || titleForRun(run);

const isMarathonEventRun = (run: Activity) => {
  return MARATHON_EVENT_NAME_PATTERN.test(rawActivityName(run));
};

type RacePbCategory = 'half' | 'full';

const getRacePbCategory = (run: Activity): RacePbCategory | null => {
  const title = rawActivityName(run);
  const isHalfByName = HALF_MARATHON_NAME_PATTERN.test(title);
  const isFullByName = !isHalfByName && FULL_MARATHON_NAME_PATTERN.test(title);

  if (isHalfByName) {
    return 'half';
  }

  if (isFullByName) {
    return 'full';
  }

  return null;
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

const getRoutePath = (run: Activity, width = 68, height = 36) => {
  const points = pathForRun(run);
  if (points.length < 2) {
    return null;
  }

  const padding = 5;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;
  const meanLat =
    points.reduce((sum, point) => sum + point[1], 0) / points.length;
  const lngFactor = Math.max(0.08, Math.cos((meanLat * Math.PI) / 180));
  const projectedPoints = points.map(([lng, lat]) => ({
    x: lng * lngFactor,
    y: lat,
  }));
  const xValues = projectedPoints.map((point) => point.x);
  const yValues = projectedPoints.map((point) => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const xSpan = maxX - minX;
  const ySpan = maxY - minY;

  if (xSpan === 0 && ySpan === 0) {
    return null;
  }

  const scale = Math.min(
    xSpan > 0 ? drawWidth / xSpan : Infinity,
    ySpan > 0 ? drawHeight / ySpan : Infinity
  );
  const routeWidth = xSpan * scale;
  const routeHeight = ySpan * scale;
  const offsetX = (width - routeWidth) / 2;
  const offsetY = (height - routeHeight) / 2;

  return projectedPoints
    .map((point, index) => {
      const x = offsetX + (point.x - minX) * scale;
      const y = offsetY + (maxY - point.y) * scale;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
};

const getFocusedRouteBounds = (runs: Activity[]) => {
  const routeBounds: Array<{
    runId: number;
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
    centerLng: number;
    centerLat: number;
  }> = [];
  let firstPoint: Coordinate | null = null;
  let allSamePoint = true;

  runs.forEach((run) => {
    const points = pathForRun(run);
    if (!points.length) {
      return;
    }

    let routeMinLng = Infinity;
    let routeMaxLng = -Infinity;
    let routeMinLat = Infinity;
    let routeMaxLat = -Infinity;

    points.forEach((point) => {
      if (!firstPoint) {
        firstPoint = point;
      } else if (point[0] !== firstPoint[0] || point[1] !== firstPoint[1]) {
        allSamePoint = false;
      }

      routeMinLng = Math.min(routeMinLng, point[0]);
      routeMaxLng = Math.max(routeMaxLng, point[0]);
      routeMinLat = Math.min(routeMinLat, point[1]);
      routeMaxLat = Math.max(routeMaxLat, point[1]);
    });

    routeBounds.push({
      runId: run.run_id,
      minLng: routeMinLng,
      maxLng: routeMaxLng,
      minLat: routeMinLat,
      maxLat: routeMaxLat,
      centerLng: (routeMinLng + routeMaxLng) / 2,
      centerLat: (routeMinLat + routeMaxLat) / 2,
    });
  });

  if (!routeBounds.length || !firstPoint) {
    return {
      bounds: routeBounds,
      firstPoint,
      allSamePoint,
    };
  }

  const focusedBounds =
    routeBounds.length > 1
      ? (() => {
          const centerLngs = routeBounds
            .map((bounds) => bounds.centerLng)
            .sort((a, b) => a - b);
          const centerLats = routeBounds
            .map((bounds) => bounds.centerLat)
            .sort((a, b) => a - b);
          const medianLng = centerLngs[Math.floor(centerLngs.length / 2)];
          const medianLat = centerLats[Math.floor(centerLats.length / 2)];
          const cosLat = Math.cos((medianLat * Math.PI) / 180);
          const retainedCount = Math.max(
            1,
            Math.ceil(routeBounds.length * 0.9)
          );

          return routeBounds
            .map((bounds) => ({
              ...bounds,
              distanceToMedian: Math.hypot(
                (bounds.centerLng - medianLng) * cosLat,
                bounds.centerLat - medianLat
              ),
            }))
            .sort((a, b) => a.distanceToMedian - b.distanceToMedian)
            .slice(0, retainedCount);
        })()
      : routeBounds;

  return {
    bounds: focusedBounds,
    firstPoint,
    allSamePoint,
  };
};

const getPrimaryRunIds = (runs: Activity[]) =>
  new Set(getFocusedRouteBounds(runs).bounds.map((bounds) => bounds.runId));

const emphasizePrimaryRuns = (
  runs: Activity[],
  selectedRun: Activity | null
): FeatureCollection<RPGeometry> => {
  const data = geoJsonForRuns(runs);

  if (selectedRun || runs.length <= 1) {
    return data;
  }

  const primaryRunIds = getPrimaryRunIds(runs);

  return {
    ...data,
    features: data.features.map((feature, index) => ({
      ...feature,
      properties: {
        ...feature.properties,
        dimmed: !primaryRunIds.has(runs[index]?.run_id),
      },
    })),
  };
};

const getBoundsForRuns = (runs: Activity[]): IViewState => {
  const focused = getFocusedRouteBounds(runs);

  if (!focused.bounds.length || !focused.firstPoint) {
    return { longitude: 20, latitude: 20, zoom: 3 };
  }

  if (focused.allSamePoint) {
    return {
      longitude: focused.firstPoint[0],
      latitude: focused.firstPoint[1],
      zoom: 8.7,
    };
  }

  const bounds = focused.bounds.reduce(
    (bounds, route) => ({
      minLng: Math.min(bounds.minLng, route.minLng),
      maxLng: Math.max(bounds.maxLng, route.maxLng),
      minLat: Math.min(bounds.minLat, route.minLat),
      maxLat: Math.max(bounds.maxLat, route.maxLat),
    }),
    {
      minLng: Infinity,
      maxLng: -Infinity,
      minLat: Infinity,
      maxLat: -Infinity,
    }
  );

  const lngMargin = Math.max(
    (bounds.maxLng - bounds.minLng) * MAP_FIT_MARGIN_RATIO,
    MAP_FIT_MIN_MARGIN
  );
  const latMargin = Math.max(
    (bounds.maxLat - bounds.minLat) * MAP_FIT_MARGIN_RATIO,
    MAP_FIT_MIN_MARGIN
  );

  const cornersLongLat: [Coordinate, Coordinate] = [
    [bounds.minLng - lngMargin, bounds.minLat - latMargin],
    [bounds.maxLng + lngMargin, bounds.maxLat + latMargin],
  ];

  const viewState = new WebMercatorViewport({
    width: 800,
    height: 600,
  }).fitBounds(cornersLongLat, { padding: MAP_FIT_PADDING });

  return {
    longitude: viewState.longitude,
    latitude: viewState.latitude,
    zoom: Math.max(
      1,
      Math.min(
        viewState.zoom - MAP_TARGET_ZOOM_PULLBACK,
        runs.length > 1 ? 15 : 16
      )
    ),
  };
};

const finiteViewValue = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) ? value! : fallback;

const getIntroViewState = (target: IViewState): IViewState => {
  const targetLongitude = finiteViewValue(target.longitude, 20);
  const targetLatitude = finiteViewValue(target.latitude, 20);
  const targetZoom = finiteViewValue(target.zoom, 3);
  const zoomPullback = Math.min(2.1, Math.max(1.05, targetZoom * 0.14));

  return {
    longitude: targetLongitude,
    latitude: targetLatitude,
    zoom: Math.max(1, targetZoom - zoomPullback),
  };
};

const viewStatesNearlyEqual = (left: IViewState, right: IViewState) =>
  Math.abs(
    finiteViewValue(left.longitude, 0) - finiteViewValue(right.longitude, 0)
  ) < 0.0001 &&
  Math.abs(
    finiteViewValue(left.latitude, 0) - finiteViewValue(right.latitude, 0)
  ) < 0.0001 &&
  Math.abs(finiteViewValue(left.zoom, 0) - finiteViewValue(right.zoom, 0)) <
    0.01;

const getEventModalMapViewport = () => {
  const viewportWidth =
    typeof window === 'undefined'
      ? EVENT_MODAL_MAP_MAX_WIDTH + EVENT_MODAL_MAP_HORIZONTAL_CHROME
      : window.innerWidth;

  return {
    width: Math.min(
      EVENT_MODAL_MAP_MAX_WIDTH,
      Math.max(
        EVENT_MODAL_MAP_MIN_WIDTH,
        viewportWidth - EVENT_MODAL_MAP_HORIZONTAL_CHROME
      )
    ),
    height: EVENT_MODAL_MAP_HEIGHT,
  };
};

const getEventModalViewState = (
  run: Activity | null,
  viewport: { width: number; height: number }
): IViewState => {
  const points = run ? pathForRun(run) : [];

  if (!points.length) {
    return { longitude: 20, latitude: 20, zoom: 3 };
  }

  if (points.length === 2 && String(points[0]) === String(points[1])) {
    return { longitude: points[0][0], latitude: points[0][1], zoom: 9 };
  }

  const pointsLong = points.map((point) => point[0]);
  const pointsLat = points.map((point) => point[1]);
  const cornersLongLat: [Coordinate, Coordinate] = [
    [Math.min(...pointsLong), Math.min(...pointsLat)],
    [Math.max(...pointsLong), Math.max(...pointsLat)],
  ];
  const viewState = new WebMercatorViewport(viewport).fitBounds(
    cornersLongLat,
    { padding: viewport.width < 420 ? 24 : 26 }
  );

  return {
    longitude: viewState.longitude,
    latitude: viewState.latitude,
    zoom: Math.max(1, Math.min(viewState.zoom, 16)),
  };
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
