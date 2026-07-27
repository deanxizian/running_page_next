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

let localizedMapDataPromise: Promise<FeatureCollection<RPGeometry>> | null =
  null;

const loadLocalizedMapData = () => {
  if (!localizedMapDataPromise) {
    localizedMapDataPromise = geoJsonForMap().catch((error: unknown) => {
      localizedMapDataPromise = null;
      throw error;
    });
  }

  return localizedMapDataPromise;
};

const useMapGeoData = ({
  geoData,
  isBigMap,
  isChineseLocale,
}: UseMapGeoDataParams) => {
  const [mapGeoData, setMapGeoData] =
    useState<FeatureCollection<RPGeometry> | null>(null);

  useEffect(() => {
    if (
      !shouldLoadLocalizedMapData(
        isBigMap,
        isChineseLocale,
        Boolean(mapGeoData)
      )
    ) {
      return;
    }

    let cancelled = false;
    loadLocalizedMapData()
      .then((data) => {
        if (!cancelled) {
          setMapGeoData(data);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isBigMap, isChineseLocale, mapGeoData]);

  return useMemo(
    () => combinedMapGeoDataFor(geoData, mapGeoData, isBigMap, isChineseLocale),
    [geoData, isBigMap, isChineseLocale, mapGeoData]
  );
};

export { useMapGeoData };
