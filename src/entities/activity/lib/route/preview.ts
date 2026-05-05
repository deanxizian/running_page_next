import type { Activity } from '../../model/types';
import { pathForRun } from './decode';

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

export { getRoutePath };
