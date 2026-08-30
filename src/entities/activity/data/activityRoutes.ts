import type { Activity } from '../model/types';

type ActivityRouteMap = Readonly<Record<string, string>>;

const parseActivityRoutes = (value: unknown): ActivityRouteMap => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Activity route data must contain an object.');
  }

  for (const [runId, summaryPolyline] of Object.entries(value)) {
    if (
      !/^\d+$/.test(runId) ||
      Number(runId) <= 0 ||
      typeof summaryPolyline !== 'string' ||
      !summaryPolyline
    ) {
      throw new Error(`Invalid activity route for ${runId}.`);
    }
  }

  return value as ActivityRouteMap;
};

const attachActivityRoutes = (
  activities: Activity[],
  routes: ActivityRouteMap
): Activity[] =>
  activities.map((activity) => {
    const summaryPolyline = routes[String(activity.run_id)] ?? '';

    if ((activity.summary_polyline ?? '') === summaryPolyline) {
      return activity;
    }

    return {
      ...activity,
      summary_polyline: summaryPolyline,
    };
  });

export { attachActivityRoutes, parseActivityRoutes };
export type { ActivityRouteMap };
