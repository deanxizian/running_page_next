import { WebMercatorViewport } from '@math.gl/web-mercator';
import type { Activity, Coordinate, IViewState } from '../../model/types';
import { pathForRun } from './decode';

const MAP_FIT_MARGIN_RATIO = 0.14;
const MAP_FIT_MIN_MARGIN = 0.0025;
const MAP_FIT_PADDING = 155;
const MAP_TARGET_ZOOM_PULLBACK = 0.14;

type FocusedRouteBounds = {
  runId: number;
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
  centerLng: number;
  centerLat: number;
};

const getFocusedRouteBounds = (runs: Activity[]) => {
  const routeBounds: FocusedRouteBounds[] = [];
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

export { getBoundsForRuns, getFocusedRouteBounds };
