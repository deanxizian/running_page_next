import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeatureCollection } from '@/types/geojson';
import type { RPGeometry } from '@/static/run_countries';
import { useMapGeoData } from './useMapGeoData';

const geoJsonForMap = vi.hoisted(() =>
  vi.fn(() => Promise.reject(new Error('map data unavailable')))
);

vi.mock('@/entities/activity/lib/route', () => ({
  geoJsonForMap,
}));

const emptyGeoData: FeatureCollection<RPGeometry> = {
  type: 'FeatureCollection',
  features: [],
};

describe('useMapGeoData', () => {
  beforeEach(() => {
    geoJsonForMap.mockClear();
  });

  it('does not retry continuously after map data fails to load', async () => {
    const { rerender } = renderHook(
      ({ geoData }) =>
        useMapGeoData({
          geoData,
          isBigMap: true,
        }),
      { initialProps: { geoData: emptyGeoData } }
    );

    await waitFor(() => expect(geoJsonForMap).toHaveBeenCalledTimes(1));
    rerender({ geoData: { ...emptyGeoData } });
    await new Promise((resolve) => window.setTimeout(resolve, 20));

    expect(geoJsonForMap).toHaveBeenCalledTimes(1);
  });
});
