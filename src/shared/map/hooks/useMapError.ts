import { useCallback, useRef, useState } from 'react';

const MAP_TILE_ERROR_MESSAGE =
  'Map tiles failed to load. Please check your internet connection.';
const MAX_TILE_ERRORS = 10;

const useMapError = () => {
  const [mapError, setMapError] = useState<string | null>(null);
  const tileErrorCountRef = useRef(0);

  const resetTileErrors = useCallback(() => {
    tileErrorCountRef.current = 0;
  }, []);

  const reportMapError = useCallback(() => {
    setMapError(MAP_TILE_ERROR_MESSAGE);
  }, []);

  const reportTileError = useCallback(() => {
    tileErrorCountRef.current += 1;

    if (tileErrorCountRef.current === MAX_TILE_ERRORS) {
      setMapError(MAP_TILE_ERROR_MESSAGE);
    }
  }, []);

  return {
    mapError,
    reportMapError,
    reportTileError,
    resetTileErrors,
  };
};

export { useMapError };
