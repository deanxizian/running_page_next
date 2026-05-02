import {
  ReactNode,
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Link,
  Navigate,
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import RunMap from '@/components/RunMap';
import useActivities from '@/hooks/useActivities';
import NotFoundPage from '@/pages/404';
import { WebMercatorViewport } from '@math.gl/web-mercator';
import type { FeatureCollection } from '@/types/geojson';
import {
  Activity,
  Coordinate,
  DIST_UNIT,
  M_TO_DIST,
  convertMovingTime2Sec,
  formatPace,
  geoJsonForRuns,
  pathForRun,
  sortDateFunc,
  titleForRun,
  IViewState,
} from '@/utils/utils';
import { RPGeometry } from '@/static/run_countries';
import styles from './style.module.css';

type DashboardView = 'home' | 'heatmap' | 'events';
type DashboardRouteView = DashboardView | 'redirect-events' | 'not-found';

interface NextDashboardProps {
  view?: DashboardView;
}

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

const dashboardViewForPath = (pathname: string): DashboardRouteView => {
  if (pathname === '/') {
    return 'home';
  }

  if (pathname.startsWith('/heatmap')) {
    return 'heatmap';
  }

  if (pathname.startsWith('/events')) {
    return 'events';
  }

  if (pathname.startsWith('/mls')) {
    return 'redirect-events';
  }

  return 'not-found';
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

const groupActivitiesByDate = (runs: Activity[]) => {
  const byYear = new Map<string, Activity[]>();
  const byMonth = new Map<string, Activity[]>();

  runs.forEach((run) => {
    const year = run.start_date_local.slice(0, 4);
    const month = run.start_date_local.slice(0, 7);
    const yearRuns = byYear.get(year) ?? [];
    const monthRuns = byMonth.get(month) ?? [];

    yearRuns.push(run);
    monthRuns.push(run);
    byYear.set(year, yearRuns);
    byMonth.set(month, monthRuns);
  });

  return { byYear, byMonth };
};

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

const useTouchRevealAction = (action?: () => void) => {
  const [isTouchRevealActive, setIsTouchRevealActive] = useState(false);
  const isTouchRevealActiveRef = useRef(false);
  const pendingTouchActionRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const touchRevealTimeoutRef = useRef<number | null>(null);

  const clearTouchRevealTimeout = useCallback(() => {
    if (touchRevealTimeoutRef.current) {
      window.clearTimeout(touchRevealTimeoutRef.current);
      touchRevealTimeoutRef.current = null;
    }
  }, []);

  const hideTouchReveal = useCallback(() => {
    clearTouchRevealTimeout();
    isTouchRevealActiveRef.current = false;
    setIsTouchRevealActive(false);
  }, [clearTouchRevealTimeout]);

  const showTouchReveal = useCallback(() => {
    clearTouchRevealTimeout();
    isTouchRevealActiveRef.current = true;
    setIsTouchRevealActive(true);
    touchRevealTimeoutRef.current = window.setTimeout(
      hideTouchReveal,
      TOUCH_REVEAL_DURATION_MS
    );
  }, [clearTouchRevealTimeout, hideTouchReveal]);

  useEffect(() => () => clearTouchRevealTimeout(), [clearTouchRevealTimeout]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!action || event.pointerType === 'mouse') {
        return;
      }

      if (!isTouchRevealActiveRef.current) {
        showTouchReveal();
        suppressNextClickRef.current = true;
        return;
      }

      pendingTouchActionRef.current = true;
    },
    [action, showTouchReveal]
  );

  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (!action) {
        return;
      }

      if (pendingTouchActionRef.current) {
        event.preventDefault();
        event.stopPropagation();
        pendingTouchActionRef.current = false;
        suppressNextClickRef.current = false;
        hideTouchReveal();
        action();
        return;
      }

      if (suppressNextClickRef.current) {
        event.preventDefault();
        event.stopPropagation();
        suppressNextClickRef.current = false;
        return;
      }

      hideTouchReveal();
      action();
    },
    [action, hideTouchReveal]
  );

  const handlePointerCancel = useCallback(() => {
    pendingTouchActionRef.current = false;
    suppressNextClickRef.current = false;
  }, []);

  return {
    isTouchRevealActive,
    touchRevealHandlers: action
      ? {
          onPointerDown: handlePointerDown,
          onPointerCancel: handlePointerCancel,
          onClick: handleClick,
        }
      : {},
  };
};

const useTouchPreview = <T,>() => {
  const [previewedKey, setPreviewedKey] = useState<T | null>(null);
  const previewTimeoutRef = useRef<number | null>(null);

  const clearTouchPreview = useCallback(() => {
    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }

    setPreviewedKey(null);
  }, []);

  const showTouchPreview = useCallback(
    (key: T | null | undefined) => {
      if (key === null || typeof key === 'undefined') {
        return;
      }

      if (previewTimeoutRef.current) {
        window.clearTimeout(previewTimeoutRef.current);
      }

      setPreviewedKey(key);
      previewTimeoutRef.current = window.setTimeout(() => {
        setPreviewedKey(null);
        previewTimeoutRef.current = null;
      }, TOUCH_REVEAL_DURATION_MS);
    },
    []
  );

  useEffect(() => clearTouchPreview, [clearTouchPreview]);

  return {
    previewedKey,
    showTouchPreview,
    clearTouchPreview,
  };
};

const MetricCard = ({
  label,
  value,
  unit,
  details,
  detailIcons,
  stackDetails = false,
  progress,
  trend,
  onClick,
  overlay,
  className,
}: {
  label: string;
  value: string;
  unit: string;
  details: string[];
  detailIcons?: MetricIconName[];
  stackDetails?: boolean;
  progress?: number;
  trend?: {
    text: string;
    positive: boolean;
  };
  onClick?: () => void;
  overlay?: string;
  className?: string;
}) => {
  const { isTouchRevealActive, touchRevealHandlers } =
    useTouchRevealAction(onClick);
  const cardClassName = [
    styles.metricCard,
    onClick ? styles.metricCardInteractive : '',
    isTouchRevealActive ? styles.cardTouchRevealActive : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>
        {value}
        <span>{unit}</span>
      </span>
      <span
        className={`${styles.metricProgressSlot} ${
          typeof progress === 'number' ? '' : styles.metricSlotEmpty
        }`}
      >
        {typeof progress === 'number' && (
          <span className={styles.progressTrack}>
            <span
              className={styles.progressBar}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </span>
        )}
      </span>
      <span
        className={`${styles.metricDetails} ${
          stackDetails ? styles.metricDetailsStacked : ''
        }`}
      >
        {details.map((detail, index) => (
          <span key={`${detail}-${index}`} className={styles.metricDetailItem}>
            {detailIcons?.[index] && (
              <span className={styles.metricDetailIcon}>
                <MetricIcon icon={detailIcons[index]} />
              </span>
            )}
            {detail}
          </span>
        ))}
      </span>
      <span className={styles.metricTrendSlot}>
        {trend ? (
          <span
            className={`${styles.metricTrend} ${
              trend.positive ? styles.trendPositive : styles.trendMuted
            }`}
          >
            <span className={styles.metricDetailIcon}>
              <MetricIcon icon={trend.positive ? 'trendUp' : 'trendDown'} />
            </span>
            {trend.text}
          </span>
        ) : (
          <span className={styles.metricTrendPlaceholder} aria-hidden="true" />
        )}
      </span>
      {overlay && <span className={styles.cardOverlay}>{overlay}</span>}
    </>
  );

  if (!onClick) {
    return <article className={cardClassName}>{content}</article>;
  }

  return (
    <button type="button" className={cardClassName} {...touchRevealHandlers}>
      {content}
    </button>
  );
};

type MetricIconName =
  | 'bolt'
  | 'clock'
  | 'target'
  | 'calendar'
  | 'trendUp'
  | 'trendDown';

const MetricIcon = ({ icon }: { icon: MetricIconName }) => {
  const commonProps = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (icon) {
    case 'clock':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l3 2" />
          <path d="M9 2h6" />
        </svg>
      );
    case 'target':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...commonProps}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M3 10h18" />
        </svg>
      );
    case 'trendUp':
      return (
        <svg {...commonProps}>
          <path d="m3 17 6-6 4 4 7-7" />
          <path d="M14 8h6v6" />
        </svg>
      );
    case 'trendDown':
      return (
        <svg {...commonProps}>
          <path d="m3 7 6 6 4-4 7 7" />
          <path d="M14 16h6v-6" />
        </svg>
      );
    case 'bolt':
    default:
      return (
        <svg {...commonProps}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
        </svg>
      );
  }
};

const RouteSpark = ({ run }: { run: Activity }) => {
  const d = getRoutePath(run);
  if (!d) {
    return <span className={styles.calendarDistanceOnly} />;
  }

  return (
    <svg className={styles.routeSpark} viewBox="0 0 68 36" aria-hidden="true">
      <path d={d} />
    </svg>
  );
};

const EventRouteBackground = ({ run }: { run: Activity }) => {
  const d = getRoutePath(run, 160, 96);
  if (!d) {
    return null;
  }

  return (
    <svg
      className={styles.eventRouteBackground}
      viewBox="0 0 160 96"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
};

const EventPbMedalIcon = () => (
  <svg
    className={styles.eventPbMedal}
    viewBox="0 0 18 22"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M4.3 1.8h4.1l1.1 5.1-2.7 2.4L4.3 1.8Z" />
    <path d="M9.6 1.8h4.1l-2.5 7.5-2.7-2.4 1.1-5.1Z" />
    <circle cx="9" cy="14.6" r="5.4" />
  </svg>
);

const ChevronIcon = ({ direction }: { direction: 'left' | 'right' }) => (
  <svg
    className={styles.navArrowIcon}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path d={direction === 'left' ? 'M15 18 9 12l6-6' : 'm9 18 6-6-6-6'} />
  </svg>
);

const navIndicatorStyle = (activeNavIndex: number, travelSteps: number) =>
  ({
    '--nav-indicator-offset':
      activeNavIndex === 0
        ? '0px'
        : activeNavIndex === 1
          ? 'calc(100% + var(--nav-gap))'
          : 'calc(200% + var(--nav-gap) + var(--nav-gap))',
    '--nav-indicator-duration':
      travelSteps === 0
        ? '0ms'
        : `${travelSteps * NAV_INDICATOR_STEP_DURATION_MS}ms`,
  }) as CSSProperties;

const PageShell = ({
  children,
  thisYear,
}: {
  children: ReactNode;
  thisYear: string;
}) => {
  const location = useLocation();
  const activeNavIndex = navIndexForPath(location.pathname);
  const previousNavIndexRef = useRef(activeNavIndex);
  const indicatorTravelSteps = Math.abs(
    activeNavIndex - previousNavIndexRef.current
  );
  const indicatorStyle = navIndicatorStyle(
    activeNavIndex,
    indicatorTravelSteps
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    previousNavIndexRef.current = activeNavIndex;
  }, [activeNavIndex]);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link to="/" className={styles.brand}>
            <span>Running</span>
            <span> Page</span>
          </Link>
          <div className={styles.navLinks} style={indicatorStyle}>
            <span className={styles.navIndicator} aria-hidden="true" />
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  isActive ? styles.navLinkActive : undefined
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      {children}
      <footer className={styles.footer}>
        © {thisYear} Running Page. All miles counted.
      </footer>
    </div>
  );
};

const HomeView = ({
  years,
  thisYear,
  sortedActivities,
  latestRun,
}: {
  years: string[];
  thisYear: string;
  sortedActivities: Activity[];
  latestRun: Activity | null;
}) => {
  const navigate = useNavigate();
  const openHeatmap = useCallback(() => navigate('/heatmap'), [navigate]);
  const openEvents = useCallback(() => navigate('/events'), [navigate]);
  const {
    isTouchRevealActive: isEventTouchRevealActive,
    touchRevealHandlers: eventTouchRevealHandlers,
  } = useTouchRevealAction(openEvents);
  const latestMonth = latestRun ? monthKeyFor(latestRun.start_date_local) : '';
  const earliestMonth = useMemo(() => {
    if (!sortedActivities.length) {
      return latestMonth;
    }

    return sortedActivities.reduce((earliest, run) => {
      const monthKey = monthKeyFor(run.start_date_local);
      return monthOrderFor(monthKey) < monthOrderFor(earliest)
        ? monthKey
        : earliest;
    }, monthKeyFor(sortedActivities[0].start_date_local));
  }, [latestMonth, sortedActivities]);
  const [yearFilter, setYearFilter] = useState(thisYear || 'All');
  const [page, setPage] = useState(0);
  const [selectedRun, setSelectedRun] = useState<Activity | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(latestMonth);
  const [hoveredMonthKey, setHoveredMonthKey] = useState<string | null>(null);
  const {
    previewedKey: previewedCalendarKey,
    showTouchPreview: previewCalendarCell,
    clearTouchPreview: clearCalendarPreview,
  } = useTouchPreview<string>();
  const {
    previewedKey: previewedMonthlyBarKey,
    showTouchPreview: previewMonthlyBar,
    clearTouchPreview: clearMonthlyBarPreview,
  } = useTouchPreview<string>();
  const [calendarSlideDirection, setCalendarSlideDirection] = useState<
    'idle' | 'forward' | 'backward'
  >('idle');
  const [monthlyChartSlideDirection, setMonthlyChartSlideDirection] = useState<
    'idle' | 'forward' | 'backward'
  >('idle');

  useEffect(() => {
    if (!calendarMonth && latestMonth) {
      setCalendarMonth(latestMonth);
    }
  }, [calendarMonth, latestMonth]);

  const isMonthWithinActivityRange = useCallback(
    (monthKey: string) => isMonthWithinRange(monthKey, earliestMonth, latestMonth),
    [earliestMonth, latestMonth]
  );

  const clampMonthToActivityRange = useCallback(
    (monthKey: string) => clampMonthKey(monthKey, earliestMonth, latestMonth),
    [earliestMonth, latestMonth]
  );

  useEffect(() => {
    if (!calendarMonth || isMonthWithinActivityRange(calendarMonth)) {
      return;
    }

    setCalendarMonth(clampMonthToActivityRange(calendarMonth));
    setSelectedRun(null);
  }, [calendarMonth, clampMonthToActivityRange, isMonthWithinActivityRange]);

  const previewCalendarCellAtPoint = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') {
        return;
      }

      const element = document.elementFromPoint(
        event.clientX,
        event.clientY
      );
      const calendarButton = element?.closest<HTMLButtonElement>(
        '[data-calendar-key]'
      );

      if (!calendarButton || calendarButton.disabled) {
        return;
      }

      previewCalendarCell(calendarButton.dataset.calendarKey);
    },
    [previewCalendarCell]
  );

  const previewMonthlyBarAtPoint = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') {
        return;
      }

      const element = document.elementFromPoint(
        event.clientX,
        event.clientY
      );
      const barButton = element?.closest<HTMLButtonElement>('[data-month-key]');

      if (!barButton || barButton.disabled) {
        return;
      }

      previewMonthlyBar(barButton.dataset.monthKey);
    },
    [previewMonthlyBar]
  );

  const activityGroups = useMemo(
    () => groupActivitiesByDate(sortedActivities),
    [sortedActivities]
  );

  const getActivitiesForFilter = useCallback(
    (filter: string) => {
      if (filter === 'All') {
        return sortedActivities;
      }
      return activityGroups.byYear.get(filter) ?? EMPTY_ACTIVITIES;
    },
    [activityGroups, sortedActivities]
  );

  const displayedActivities = useMemo(
    () => getActivitiesForFilter(yearFilter),
    [getActivitiesForFilter, yearFilter]
  );

  const syncLogPageForRun = useCallback(
    (run: Activity, filter: string) => {
      const runIndex = getActivitiesForFilter(filter).findIndex(
        (activity) => activity.run_id === run.run_id
      );

      if (runIndex === -1) {
        return;
      }

      setPage(Math.floor(runIndex / ROWS_PER_PAGE));
    },
    [getActivitiesForFilter]
  );

  const changeCalendarMonth = useCallback(
    (monthKey: string) => {
      if (!monthKey) {
        setSelectedRun(null);
        return;
      }

      if (!isMonthWithinActivityRange(monthKey)) {
        return;
      }

      const monthYear = monthKey.slice(0, 4);
      if (years.includes(monthYear) && yearFilter !== monthYear) {
        setYearFilter(monthYear);
        setPage(0);
      }

      if (monthKey === calendarMonth) {
        setSelectedRun(null);
        return;
      }

      const nextSlideDirection =
        calendarMonth && monthOrderFor(monthKey) < monthOrderFor(calendarMonth)
          ? 'backward'
          : 'forward';

      setCalendarSlideDirection(nextSlideDirection);
      setMonthlyChartSlideDirection(
        calendarMonth.slice(0, 4) !== monthYear ? nextSlideDirection : 'idle'
      );
      setCalendarMonth(monthKey);
      setSelectedRun(null);
    },
    [calendarMonth, isMonthWithinActivityRange, yearFilter, years]
  );

  const selectRun = useCallback(
    (run: Activity | null) => {
      if (!run) {
        setSelectedRun(null);
        return;
      }

      const runYear = run.start_date_local.slice(0, 4);
      const runMonth = monthKeyFor(run.start_date_local);
      const nextYearFilter =
        yearFilter === 'All' || yearFilter === runYear ? yearFilter : runYear;

      if (nextYearFilter !== yearFilter) {
        setYearFilter(nextYearFilter);
      }
      if (runMonth !== calendarMonth) {
        changeCalendarMonth(runMonth);
      }

      syncLogPageForRun(run, nextYearFilter);
      setSelectedRun(run);
    },
    [calendarMonth, changeCalendarMonth, syncLogPageForRun, yearFilter]
  );

  const toggleRunSelection = useCallback(
    (run: Activity) => {
      selectRun(selectedRun?.run_id === run.run_id ? null : run);
    },
    [selectRun, selectedRun]
  );

  const currentYearRuns =
    activityGroups.byYear.get(thisYear) ?? EMPTY_ACTIVITIES;
  const previousYear = String(Number(thisYear) - 1);
  const previousYearRuns =
    activityGroups.byYear.get(previousYear) ?? EMPTY_ACTIVITIES;
  const currentMonthRuns = latestMonth
    ? (activityGroups.byMonth.get(latestMonth) ?? EMPTY_ACTIVITIES)
    : EMPTY_ACTIVITIES;
  const previousMonth = latestMonth ? shiftMonthKey(latestMonth, -1) : '';
  const previousMonthRuns = previousMonth
    ? (activityGroups.byMonth.get(previousMonth) ?? EMPTY_ACTIVITIES)
    : EMPTY_ACTIVITIES;

  const mapRuns = useMemo(
    () => (selectedRun ? [selectedRun] : displayedActivities),
    [displayedActivities, selectedRun]
  );
  const selectedGeoData = useMemo(
    () => emphasizePrimaryRuns(mapRuns, selectedRun),
    [mapRuns, selectedRun]
  );
  const [mapReady, setMapReady] = useState(false);
  const [viewState, setViewState] = useState<IViewState>(() =>
    getIntroViewState(getBoundsForRuns(mapRuns))
  );
  const viewStateRef = useRef<IViewState>(viewState);
  const hasPlayedInitialMapFocusRef = useRef(false);

  const setMapViewState = useCallback((nextViewState: IViewState) => {
    viewStateRef.current = nextViewState;
    setViewState(nextViewState);
  }, []);

  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!hasPlayedInitialMapFocusRef.current && !mapReady) {
      return;
    }

    const targetViewState = getBoundsForRuns(mapRuns);
    const startViewState = viewStateRef.current;

    if (viewStatesNearlyEqual(startViewState, targetViewState)) {
      hasPlayedInitialMapFocusRef.current = true;
      setMapViewState(targetViewState);
      return;
    }

    hasPlayedInitialMapFocusRef.current = true;
    setMapViewState(targetViewState);
  }, [mapReady, mapRuns, setMapViewState]);

  const pagedRuns = useMemo(() => {
    const start = page * ROWS_PER_PAGE;
    return displayedActivities.slice(start, start + ROWS_PER_PAGE);
  }, [displayedActivities, page]);
  const pageCount = Math.max(
    1,
    Math.ceil(displayedActivities.length / ROWS_PER_PAGE)
  );

  const yearDistance = totalDistance(currentYearRuns);
  const previousYearDistance = totalDistance(previousYearRuns);
  const monthDistance = totalDistance(currentMonthRuns);
  const previousMonthDistance = totalDistance(previousMonthRuns);
  const allDistance = totalDistance(sortedActivities);
  const allSeconds = totalSeconds(sortedActivities);
  const marathonRuns = useMemo(
    () => currentYearRuns.filter(isMarathonEventRun),
    [currentYearRuns]
  );
  const latestLongRun =
    marathonRuns[0] ?? sortedActivities.find(isMarathonEventRun) ?? latestRun;

  const calendar = useMemo(() => {
    if (!calendarMonth) {
      return {
        cells: [] as Array<{
          day: number | null;
          runs: Activity[];
          distance: number;
        }>,
        monthlyDistance: 0,
      };
    }

    const [year, month] = calendarMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDay = getMondayFirstDayIndex(new Date(year, month - 1, 1));
    const runsByDay = new Map<number, Activity[]>();
    const monthRuns =
      activityGroups.byMonth.get(calendarMonth) ?? EMPTY_ACTIVITIES;

    monthRuns.forEach((run) => {
      const day = Number(run.start_date_local.slice(8, 10));
      const runs = runsByDay.get(day) ?? [];
      runs.push(run);
      runsByDay.set(day, runs);
    });

    const cells = Array.from({ length: firstDay }, () => ({
      day: null,
      runs: [],
      distance: 0,
    }));

    for (let day = 1; day <= daysInMonth; day += 1) {
      const runs = runsByDay.get(day) ?? [];
      cells.push({
        day,
        runs,
        distance: totalDistance(runs),
      });
    }

    while (cells.length < 42) {
      cells.push({
        day: null,
        runs: [],
        distance: 0,
      });
    }

    return {
      cells,
      monthlyDistance: totalDistance(monthRuns),
    };
  }, [activityGroups, calendarMonth]);

  const monthlyChartYear = (
    calendarMonth ||
    latestMonth ||
    `${thisYear}-01`
  ).slice(0, 4);

  const monthlyBars = useMemo(() => {
    const year = Number(monthlyChartYear);
    const totals = Array.from({ length: 12 }, (_, index) => {
      const month = `${year}-${String(index + 1).padStart(2, '0')}`;
      return totalDistance(activityGroups.byMonth.get(month) ?? EMPTY_ACTIVITIES);
    });
    const max = Math.max(...totals, 1);
    return totals.map((value, index) => ({
      month: `${index + 1}月`,
      monthKey: `${year}-${String(index + 1).padStart(2, '0')}`,
      distanceLabel: formatMonthlyBarDistance(value),
      height: `${Math.max(4, (value / max) * 100)}%`,
      inRange: isMonthWithinActivityRange(
        `${year}-${String(index + 1).padStart(2, '0')}`
      ),
    }));
  }, [activityGroups, isMonthWithinActivityRange, monthlyChartYear]);
  const activeMonthlyBarKey =
    hoveredMonthKey ??
    previewedMonthlyBarKey ??
    calendarMonth ??
    latestMonth;
  const calendarSlideClass =
    calendarSlideDirection === 'backward'
      ? styles.calendarSlideBackward
      : calendarSlideDirection === 'forward'
        ? styles.calendarSlideForward
        : '';
  const monthlyChartSlideClass =
    monthlyChartSlideDirection === 'backward'
      ? styles.calendarSlideBackward
      : monthlyChartSlideDirection === 'forward'
        ? styles.calendarSlideForward
        : '';

  const monthKeyForSelectedMonthInYear = useCallback(
    (year: string) => {
      const selectedMonth = (
        calendarMonth ||
        latestMonth ||
        `${thisYear}-01`
      ).slice(5, 7);
      return clampMonthToActivityRange(`${year}-${selectedMonth}`);
    },
    [calendarMonth, clampMonthToActivityRange, latestMonth, thisYear]
  );

  const currentMonthlyChartYearNumber = Number(monthlyChartYear);
  const olderMonthlyChartYear =
    years
      .map(Number)
      .filter((year) => year < currentMonthlyChartYearNumber)
      .sort((a, b) => b - a)[0]
      ?.toString() ?? null;
  const newerMonthlyChartYear =
    years
      .map(Number)
      .filter((year) => year > currentMonthlyChartYearNumber)
      .sort((a, b) => a - b)[0]
      ?.toString() ?? null;
  const previousCalendarMonth = calendarMonth
    ? shiftMonthKey(calendarMonth, -1)
    : '';
  const nextCalendarMonth = calendarMonth
    ? shiftMonthKey(calendarMonth, 1)
    : '';
  const canGoToPreviousMonth = isMonthWithinActivityRange(previousCalendarMonth);
  const canGoToNextMonth = isMonthWithinActivityRange(nextCalendarMonth);

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
      setYearFilter(year);
      setPage(0);
      setSelectedRun(null);

      if (year === 'All' || calendarMonth.slice(0, 4) === year) {
        return;
      }

      changeCalendarMonth(monthKeyForSelectedMonthInYear(year));
    },
    [calendarMonth, changeCalendarMonth, monthKeyForSelectedMonthInYear]
  );

  const goToPreviousPage = () => setPage((current) => Math.max(0, current - 1));
  const goToNextPage = () =>
    setPage((current) => Math.min(pageCount - 1, current + 1));

  const renderMetricCards = () => (
    <>
      <MetricCard
        label="Total Distance"
        value={allDistance.toFixed(2)}
        unit={` ${DIST_UNIT}`}
        detailIcons={['bolt', 'clock']}
        details={[`${sortedActivities.length} runs`, formatDurationShort(allSeconds)]}
        stackDetails
        overlay="点击打开热力图"
        onClick={openHeatmap}
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

  const renderEventSummary = (id?: string) => (
    <button
      type="button"
      id={id}
      className={`${styles.panel} ${styles.eventPanel} ${
        isEventTouchRevealActive ? styles.cardTouchRevealActive : ''
      }`}
      {...eventTouchRevealHandlers}
    >
      <span className={styles.eventCount}>{marathonRuns.length}</span>
      <span className={styles.eventTitle}>
        <strong>Marathon Events</strong>
        <span>in {thisYear}</span>
      </span>
      <span className={styles.latestFinish}>
        <span>Latest Finish</span>
        <strong>{latestLongRun ? activityTitleForRun(latestLongRun) : '-'}</strong>
        <small>
          {latestLongRun
            ? latestLongRun.start_date_local.slice(0, 10).replaceAll('-', '/')
            : '-'}
        </small>
      </span>
      <span className={styles.cardOverlay}>点击打开赛事记录</span>
    </button>
  );

  const renderMapPanel = (
    className: string,
    height: number | string,
    id?: string
  ) => (
    <section id={id} className={className}>
      <RunMap
        viewState={viewState}
        geoData={selectedGeoData}
        setViewState={setMapViewState}
        height={height}
        onReady={handleMapReady}
      />
    </section>
  );

  const renderCalendarCell = (
    cell: (typeof calendar.cells)[number],
    index: number
  ) => {
    const isSelectedCell = Boolean(
      selectedRun && cell.runs.some((run) => run.run_id === selectedRun.run_id)
    );
    const calendarRun = isSelectedCell ? selectedRun : cell.runs[0] ?? null;
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
            <span>{cell.distance.toFixed(cell.distance >= 10 ? 0 : 1)} km</span>
          </span>
        ) : (
          <small>{cell.day}</small>
        )}
      </button>
    );
  };

  const renderCalendarPanel = () => (
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
        {calendar.cells.map(renderCalendarCell)}
      </div>
    </section>
  );

  const renderMonthlyBar = (bar: (typeof monthlyBars)[number]) => {
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
          if (bar.inRange && event.currentTarget.matches(':focus-visible')) {
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
  };

  const renderMonthlyChart = () => (
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
        {monthlyBars.map(renderMonthlyBar)}
      </div>
    </section>
  );

  const renderYearFilters = () => (
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
  );

  const renderActivityRow = (
    run: Activity,
    index: number,
    animationBaseDelay = 0
  ) => {
    const selected = selectedRun?.run_id === run.run_id;
    const [activityDate, activityTime = ''] = run.start_date_local.split(' ');
    const activityDisplayTime = activityTime.slice(0, 5);

    return (
      <tr
        key={run.run_id}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        className={`${styles.activityRow} ${selected ? styles.selectedRow : ''}`}
        style={{
          animationDelay: `${animationBaseDelay + index * ROW_FADE_STAGGER_MS}ms`,
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
        <td>{formatDuration(convertMovingTime2Sec(run.moving_time))}</td>
        <td>{formatPace(run.average_speed)}</td>
        <td>{run.average_heartrate ? Math.round(run.average_heartrate) : '-'}</td>
      </tr>
    );
  };

  const renderActivityTable = (
    runs: Activity[],
    tbodyKey: string,
    animationBaseDelay = 0,
    extraWrapClass = ''
  ) => (
    <div
      className={
        extraWrapClass
          ? `${styles.tableWrap} ${extraWrapClass}`
          : styles.tableWrap
      }
    >
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
        <tbody key={tbodyKey}>
          {runs.map((run, index) =>
            renderActivityRow(run, index, animationBaseDelay)
          )}
        </tbody>
      </table>
    </div>
  );

  const renderPagination = (
    currentPage: number,
    currentPageCount: number,
    onPrevious: () => void,
    onNext: () => void
  ) => (
    <div className={styles.pagination}>
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentPage === 0}
        aria-label="Previous page"
      >
        <ChevronIcon direction="left" />
      </button>
      <span>
        Page {currentPage + 1} of {currentPageCount}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage >= currentPageCount - 1}
        aria-label="Next page"
      >
        <ChevronIcon direction="right" />
      </button>
    </div>
  );

  return (
    <main className={styles.main}>
      <section className={styles.dashboardGrid}>
        <div className={styles.leftColumn}>
          <div className={styles.metricsGrid}>
            {renderMetricCards()}
          </div>

          <section id="activity-log" className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Activity Log</h2>
              <span>
                Showing{' '}
                {displayedActivities.length ? page * ROWS_PER_PAGE + 1 : 0}-
                {Math.min(
                  (page + 1) * ROWS_PER_PAGE,
                  displayedActivities.length
                )}{' '}
                of {displayedActivities.length}
              </span>
            </div>
            {renderYearFilters()}
            {renderActivityTable(
              pagedRuns,
              `${yearFilter}-${page}`,
              ROW_FADE_BASE_DELAY_MS
            )}
            {renderPagination(page, pageCount, goToPreviousPage, goToNextPage)}
          </section>
        </div>

        <aside className={styles.rightColumn}>
          {renderEventSummary('events')}
          {renderMapPanel(
            `${styles.panel} ${styles.mapPanel}`,
            MAP_PANEL_HEIGHT,
            'map-panel'
          )}
          {renderCalendarPanel()}
          {renderMonthlyChart()}
        </aside>
      </section>
    </main>
  );
};

const HeatmapView = ({
  years,
  sortedActivities,
}: {
  years: string[];
  sortedActivities: Activity[];
}) => {
  const totalStats = summarizeRuns(sortedActivities);
  const {
    previewedKey: previewedHeatmapKey,
    showTouchPreview: previewHeatmapCell,
  } = useTouchPreview<string>();
  const yearlyHeatmaps = useMemo(
    () =>
      years.map((yearLabel) => {
        const yearRuns = sortedActivities.filter((run) =>
          run.start_date_local.startsWith(yearLabel)
        );
        const year = Number(yearLabel);
        const runsByDate = new Map<string, Activity[]>();

        yearRuns.forEach((run) => {
          const date = run.start_date_local.slice(0, 10);
          const runs = runsByDate.get(date) ?? [];
          runs.push(run);
          runsByDate.set(date, runs);
        });

        const start = new Date(year, 0, 1);
        start.setDate(start.getDate() - getMondayFirstDayIndex(start));
        const end = new Date(year, 11, 31);
        end.setDate(end.getDate() + (6 - getMondayFirstDayIndex(end)));
        const dayCount =
          Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

        const cells = Array.from({ length: dayCount }, (_, index) => {
          const date = new Date(start);
          date.setDate(start.getDate() + index);
          const key = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const runs = runsByDate.get(key) ?? [];
          const distance = totalDistance(runs);
          return {
            key,
            date,
            distance,
            inYear: date.getFullYear() === year,
          };
        });

        return {
          year: yearLabel,
          stats: summarizeRuns(yearRuns),
          weekCount: dayCount / 7,
          cells,
        };
      }),
    [sortedActivities, years]
  );
  const previewHeatmapCellAtPoint = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') {
        return;
      }

      const element = document.elementFromPoint(
        event.clientX,
        event.clientY
      );
      const heatCell = element?.closest<HTMLElement>('[data-heat-key]');

      if (!heatCell) {
        return;
      }

      previewHeatmapCell(heatCell.dataset.heatKey);
    },
    [previewHeatmapCell]
  );

  return (
    <main className={styles.main}>
      <section className={styles.heatmapPage}>
        <div className={styles.heatmapPageHeader}>
          <div className={styles.heatmapTotalStats}>
            <span>
              <strong>{totalStats.count}</strong>
              <small>runs</small>
            </span>
            <span>
              <strong>{totalStats.distance.toFixed(0)}</strong>
              <small>km</small>
            </span>
            <span>
              <strong>{formatRoundedHours(totalStats.seconds)}</strong>
              <small>hours</small>
            </span>
          </div>
        </div>

        <div className={styles.heatmapYearList}>
          {yearlyHeatmaps.map((yearHeatmap) => (
            <section
              key={yearHeatmap.year}
              className={`${styles.panel} ${styles.heatmapYearBlock}`}
            >
              <div className={styles.heatmapYearHeader}>
                <strong>{yearHeatmap.year}</strong>
                <div className={styles.heatStats}>
                  <div className={styles.heatStatsPrimary}>
                    <span>{yearHeatmap.stats.count} runs</span>
                    <span>{yearHeatmap.stats.distance.toFixed(0)} km</span>
                    <span>{formatDurationShort(yearHeatmap.stats.seconds)}</span>
                  </div>
                  <div className={styles.heatStatsSecondary}>
                    <span>{yearHeatmap.stats.avgPace} /km</span>
                    <span>{yearHeatmap.stats.avgHeartRate || '-'} bpm</span>
                  </div>
                </div>
              </div>
              <div className={styles.heatmapWrap}>
                <div
                  className={styles.yearHeatmap}
                  style={{ aspectRatio: `${yearHeatmap.weekCount} / 7` }}
                  onPointerMove={previewHeatmapCellAtPoint}
                >
                  {yearHeatmap.cells.map((cell) => (
                    <span
                      key={cell.key}
                      className={`${styles.heatCell} ${
                        !cell.inYear
                          ? styles.heatOutside
                          : cell.distance === 0
                            ? styles.heatEmpty
                            : cell.distance < 5
                              ? styles.heatLevelOne
                              : cell.distance < 10
                                ? styles.heatLevelTwo
                                : cell.distance < 20
                                  ? styles.heatLevelThree
                                  : styles.heatLevelFour
                      } ${
                        previewedHeatmapKey === cell.key
                          ? styles.heatCellPreviewed
                          : ''
                      }`}
                      data-heat-key={cell.inYear ? cell.key : undefined}
                      title={`${cell.key}: ${cell.distance.toFixed(2)} km`}
                      onPointerDown={(event) => {
                        if (event.pointerType !== 'mouse' && cell.inYear) {
                          previewHeatmapCell(cell.key);
                        }
                      }}
                      onPointerEnter={(event) => {
                        if (event.pointerType !== 'mouse' && cell.inYear) {
                          previewHeatmapCell(cell.key);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
};

const EventsView = ({ sortedActivities }: { sortedActivities: Activity[] }) => {
  const [selectedEvent, setSelectedEvent] = useState<Activity | null>(null);
  const [isEventModalClosing, setIsEventModalClosing] = useState(false);
  const {
    previewedKey: previewedEventId,
    showTouchPreview: previewEventCard,
    clearTouchPreview: clearEventCardPreview,
  } = useTouchPreview<number>();
  const [eventModalMapViewport, setEventModalMapViewport] = useState(
    getEventModalMapViewport
  );
  const eventModalExitTimeoutRef = useRef<number | null>(null);
  const eventScrollLockRef = useRef<{
    scrollY: number;
    bodyPosition: string;
    bodyTop: string;
    bodyWidth: string;
  } | null>(null);
  const isEventModalOpen = selectedEvent !== null;
  const eventRuns = useMemo(
    () => sortedActivities.filter(isMarathonEventRun),
    [sortedActivities]
  );
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, Activity[]>();
    eventRuns.forEach((run) => {
      const year = run.start_date_local.slice(0, 4);
      groups.set(year, [...(groups.get(year) ?? []), run]);
    });
    return [...groups.entries()].sort(([a], [b]) => Number(b) - Number(a));
  }, [eventRuns]);
  const eventPbLabels = useMemo(() => {
    const bestByCategory = new Map<
      RacePbCategory,
      { run: Activity; seconds: number }
    >();

    eventRuns.forEach((run) => {
      const category = getRacePbCategory(run);
      const seconds = convertMovingTime2Sec(run.moving_time);

      if (!category || seconds <= 0) {
        return;
      }

      const currentBest = bestByCategory.get(category);
      if (!currentBest || seconds < currentBest.seconds) {
        bestByCategory.set(category, { run, seconds });
      }
    });

    const labels = new Map<number, string>();
    const halfPb = bestByCategory.get('half');
    const fullPb = bestByCategory.get('full');

    if (halfPb) {
      labels.set(halfPb.run.run_id, 'PB');
    }
    if (fullPb) {
      labels.set(fullPb.run.run_id, 'PB');
    }

    return labels;
  }, [eventRuns]);

  const modalGeoData = useMemo(
    () => geoJsonForRuns(selectedEvent ? [selectedEvent] : []),
    [selectedEvent]
  );
  const modalViewState = useMemo(
    () => getEventModalViewState(selectedEvent, eventModalMapViewport),
    [eventModalMapViewport, selectedEvent]
  );
  const ignoreModalViewStateUpdate = useCallback(() => undefined, []);
  const clearEventModalExitTimeout = useCallback(() => {
    if (eventModalExitTimeoutRef.current) {
      window.clearTimeout(eventModalExitTimeoutRef.current);
      eventModalExitTimeoutRef.current = null;
    }
  }, []);
  const openEventModal = useCallback(
    (run: Activity) => {
      clearEventCardPreview();
      clearEventModalExitTimeout();
      setIsEventModalClosing(false);
      setSelectedEvent(run);
    },
    [clearEventCardPreview, clearEventModalExitTimeout]
  );
  const previewEventCardAtPoint = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse') {
        return;
      }

      const element = document.elementFromPoint(
        event.clientX,
        event.clientY
      );
      const eventCard = element?.closest<HTMLButtonElement>('[data-event-id]');
      const eventId = Number(eventCard?.dataset.eventId);

      if (!Number.isFinite(eventId)) {
        return;
      }

      previewEventCard(eventId);
    },
    [previewEventCard]
  );
  const closeEventModal = useCallback(() => {
    if (!selectedEvent || isEventModalClosing) {
      return;
    }

    setIsEventModalClosing(true);
    eventModalExitTimeoutRef.current = window.setTimeout(() => {
      setSelectedEvent(null);
      setIsEventModalClosing(false);
      eventModalExitTimeoutRef.current = null;
    }, EVENT_MODAL_EXIT_DURATION_MS);
  }, [isEventModalClosing, selectedEvent]);
  const eventModalTitleId = selectedEvent
    ? `event-modal-title-${selectedEvent.run_id}`
    : undefined;

  useEffect(
    () => () => {
      clearEventModalExitTimeout();
    },
    [clearEventModalExitTimeout]
  );

  useEffect(() => {
    if (!isEventModalOpen) {
      return undefined;
    }

    const updateEventModalMapViewport = () => {
      setEventModalMapViewport(getEventModalMapViewport());
    };

    updateEventModalMapViewport();
    window.addEventListener('resize', updateEventModalMapViewport);

    return () => {
      window.removeEventListener('resize', updateEventModalMapViewport);
    };
  }, [isEventModalOpen]);

  useEffect(() => {
    if (!isEventModalOpen || eventScrollLockRef.current) {
      return undefined;
    }

    const bodyStyle = document.body.style;
    const scrollY = window.scrollY;

    eventScrollLockRef.current = {
      scrollY,
      bodyPosition: bodyStyle.position,
      bodyTop: bodyStyle.top,
      bodyWidth: bodyStyle.width,
    };

    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.width = '100%';

    return () => {
      const lock = eventScrollLockRef.current;

      if (!lock) {
        return;
      }

      bodyStyle.position = lock.bodyPosition;
      bodyStyle.top = lock.bodyTop;
      bodyStyle.width = lock.bodyWidth;
      eventScrollLockRef.current = null;
      window.scrollTo(0, lock.scrollY);
    };
  }, [isEventModalOpen]);

  useEffect(() => {
    if (!isEventModalOpen) {
      return undefined;
    }

    const handleModalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeEventModal();
      }
    };

    window.addEventListener('keydown', handleModalKeyDown);

    return () => {
      window.removeEventListener('keydown', handleModalKeyDown);
    };
  }, [closeEventModal, isEventModalOpen]);

  return (
    <main className={`${styles.main} ${styles.eventsMain}`}>
      <section className={styles.eventGroups}>
        {groupedEvents.map(([year, runs]) => (
          <div key={year} className={styles.eventYearGroup}>
            <div className={styles.eventYearHeader}>
              <strong>{year}</strong>
              <span>赛季</span>
            </div>
            <div
              className={styles.eventCards}
              onPointerMove={previewEventCardAtPoint}
            >
              {runs.map((run) =>
                (() => {
                  const pbLabel = eventPbLabels.get(run.run_id);

                  return (
                    <button
                      key={run.run_id}
                      type="button"
                      className={`${styles.eventCard} ${
                        pbLabel ? styles.eventCardPb : ''
                      } ${
                        previewedEventId === run.run_id
                          ? styles.eventCardPreviewed
                          : ''
                      }`}
                      data-event-id={run.run_id}
                      onPointerDown={(event) => {
                        if (event.pointerType !== 'mouse') {
                          previewEventCard(run.run_id);
                        }
                      }}
                      onPointerEnter={(event) => {
                        if (event.pointerType !== 'mouse') {
                          previewEventCard(run.run_id);
                        }
                      }}
                      onClick={() => openEventModal(run)}
                    >
                      <EventRouteBackground run={run} />
                      {pbLabel && (
                        <span className={styles.eventPbBadge}>
                          <EventPbMedalIcon />
                          {pbLabel}
                        </span>
                      )}
                      <span>{run.start_date_local.slice(0, 10)}</span>
                      <strong>{activityTitleForRun(run)}</strong>
                      <small>
                        {(run.distance / M_TO_DIST).toFixed(2)} km ·{' '}
                        {formatPace(run.average_speed)}
                      </small>
                    </button>
                  );
                })()
              )}
            </div>
          </div>
        ))}
      </section>
      {selectedEvent && (
        <div
          className={`${styles.modalBackdrop} ${
            isEventModalClosing ? styles.modalBackdropClosing : ''
          }`}
          onClick={closeEventModal}
        >
          <div
            className={`${styles.eventModal} ${
              isEventModalClosing ? styles.eventModalClosing : ''
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={eventModalTitleId}
            onClick={(event) => event.stopPropagation()}
          >
            <small>{selectedEvent.start_date_local.slice(0, 10)}</small>
            <strong id={eventModalTitleId}>
              {activityTitleForRun(selectedEvent)}
            </strong>
            <span>
              {(selectedEvent.distance / M_TO_DIST).toFixed(2)} km ·{' '}
              {formatDuration(convertMovingTime2Sec(selectedEvent.moving_time))}
            </span>
            <span className={styles.eventModalMap}>
              <RunMap
                viewState={modalViewState}
                geoData={modalGeoData}
                setViewState={ignoreModalViewStateUpdate}
                height={EVENT_MODAL_MAP_HEIGHT}
                animateCamera={false}
              />
            </span>
          </div>
        </div>
      )}
    </main>
  );
};

const NextDashboard = ({ view }: NextDashboardProps) => {
  const location = useLocation();
  const currentView = view ?? dashboardViewForPath(location.pathname);
  const { activities, years, thisYear } = useActivities();
  const sortedActivities = useMemo(
    () => activities.slice().sort(sortDateFunc),
    [activities]
  );
  const latestRun = sortedActivities[0] ?? null;

  useEffect(() => {
    document.documentElement.lang = 'en';
    document.documentElement.setAttribute('data-theme', 'dark');
    document.title = 'Running Page';
  }, []);

  if (currentView === 'redirect-events') {
    return <Navigate to="/events" replace />;
  }

  if (currentView === 'not-found') {
    return <NotFoundPage />;
  }

  return (
    <PageShell thisYear={thisYear}>
      {currentView === 'home' && (
        <HomeView
          years={years}
          thisYear={thisYear}
          sortedActivities={sortedActivities}
          latestRun={latestRun}
        />
      )}
      {currentView === 'heatmap' && (
        <HeatmapView years={years} sortedActivities={sortedActivities} />
      )}
      {currentView === 'events' && (
        <EventsView sortedActivities={sortedActivities} />
      )}
    </PageShell>
  );
};

export default NextDashboard;
