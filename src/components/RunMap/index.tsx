import React, {
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from 'react';
import Map, {
  Layer,
  Source,
  MapRef,
} from 'react-map-gl';
import type { MapInstance } from 'react-map-gl/src/types/lib';
import useActivities from '@/hooks/useActivities';
import {
  IS_CHINESE,
  MAPBOX_TOKEN,
  PROVINCE_FILL_COLOR,
  COUNTRY_FILL_COLOR,
  LINE_OPACITY,
  MAP_STYLE_URL,
  SINGLE_RUN_COLOR_DARK,
} from '@/utils/const';
import {
  IViewState,
  geoJsonForMap,
} from '@/utils/utils';
import styles from './style.module.css';
import type { FeatureCollection } from '@/types/geojson';
import { RPGeometry } from '@/static/run_countries';
import './mapbox.css';

interface IRunMapProps {
  viewState: IViewState;
  setViewState: (_viewState: IViewState) => void;
  geoData: FeatureCollection<RPGeometry>;
  height?: number | string;
  onReady?: () => void;
  animateCamera?: boolean;
}

const RUNNING_LAYER_IDS = new Set([
  'province',
  'countries',
  'runs2',
  'runs2-indoor',
]);
const ROUTE_LAYER_IDS = new Set(['runs2', 'runs2-indoor']);
const DEFAULT_MAP_HEIGHT = 600;

type MapStyleLayer = {
  id: string;
  type?: string;
  layout?: Record<string, unknown>;
};

const CAMERA_TRANSITION_MS = 1080;

const easeOutCamera = (progress: number) =>
  1 - Math.pow(1 - Math.min(1, Math.max(0, progress)), 3.1);

const cameraValue = (value: number | undefined) =>
  Number.isFinite(value) ? value! : null;

const setBasePaintProperty = (
  map: MapInstance,
  layerId: string,
  property: string,
  value: unknown
) => {
  try {
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, property, value as any);
    }
  } catch {
    // Third-party styles differ by layer type. Unsupported paint properties can be ignored.
  }
};

const softenMapBaseLayers = (map: MapInstance) => {
  let styleJson;

  try {
    styleJson = map.getStyle();
  } catch {
    return;
  }

  const layers = styleJson.layers as MapStyleLayer[] | undefined;

  if (!layers?.length) {
    return;
  }

  layers.forEach((layer) => {
    if (RUNNING_LAYER_IDS.has(layer.id)) {
      return;
    }

    const layerId = layer.id.toLowerCase();
    const isRoad =
      layerId.includes('road') ||
      layerId.includes('bridge') ||
      layerId.includes('tunnel') ||
      layerId.includes('aeroway');
    const isWater = layerId.includes('water');
    const isBoundary = layerId.includes('boundary');
    const isBuilding = layerId.includes('building');
    const isLand =
      layerId.includes('land') ||
      layerId.includes('park') ||
      layerId.includes('place');

    if (layer.type === 'background') {
      setBasePaintProperty(map, layer.id, 'background-color', '#202124');
      setBasePaintProperty(map, layer.id, 'background-opacity', 1);
      return;
    }

    if (layer.type === 'fill') {
      if (isWater) {
        setBasePaintProperty(map, layer.id, 'fill-color', '#22272c');
        setBasePaintProperty(map, layer.id, 'fill-opacity', 0.46);
        return;
      }

      setBasePaintProperty(map, layer.id, 'fill-color', '#202124');
      setBasePaintProperty(
        map,
        layer.id,
        'fill-opacity',
        isBuilding ? 0.16 : 0.72
      );
      return;
    }

    if (layer.type === 'line') {
      if (isRoad) {
        setBasePaintProperty(map, layer.id, 'line-color', '#626771');
        setBasePaintProperty(map, layer.id, 'line-opacity', 0.52);
        return;
      }

      if (isWater) {
        setBasePaintProperty(map, layer.id, 'line-color', '#2f3941');
        setBasePaintProperty(map, layer.id, 'line-opacity', 0.22);
        return;
      }

      setBasePaintProperty(map, layer.id, 'line-color', '#3b3d43');
      setBasePaintProperty(
        map,
        layer.id,
        'line-opacity',
        isBoundary ? 0.26 : 0.22
      );
      return;
    }

    if (layer.type === 'symbol') {
      setBasePaintProperty(
        map,
        layer.id,
        'text-color',
        isRoad ? '#9aa0a8' : isLand ? '#858990' : '#747981'
      );
      setBasePaintProperty(map, layer.id, 'text-halo-color', '#202124');
      setBasePaintProperty(map, layer.id, 'text-opacity', isRoad ? 0.5 : 0.42);
      setBasePaintProperty(map, layer.id, 'icon-opacity', 0.28);
    }
  });
};

const showBaseLayers = (map: MapInstance) => {
  let styleJson;

  try {
    styleJson = map.getStyle();
  } catch {
    return;
  }

  styleJson.layers.forEach((layer: { id: string }) => {
    try {
      if (!ROUTE_LAYER_IDS.has(layer.id) && map.getLayer(layer.id)) {
        map.setLayoutProperty(layer.id, 'visibility', 'visible');
      }
    } catch {
      // Third-party styles can change while data events are still firing.
    }
  });
};

const RunMap = ({
  viewState,
  setViewState,
  geoData,
  height,
  onReady,
  animateCamera = true,
}: IRunMapProps) => {
  const { countries, provinces } = useActivities();
  const mapRef = useRef<MapRef>(null);
  const isProgrammaticMoveRef = useRef(false);
  const cameraAnimationTimeoutRef = useRef<number | null>(null);
  const mapDataListenerCleanupRef = useRef<(() => void) | null>(null);
  const hasNotifiedReadyRef = useRef(false);
  const [mapGeoData, setMapGeoData] =
    useState<FeatureCollection<RPGeometry> | null>(null);
  const [isLoadingMapData, setIsLoadingMapData] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();

      // Track tile loading errors
      let tileErrorCount = 0;
      const MAX_TILE_ERRORS = 10;

      const handleStyleError = () => {
        setMapError(
          'Map tiles failed to load. Please check your internet connection.'
        );
      };

      const handleTileError = () => {
        tileErrorCount++;

        if (tileErrorCount === MAX_TILE_ERRORS) {
          setMapError(
            'Map tiles failed to load. Please check your internet connection.'
          );
        }
      };

      map.on('error', handleStyleError);
      map.on('tileerror', handleTileError);

      // Cleanup
      return () => {
        map.off('error', handleStyleError);
        map.off('tileerror', handleTileError);
      };
    }
  }, [mapRef]);

  // Memoize filter arrays to prevent recreating them on every render
  const filterProvinces = useMemo(() => {
    const filtered = provinces.slice();
    filtered.unshift('in', 'name');
    return filtered;
  }, [provinces]);

  const filterCountries = useMemo(() => {
    const filtered = countries.slice();
    filtered.unshift('in', 'name');
    return filtered;
  }, [countries]);

  const clearMapDataListener = useCallback(() => {
    mapDataListenerCleanupRef.current?.();
    mapDataListenerCleanupRef.current = null;
  }, []);

  const mapRefCallback = useCallback(
    (ref: MapRef | null) => {
      clearMapDataListener();

      if (ref === null) {
        mapRef.current = null;
        return;
      }

      mapRef.current = ref;
      const map = ref.getMap();
      const handleStyleData = (event: { dataType?: string }) => {
        if (event.dataType !== 'style') {
          return;
        }
        softenMapBaseLayers(map);
        showBaseLayers(map);
      };

      map.on('data', handleStyleData);
      mapDataListenerCleanupRef.current = () => {
        map.off('data', handleStyleData);
      };

      softenMapBaseLayers(map);
      showBaseLayers(map);
    },
    [clearMapDataListener]
  );

  const isBigMap = (viewState.zoom ?? 0) <= 3;

  useEffect(() => {
    if (isBigMap && IS_CHINESE && !mapGeoData && !isLoadingMapData) {
      setIsLoadingMapData(true);
      geoJsonForMap()
        .then((data) => {
          setMapGeoData(data);
          setIsLoadingMapData(false);
        })
        .catch(() => {
          setIsLoadingMapData(false);
        });
    }
  }, [isBigMap, IS_CHINESE, mapGeoData, isLoadingMapData]);

  const combinedGeoData = useMemo<FeatureCollection<RPGeometry>>(() => {
    if (isBigMap && IS_CHINESE && mapGeoData) {
      return {
        type: 'FeatureCollection',
        features: geoData.features.concat(mapGeoData.features),
      };
    }

    return geoData;
  }, [geoData, isBigMap, mapGeoData]);

  const isSingleRun =
    geoData.features.length === 1 &&
    geoData.features[0].geometry.coordinates.length > 0;

  const handleMapLoad = useCallback(() => {
    if (hasNotifiedReadyRef.current) {
      return;
    }

    const notifyReady = () => {
      if (hasNotifiedReadyRef.current) {
        return;
      }
      hasNotifiedReadyRef.current = true;
      onReady?.();
    };

    const map = mapRef.current?.getMap();
    if (!map) {
      notifyReady();
      return;
    }

    const fallbackTimer = window.setTimeout(notifyReady, 500);
    map.once('idle', () => {
      window.clearTimeout(fallbackTimer);
      notifyReady();
    });
  }, [onReady]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }

    const targetLongitude = cameraValue(viewState.longitude);
    const targetLatitude = cameraValue(viewState.latitude);
    const targetZoom = cameraValue(viewState.zoom);

    if (
      targetLongitude === null ||
      targetLatitude === null ||
      targetZoom === null
    ) {
      return;
    }

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const centerLatitude =
      ((currentCenter.lat + targetLatitude) / 2) * (Math.PI / 180);
    const centerDelta = Math.hypot(
      (currentCenter.lng - targetLongitude) * Math.cos(centerLatitude),
      currentCenter.lat - targetLatitude
    );
    const zoomDelta = Math.abs(currentZoom - targetZoom);

    if (centerDelta < 0.0001 && zoomDelta < 0.01) {
      return;
    }

    if (cameraAnimationTimeoutRef.current) {
      window.clearTimeout(cameraAnimationTimeoutRef.current);
      cameraAnimationTimeoutRef.current = null;
    }

    isProgrammaticMoveRef.current = true;
    map.stop();

    const targetViewState = {
      ...viewState,
      longitude: targetLongitude,
      latitude: targetLatitude,
      zoom: targetZoom,
    };

    const finishCameraMove = () => {
      if (!isProgrammaticMoveRef.current) {
        return;
      }

      isProgrammaticMoveRef.current = false;
      setViewState(targetViewState);
    };

    if (!animateCamera) {
      map.jumpTo({
        center: [targetLongitude, targetLatitude],
        zoom: targetZoom,
      });
      finishCameraMove();
      return;
    }

    map.once('moveend', finishCameraMove);
    map.easeTo({
      center: [targetLongitude, targetLatitude],
      zoom: targetZoom,
      duration: CAMERA_TRANSITION_MS,
      easing: easeOutCamera,
      essential: true,
    });

    cameraAnimationTimeoutRef.current = window.setTimeout(() => {
      map.off('moveend', finishCameraMove);
      finishCameraMove();
    }, CAMERA_TRANSITION_MS + 120);

    return () => {
      map.off('moveend', finishCameraMove);
      if (cameraAnimationTimeoutRef.current) {
        window.clearTimeout(cameraAnimationTimeoutRef.current);
        cameraAnimationTimeoutRef.current = null;
      }
    };
  }, [
    animateCamera,
    setViewState,
    viewState,
    viewState.latitude,
    viewState.longitude,
    viewState.zoom,
  ]);

  const style: React.CSSProperties = useMemo(
    () => ({
      width: '100%',
      height: height ?? DEFAULT_MAP_HEIGHT,
      maxWidth: '100%', // Prevent overflow on mobile
    }),
    [height]
  );

  return (
    <Map
      initialViewState={viewState}
      style={style}
      mapStyle={MAP_STYLE_URL}
      ref={mapRefCallback}
      interactive={false}
      cooperativeGestures={false}
      mapboxAccessToken={MAPBOX_TOKEN}
      attributionControl={false}
      onLoad={handleMapLoad}
    >
      {mapError && (
        <div className={styles.mapErrorNotification}>
          <span>{mapError}</span>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      )}
      <Source id="data" type="geojson" data={combinedGeoData}>
        <Layer
          id="province"
          type="fill"
          paint={{
            'fill-color': PROVINCE_FILL_COLOR,
            'fill-opacity': 0.18,
          }}
          filter={filterProvinces}
        />
        <Layer
          id="countries"
          type="fill"
          paint={{
            'fill-color': COUNTRY_FILL_COLOR,
            // in China, fill a bit lighter while already filled provinces
            'fill-opacity': ['case', ['==', ['get', 'name'], '中国'], 0.1, 0.5],
          }}
          filter={filterCountries}
        />
        <Layer
          id="runs2"
          type="line"
          paint={{
            'line-color': SINGLE_RUN_COLOR_DARK,
            'line-width': [
              'case',
              ['==', ['get', 'dimmed'], true],
              0.9,
              isBigMap ? 1.3 : isSingleRun ? 2.35 : 2,
            ],
            'line-dasharray': [2, 0],
            'line-opacity': [
              'case',
              ['==', ['get', 'dimmed'], true],
              0.18,
              isSingleRun || isBigMap ? 0.86 : 0.8,
            ],
            'line-blur': 0.35,
          }}
          layout={{
            'line-join': 'round',
            'line-cap': 'round',
          }}
          filter={['!=', ['get', 'indoor'], true]}
        />
        <Layer
          id="runs2-indoor"
          type="line"
          paint={{
            'line-color': SINGLE_RUN_COLOR_DARK,
            'line-width': [
              'case',
              ['==', ['get', 'dimmed'], true],
              0.85,
              isBigMap ? 1.2 : isSingleRun ? 2.1 : 1.85,
            ],
            'line-dasharray': [2, 0],
            'line-opacity': [
              'case',
              ['==', ['get', 'dimmed'], true],
              0.1,
              isSingleRun || isBigMap ? 0.55 : LINE_OPACITY * 0.55,
            ],
            'line-blur': 0.35,
          }}
          layout={{
            'line-join': 'round',
            'line-cap': 'round',
          }}
          filter={['==', ['get', 'indoor'], true]}
        />
      </Source>
    </Map>
  );
};

export default RunMap;
