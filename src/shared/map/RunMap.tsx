import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import ReactMap, { Layer, Source } from '@vis.gl/react-maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { IViewState } from '@/entities/activity/model/types';
import { getMapcnStyle } from '@/shared/config/map';
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
  provinceFillPaint,
  runPaintFor,
  routeLineLayout,
} from './layers/routeLayers';
import { DEFAULT_MAP_HEIGHT, isBigMapZoom } from './lib/bounds';
import { filterExpressionFor, isSingleRunGeoData } from './lib/geojson';
import styles from './style.module.css';

maplibregl.prewarm();

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
  });
  const {
    clearStyleRefresh,
    finalizeBaseStyle,
    isBaseStyleReady,
    resetBaseStyleReadiness,
    scheduleBaseStyleRefresh,
  } = useMapStyleSoftening();
  const { mapError, reportMapError } = useMapError();
  const { handleMapLoad, mapRef, mapRefCallback } = useMapLifecycle({
    clearStyleRefresh,
    finalizeBaseStyle,
    onReady,
    reportMapError,
    resetBaseStyleReadiness,
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
        mapLib={maplibregl}
        initialViewState={viewState}
        style={mapStyle}
        mapStyle={getMapcnStyle()}
        ref={mapRefCallback}
        interactive={false}
        cooperativeGestures={false}
        attributionControl={false}
        reuseMaps
        validateStyle={false}
        renderWorldCopies={false}
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
            id="run-routes"
            type="line"
            paint={runPaintFor(isBigMap, isSingleRun)}
            layout={routeLineLayout}
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
