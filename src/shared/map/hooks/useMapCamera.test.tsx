import { renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import type { MapRef } from '@vis.gl/react-maplibre';
import { describe, expect, it, vi } from 'vitest';
import type { IViewState } from '@/entities/activity/model/types';
import { useMapCamera } from './useMapCamera';

const targetViewState: IViewState = {
  longitude: 121.2,
  latitude: 31,
  zoom: 10,
};

describe('useMapCamera', () => {
  it('stops an active camera transition before the map unmounts', () => {
    const map = {
      easeTo: vi.fn(),
      getCenter: vi.fn(() => ({ lng: 0, lat: 0 })),
      getZoom: vi.fn(() => 1),
      off: vi.fn(),
      once: vi.fn(),
      stop: vi.fn(),
    };
    const mapRef = {
      current: {
        getMap: () => map,
      } as unknown as MapRef,
    } satisfies RefObject<MapRef | null>;

    const { unmount } = renderHook(() =>
      useMapCamera({
        animateCamera: true,
        mapRef,
        setViewState: vi.fn(),
        viewState: targetViewState,
      })
    );

    expect(map.easeTo).toHaveBeenCalledTimes(1);
    expect(map.stop).toHaveBeenCalledTimes(1);

    unmount();

    expect(map.stop).toHaveBeenCalledTimes(2);
    expect(map.off).toHaveBeenCalledWith('moveend', expect.any(Function));
  });
});
