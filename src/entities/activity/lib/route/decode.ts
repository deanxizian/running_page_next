import * as mapboxPolyline from '@mapbox/polyline';
import type { Activity, Coordinate } from '../../model/types';
import { locationForRun } from '../location';

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

export { pathForRun };
