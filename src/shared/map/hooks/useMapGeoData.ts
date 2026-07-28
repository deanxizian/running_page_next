import { useEffect, useMemo, useState } from 'react';
import { geoJsonForMap } from '@/entities/activity/lib/route';
import type { FeatureCollection } from '@/types/geojson';
import type { RPGeometry } from '@/static/run_countries';
import { combinedMapGeoDataFor, shouldLoadMapData } from '../lib/geojson';

type UseMapGeoDataParams = {
  geoData: FeatureCollection<RPGeometry>;
  isBigMap: boolean;
};

let mapDataPromise: Promise<FeatureCollection<RPGeometry>> | null = null;

const loadMapData = () => {
  if (!mapDataPromise) {
    mapDataPromise = geoJsonForMap().catch((error: unknown) => {
      mapDataPromise = null;
      throw error;
    });
  }

  return mapDataPromise;
};

const useMapGeoData = ({ geoData, isBigMap }: UseMapGeoDataParams) => {
  const [mapGeoData, setMapGeoData] =
    useState<FeatureCollection<RPGeometry> | null>(null);

  useEffect(() => {
    if (!shouldLoadMapData(isBigMap, Boolean(mapGeoData))) {
      return;
    }

    let cancelled = false;
    loadMapData()
      .then((data) => {
        if (!cancelled) {
          setMapGeoData(data);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isBigMap, mapGeoData]);

  return useMemo(
    () => combinedMapGeoDataFor(geoData, mapGeoData, isBigMap),
    [geoData, isBigMap, mapGeoData]
  );
};

export { useMapGeoData };
