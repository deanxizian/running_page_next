import { useCallback, useState } from 'react';

const MAP_TILE_ERROR_MESSAGE =
  'Map tiles failed to load. Please check your internet connection.';

const useMapError = () => {
  const [mapError, setMapError] = useState<string | null>(null);

  const reportMapError = useCallback(() => {
    setMapError(MAP_TILE_ERROR_MESSAGE);
  }, []);

  return {
    mapError,
    reportMapError,
  };
};

export { useMapError };
