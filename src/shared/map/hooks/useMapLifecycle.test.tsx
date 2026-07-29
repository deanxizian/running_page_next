import { act, renderHook } from '@testing-library/react';
import type { MapRef } from '@vis.gl/react-maplibre';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { describe, expect, it, vi } from 'vitest';
import { useMapLifecycle } from './useMapLifecycle';

const setupLifecycle = () => {
  const map = {
    off: vi.fn(),
    on: vi.fn(),
  } as unknown as MapLibreMap;
  const mapRef = {
    getMap: () => map,
  } as unknown as MapRef;
  const callbacks = {
    clearStyleRefresh: vi.fn(),
    finalizeBaseStyle: vi.fn(),
    onReady: vi.fn(),
    reportMapError: vi.fn(),
    resetBaseStyleReadiness: vi.fn(),
    scheduleBaseStyleRefresh: vi.fn(),
  };
  const hook = renderHook(() => useMapLifecycle(callbacks));

  return {
    ...callbacks,
    ...hook,
    map,
    mapRef,
  };
};

describe('useMapLifecycle', () => {
  it('waits for load before revealing a newly created map', () => {
    const {
      finalizeBaseStyle,
      map,
      mapRef,
      onReady,
      resetBaseStyleReadiness,
      result,
      scheduleBaseStyleRefresh,
    } = setupLifecycle();

    act(() => result.current.mapRefCallback(mapRef));

    expect(resetBaseStyleReadiness).toHaveBeenCalledTimes(1);
    expect(scheduleBaseStyleRefresh).toHaveBeenCalledWith(map);
    expect(finalizeBaseStyle).not.toHaveBeenCalled();

    act(() => result.current.handleMapLoad({ target: map }));

    expect(finalizeBaseStyle).toHaveBeenCalledWith(map);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('reveals a reused map when load fires before its ref is rebound', () => {
    const {
      finalizeBaseStyle,
      map,
      mapRef,
      onReady,
      resetBaseStyleReadiness,
      result,
    } = setupLifecycle();

    act(() => result.current.handleMapLoad({ target: map }));
    act(() => result.current.mapRefCallback(mapRef));

    expect(onReady).toHaveBeenCalledTimes(1);
    expect(resetBaseStyleReadiness).not.toHaveBeenCalled();
    expect(finalizeBaseStyle).toHaveBeenCalledTimes(2);
    expect(finalizeBaseStyle).toHaveBeenLastCalledWith(map);
  });
});
