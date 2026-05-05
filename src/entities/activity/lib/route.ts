import * as mapboxPolyline from '@mapbox/polyline';
import { WebMercatorViewport } from '@math.gl/web-mercator';
import type {
  FeatureCollection,
  Feature,
  GeoJsonProperties,
  LineString,
} from '@/types/geojson';
import type { Activity, Coordinate, IViewState } from '../model/types';
import type { RPGeometry } from '@/static/run_countries';
import { SINGLE_RUN_COLOR_DARK } from '@/utils/const';
import { locationForRun } from './location';

const MAP_FIT_MARGIN_RATIO = 0.14;
const MAP_FIT_MIN_MARGIN = 0.0025;
const MAP_FIT_PADDING = 155;
const MAP_TARGET_ZOOM_PULLBACK = 0.14;
const EVENT_MODAL_MAP_HEIGHT = 260;
const EVENT_MODAL_MAP_MAX_WIDTH = 620;
const EVENT_MODAL_MAP_MIN_WIDTH = 260;
const EVENT_MODAL_MAP_HORIZONTAL_CHROME = 96;

const pathCache = new Map<
  number,
  {
    summaryPolyline: string;
    path: Coordinate[];
  }
>();

const isValidCoordinate = (
  coordinate: Coordinate | null | undefined
): coordinate is Coordinate =>
  Boolean(coordinate) &&
  Number.isFinite(coordinate![0]) &&
  Number.isFinite(coordinate![1]);

const pathForRun = (run: Activity): Coordinate[] => {
  const summaryPolyline = run.summary_polyline ?? '';

  if (!summaryPolyline) {
    pathCache.delete(run.run_id);
    return [];
  }

  const cached = pathCache.get(run.run_id);
  if (cached?.summaryPolyline === summaryPolyline) {
    return cached.path;
  }

  try {
    const coordinates = mapboxPolyline.decode(summaryPolyline) as Coordinate[];
    coordinates.forEach((arr) => {
      [arr[0], arr[1]] = [arr[1], arr[0]];
    });

    if (
      coordinates.length === 2 &&
      String(coordinates[0]) === String(coordinates[1])
    ) {
      const { coordinate } = locationForRun(run);
      if (isValidCoordinate(coordinate)) {
        const path = [coordinate, coordinate] as Coordinate[];
        pathCache.set(run.run_id, { summaryPolyline, path });
        return path;
      }
    }

    pathCache.set(run.run_id, { summaryPolyline, path: coordinates });
    return coordinates;
  } catch {
    pathCache.delete(run.run_id);
    return [];
  }
};

const geoJsonForRuns = (runs: Activity[]): FeatureCollection<LineString> => {
  const features = runs.flatMap((run) => {
    const coordinates = pathForRun(run);

    if (coordinates.length < 2) {
      return [];
    }

    return [
      {
        type: 'Feature',
        properties: {
          runId: run.run_id,
          color: SINGLE_RUN_COLOR_DARK,
          indoor: run.subtype === 'indoor' || run.subtype === 'treadmill',
        },
        geometry: {
          type: 'LineString',
          coordinates,
        },
      } satisfies Feature<LineString>,
    ];
  });

  return {
    type: 'FeatureCollection',
    features,
  };
};

const geoJsonForMap = async (): Promise<FeatureCollection<RPGeometry>> => {
  const [{ chinaGeojson }, worldGeoJson] = await Promise.all([
    import('@/static/run_countries'),
    import('@surbowl/world-geo-json-zh/world.zh.json'),
  ]);

  return {
    type: 'FeatureCollection',
    features: [
      ...worldGeoJson.default.features,
      ...chinaGeojson.features,
    ] as Feature<RPGeometry, GeoJsonProperties>[],
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
    features: data.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        dimmed: !primaryRunIds.has(feature.properties?.runId as number),
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
  pathForRun,
  geoJsonForRuns,
  geoJsonForMap,
  getRoutePath,
  emphasizePrimaryRuns,
  getBoundsForRuns,
  getIntroViewState,
  viewStatesNearlyEqual,
  getEventModalMapViewport,
  getEventModalViewState,
};
