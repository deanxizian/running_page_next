import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Activity, IViewState } from '@/types/activity';
import {
  ROWS_PER_PAGE,
  clampMonthKey,
  emphasizePrimaryRuns,
  getBoundsForRuns,
  getIntroViewState,
  isMonthWithinRange,
  viewStatesNearlyEqual,
} from './shared';

const useCalendarRange = (earliestMonth: string, latestMonth: string) => {
  const isMonthWithinActivityRange = useCallback(
    (monthKey: string) => isMonthWithinRange(monthKey, earliestMonth, latestMonth),
    [earliestMonth, latestMonth]
  );

  const clampMonthToActivityRange = useCallback(
    (monthKey: string) => clampMonthKey(monthKey, earliestMonth, latestMonth),
    [earliestMonth, latestMonth]
  );

  return {
    isMonthWithinActivityRange,
    clampMonthToActivityRange,
  };
};

const useActivityPagination = (displayedActivities: Activity[]) => {
  const [page, setPage] = useState(0);
  const pagedRuns = useMemo(() => {
    const start = page * ROWS_PER_PAGE;
    return displayedActivities.slice(start, start + ROWS_PER_PAGE);
  }, [displayedActivities, page]);
  const pageCount = Math.max(
    1,
    Math.ceil(displayedActivities.length / ROWS_PER_PAGE)
  );

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, pageCount - 1));
  }, [pageCount]);

  const goToPreviousPage = useCallback(
    () => setPage((current) => Math.max(0, current - 1)),
    []
  );
  const goToNextPage = useCallback(
    () => setPage((current) => Math.min(pageCount - 1, current + 1)),
    [pageCount]
  );

  return {
    page,
    setPage,
    pagedRuns,
    pageCount,
    goToPreviousPage,
    goToNextPage,
  };
};

const useRunMapFocus = (
  mapRuns: Activity[],
  selectedRun: Activity | null
) => {
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

export { useActivityPagination, useCalendarRange, useRunMapFocus };
