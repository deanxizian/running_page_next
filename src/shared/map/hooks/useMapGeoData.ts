import { useEffect, useMemo, useState } from 'react';
import { geoJsonForMap } from '@/entities/activity/lib/route';
import type { FeatureCollection } from '@/types/geojson';
import type { RPGeometry } from '@/static/run_countries';
import {
  combinedMapGeoDataFor,
  shouldLoadLocalizedMapData,
} from '../lib/geojson';

type UseMapGeoDataParams = {
  geoData: FeatureCollection<RPGeometry>;
  isBigMap: boolean;
  isChineseLocale: boolean;
};

const useMapGeoData = ({
  geoData,
  isBigMap,
  isChineseLocale,
}: UseMapGeoDataParams) => {
  const [mapGeoData, setMapGeoData] =
    useState<FeatureCollection<RPGeometry> | null>(null);
  const [isLoadingMapData, setIsLoadingMapData] = useState(false);

  useEffect(() => {
    if (
      !shouldLoadLocalizedMapData(
        isBigMap,
        isChineseLocale,
        Boolean(mapGeoData),
        isLoadingMapData
      )
    ) {
      return;
    }

    setIsLoadingMapData(true);
    geoJsonForMap()
      .then((data) => {
        setMapGeoData(data);
        setIsLoadingMapData(false);
      })
      .catch(() => {
        setIsLoadingMapData(false);
      });
  }, [isBigMap, isChineseLocale, isLoadingMapData, mapGeoData]);

  return useMemo(
    () => combinedMapGeoDataFor(geoData, mapGeoData, isBigMap, isChineseLocale),
    [geoData, isBigMap, isChineseLocale, mapGeoData]
  );
};

export { useMapGeoData };
