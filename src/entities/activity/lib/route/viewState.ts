import { WebMercatorViewport } from '@math.gl/web-mercator';
import type { Activity, Coordinate, IViewState } from '../../model/types';
import { pathForRun } from './decode';

const EVENT_MODAL_MAP_HEIGHT = 260;
const EVENT_MODAL_MAP_MAX_WIDTH = 620;
const EVENT_MODAL_MAP_MIN_WIDTH = 260;
const EVENT_MODAL_MAP_HORIZONTAL_CHROME = 96;

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
  getEventModalMapViewport,
  getEventModalViewState,
  getIntroViewState,
  viewStatesNearlyEqual,
};
