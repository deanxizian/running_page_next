import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Activity, IViewState } from '@/entities/activity/model/types';
import {
  emphasizePrimaryRuns,
  getBoundsForRuns,
  getIntroViewState,
  viewStatesNearlyEqual,
} from '@/entities/activity/lib/route';

const useRunMapFocus = (mapRuns: Activity[], selectedRun: Activity | null) => {
  const selectedGeoData = useMemo(
    () => emphasizePrimaryRuns(mapRuns, selectedRun),
    [mapRuns, selectedRun]
  );
  const [mapReady, setMapReady] = useState(false);
  const [viewState, setViewState] = useState<IViewState>(() =>
    getIntroViewState(getBoundsForRuns(mapRuns))
  );
  const viewStateRef = useRef<IViewState>(viewState);
  const hasPlayedInitialMapFocusRef = useRef(false);

  const setMapViewState = useCallback((nextViewState: IViewState) => {
    viewStateRef.current = nextViewState;
    setViewState(nextViewState);
  }, []);

  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!hasPlayedInitialMapFocusRef.current && !mapReady) {
      return;
    }

    const targetViewState = getBoundsForRuns(mapRuns);
    const startViewState = viewStateRef.current;

    if (viewStatesNearlyEqual(startViewState, targetViewState)) {
      hasPlayedInitialMapFocusRef.current = true;
      setMapViewState(targetViewState);
      return;
    }

    hasPlayedInitialMapFocusRef.current = true;
    setMapViewState(targetViewState);
  }, [mapReady, mapRuns, setMapViewState]);

  return {
    selectedGeoData,
    viewState,
    setMapViewState,
    handleMapReady,
  };
};

export { useRunMapFocus };
