import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import ReactMap, { Layer, Source } from 'react-map-gl';
import type { IViewState } from '@/entities/activity/model/types';
import { MAPBOX_TOKEN } from '@/shared/config/env';
import { IS_CHINESE } from '@/shared/config/i18n';
import { MAP_STYLE_URL } from '@/shared/config/map';
import type { FeatureCollection } from '@/types/geojson';
import type { RPGeometry } from '@/static/run_countries';
import { MapErrorOverlay } from './components/MapErrorOverlay';
import { useMapCamera } from './hooks/useMapCamera';
import { useMapError } from './hooks/useMapError';
import { useMapGeoData } from './hooks/useMapGeoData';
import { useMapLifecycle } from './hooks/useMapLifecycle';
import { useMapStyleSoftening } from './hooks/useMapStyleSoftening';
import {
  countryFillPaint,
  indoorRunFilter,
  indoorRunPaintFor,
  outdoorRunFilter,
  outdoorRunPaintFor,
  provinceFillPaint,
  routeLineLayout,
} from './layers/routeLayers';
import { DEFAULT_MAP_HEIGHT, isBigMapZoom } from './lib/bounds';
import { filterExpressionFor, isSingleRunGeoData } from './lib/geojson';
import styles from './style.module.css';
import './mapbox.css';

export interface RunMapProps {
  viewState: IViewState;
  setViewState: (_viewState: IViewState) => void;
  geoData: FeatureCollection<RPGeometry>;
  countries: string[];
  provinces: string[];
  height?: number | string;
  onReady?: () => void;
  animateCamera?: boolean;
}

const RunMap = ({
  viewState,
  setViewState,
  geoData,
  countries,
  provinces,
  height,
  onReady,
  animateCamera = true,
}: RunMapProps) => {
  const isBigMap = isBigMapZoom(viewState.zoom);
  const isSingleRun = isSingleRunGeoData(geoData);
  const combinedGeoData = useMapGeoData({
    geoData,
    isBigMap,
    isChineseLocale: IS_CHINESE,
  });
  const {
    clearStyleRefresh,
    isBaseStyleReady,
    resetBaseStyleReadiness,
    scheduleBaseStyleRefresh,
  } = useMapStyleSoftening();
  const { mapError, reportMapError, reportTileError, resetTileErrors } =
    useMapError();
  const { handleMapLoad, mapRef, mapRefCallback } = useMapLifecycle({
    clearStyleRefresh,
    onReady,
    reportMapError,
    reportTileError,
    resetBaseStyleReadiness,
    resetTileErrors,
    scheduleBaseStyleRefresh,
  });

  useMapCamera({
    animateCamera,
    mapRef,
    setViewState,
    viewState,
  });

  const filterProvinces = useMemo(
    () => filterExpressionFor(provinces),
    [provinces]
  );
  const filterCountries = useMemo(
    () => filterExpressionFor(countries),
    [countries]
  );

  const frameStyle: CSSProperties = useMemo(
    () => ({
      width: '100%',
      height: height ?? DEFAULT_MAP_HEIGHT,
      maxWidth: '100%',
    }),
    [height]
  );

  const mapStyle: CSSProperties = useMemo(
    () => ({
      width: '100%',
      height: '100%',
      maxWidth: '100%',
    }),
    []
  );

  return (
    <div className={styles.mapFrame} style={frameStyle}>
      <ReactMap
        initialViewState={viewState}
        style={mapStyle}
        mapStyle={MAP_STYLE_URL}
        ref={mapRefCallback}
        interactive={false}
        cooperativeGestures={false}
        mapboxAccessToken={MAPBOX_TOKEN}
        attributionControl={false}
        onLoad={handleMapLoad}
      >
        <Source id="data" type="geojson" data={combinedGeoData}>
          <Layer
            id="province"
            type="fill"
            paint={provinceFillPaint}
            filter={filterProvinces}
          />
          <Layer
            id="countries"
            type="fill"
            paint={countryFillPaint}
            filter={filterCountries}
          />
          <Layer
            id="runs2"
            type="line"
            paint={outdoorRunPaintFor(isBigMap, isSingleRun)}
            layout={routeLineLayout}
            filter={outdoorRunFilter}
          />
          <Layer
            id="runs2-indoor"
            type="line"
            paint={indoorRunPaintFor(isBigMap, isSingleRun)}
            layout={routeLineLayout}
            filter={indoorRunFilter}
          />
        </Source>
      </ReactMap>
      <div
        aria-hidden="true"
        className={`${styles.mapBaseShield} ${
          isBaseStyleReady ? styles.mapBaseShieldHidden : ''
        }`}
      />
      {mapError && <MapErrorOverlay message={mapError} />}
    </div>
  );
};

export default RunMap;
