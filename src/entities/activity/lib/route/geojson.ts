import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  LineString,
} from '@/types/geojson';
import type { RPGeometry } from '@/static/run_countries';
import { SINGLE_RUN_COLOR_DARK } from '@/shared/theme/colors';
import type { Activity } from '../../model/types';
import { pathForRun } from './decode';
import { getFocusedRouteBounds } from './bounds';

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

export { emphasizePrimaryRuns, geoJsonForMap, geoJsonForRuns };
