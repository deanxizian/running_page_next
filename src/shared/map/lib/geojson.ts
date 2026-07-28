import type { FilterSpecification } from 'maplibre-gl';
import type { FeatureCollection } from '@/types/geojson';
import type { RPGeometry } from '@/static/run_countries';

const shouldLoadLocalizedMapData = (
  isBigMap: boolean,
  isChineseLocale: boolean,
  hasLoadedMapData: boolean
) => isBigMap && isChineseLocale && !hasLoadedMapData;

const combinedMapGeoDataFor = (
  geoData: FeatureCollection<RPGeometry>,
  mapGeoData: FeatureCollection<RPGeometry> | null,
  isBigMap: boolean,
  isChineseLocale: boolean
): FeatureCollection<RPGeometry> => {
  if (isBigMap && isChineseLocale && mapGeoData) {
    return {
      type: 'FeatureCollection',
      features: geoData.features.concat(mapGeoData.features),
    };
  }

  return geoData;
};

const isSingleRunGeoData = (geoData: FeatureCollection<RPGeometry>) =>
  geoData.features.length === 1 &&
  geoData.features[0].geometry.coordinates.length > 0;

const filterExpressionFor = (names: string[]): FilterSpecification =>
  ['in', 'name', ...names] as FilterSpecification;

export {
  combinedMapGeoDataFor,
  filterExpressionFor,
  isSingleRunGeoData,
  shouldLoadLocalizedMapData,
};
