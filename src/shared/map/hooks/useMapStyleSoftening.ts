import { useCallback, useRef, useState } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import { softenMapBaseLayers, showBaseLayers } from '../layers/baseLayerStyle';

const useMapStyleSoftening = () => {
  const styleRefreshFrameRef = useRef<number | null>(null);
  const baseStyleRevealCleanupRef = useRef<(() => void) | null>(null);
  const hasRevealedBaseStyleRef = useRef(false);
  const [isBaseStyleReady, setIsBaseStyleReady] = useState(false);

  const clearStyleRefresh = useCallback(() => {
    if (styleRefreshFrameRef.current !== null) {
      window.cancelAnimationFrame(styleRefreshFrameRef.current);
      styleRefreshFrameRef.current = null;
    }

    baseStyleRevealCleanupRef.current?.();
    baseStyleRevealCleanupRef.current = null;
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

  const scheduleBaseStyleReveal = useCallback(
    (map: MapboxMap) => {
      if (
        hasRevealedBaseStyleRef.current ||
        baseStyleRevealCleanupRef.current
      ) {
        return;
      }

      const reveal = () => {
        baseStyleRevealCleanupRef.current?.();
        revealBaseStyle();
      };
      const fallbackTimer = window.setTimeout(reveal, 700);

      baseStyleRevealCleanupRef.current = () => {
        map.off('idle', reveal);
        window.clearTimeout(fallbackTimer);
        baseStyleRevealCleanupRef.current = null;
      };
      map.once('idle', reveal);
    },
    [revealBaseStyle]
  );

  const scheduleBaseStyleRefresh = useCallback(
    (map: MapboxMap) => {
      if (styleRefreshFrameRef.current !== null) {
        return;
      }

      styleRefreshFrameRef.current = window.requestAnimationFrame(() => {
        styleRefreshFrameRef.current = null;
        const didRefreshBaseStyle = softenMapBaseLayers(map);
        showBaseLayers(map);

        if (didRefreshBaseStyle) {
          scheduleBaseStyleReveal(map);
        }
      });
    },
    [scheduleBaseStyleReveal]
  );

  return {
    clearStyleRefresh,
    isBaseStyleReady,
    resetBaseStyleReadiness,
    scheduleBaseStyleRefresh,
  };
};

export { useMapStyleSoftening };
