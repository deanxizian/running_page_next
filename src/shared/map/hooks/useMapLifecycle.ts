import { useCallback, useEffect, useRef } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { MapRef } from '@vis.gl/react-maplibre';

type UseMapLifecycleParams = {
  onReady?: () => void;
  reportMapError: () => void;
  resetBaseStyleReadiness: () => void;
  scheduleBaseStyleRefresh: (map: MapLibreMap) => void;
  clearStyleRefresh: () => void;
};

const useMapLifecycle = ({
  onReady,
  reportMapError,
  resetBaseStyleReadiness,
  scheduleBaseStyleRefresh,
  clearStyleRefresh,
}: UseMapLifecycleParams) => {
  const mapRef = useRef<MapRef | null>(null);
  const mapListenerCleanupRef = useRef<(() => void) | null>(null);
  const hasNotifiedReadyRef = useRef(false);

  const clearMapListeners = useCallback(() => {
    mapListenerCleanupRef.current?.();
    mapListenerCleanupRef.current = null;
    clearStyleRefresh();
  }, [clearStyleRefresh]);

  const mapRefCallback = useCallback(
    (ref: MapRef | null) => {
      clearMapListeners();

      if (ref === null) {
        mapRef.current = null;
        return;
      }

      mapRef.current = ref;
      resetBaseStyleReadiness();
      const map = ref.getMap();

      const handleStyleData = (event: { dataType?: string }) => {
        if (event.dataType !== 'style') {
          return;
        }
        scheduleBaseStyleRefresh(map);
      };

      map.on('data', handleStyleData);
      map.on('error', reportMapError);
      mapListenerCleanupRef.current = () => {
        map.off('data', handleStyleData);
        map.off('error', reportMapError);
      };

      scheduleBaseStyleRefresh(map);
    },
    [
      clearMapListeners,
      reportMapError,
      resetBaseStyleReadiness,
      scheduleBaseStyleRefresh,
    ]
  );

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

  useEffect(() => clearMapListeners, [clearMapListeners]);

  return {
    handleMapLoad,
    mapRef,
    mapRefCallback,
  };
};

export { useMapLifecycle };
