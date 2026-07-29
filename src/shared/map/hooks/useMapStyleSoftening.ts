import { useCallback, useRef, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { softenMapBaseLayers, showBaseLayers } from '../layers/baseLayerStyle';

const useMapStyleSoftening = () => {
  const styleRefreshFrameRef = useRef<number | null>(null);
  const hasRevealedBaseStyleRef = useRef(false);
  const [isBaseStyleReady, setIsBaseStyleReady] = useState(false);

  const clearStyleRefresh = useCallback(() => {
    if (styleRefreshFrameRef.current !== null) {
      window.cancelAnimationFrame(styleRefreshFrameRef.current);
      styleRefreshFrameRef.current = null;
    }
  }, []);

  const revealBaseStyle = useCallback(() => {
    if (hasRevealedBaseStyleRef.current) {
      return;
    }

    hasRevealedBaseStyleRef.current = true;
    setIsBaseStyleReady(true);
  }, []);

  const resetBaseStyleReadiness = useCallback(() => {
    hasRevealedBaseStyleRef.current = false;
    setIsBaseStyleReady(false);
  }, []);

  const refreshBaseStyle = useCallback((map: MapLibreMap) => {
    softenMapBaseLayers(map);
    showBaseLayers(map);
  }, []);

  const scheduleBaseStyleRefresh = useCallback(
    (map: MapLibreMap) => {
      if (styleRefreshFrameRef.current !== null) {
        return;
      }

      styleRefreshFrameRef.current = window.requestAnimationFrame(() => {
        styleRefreshFrameRef.current = null;
        refreshBaseStyle(map);
      });
    },
    [refreshBaseStyle]
  );

  const finalizeBaseStyle = useCallback(
    (map: MapLibreMap) => {
      if (styleRefreshFrameRef.current !== null) {
        window.cancelAnimationFrame(styleRefreshFrameRef.current);
        styleRefreshFrameRef.current = null;
      }

      refreshBaseStyle(map);
      revealBaseStyle();
    },
    [refreshBaseStyle, revealBaseStyle]
  );

  return {
    clearStyleRefresh,
    finalizeBaseStyle,
    isBaseStyleReady,
    resetBaseStyleReadiness,
    scheduleBaseStyleRefresh,
  };
};

export { useMapStyleSoftening };
