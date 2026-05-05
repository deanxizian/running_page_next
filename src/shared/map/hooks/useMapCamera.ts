import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { MapRef } from 'react-map-gl';
import type { IViewState } from '@/entities/activity/model/types';

const CAMERA_TRANSITION_MS = 1080;

const easeOutCamera = (progress: number) =>
  1 - Math.pow(1 - Math.min(1, Math.max(0, progress)), 3.1);

const cameraValue = (value: number | undefined) =>
  Number.isFinite(value) ? value! : null;

type UseMapCameraParams = {
  animateCamera: boolean;
  mapRef: RefObject<MapRef | null>;
  setViewState: (_viewState: IViewState) => void;
  viewState: IViewState;
};

const useMapCamera = ({
  animateCamera,
  mapRef,
  setViewState,
  viewState,
}: UseMapCameraParams) => {
  const isProgrammaticMoveRef = useRef(false);
  const cameraAnimationTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }

    const targetLongitude = cameraValue(viewState.longitude);
    const targetLatitude = cameraValue(viewState.latitude);
    const targetZoom = cameraValue(viewState.zoom);

    if (
      targetLongitude === null ||
      targetLatitude === null ||
      targetZoom === null
    ) {
      return;
    }

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const centerLatitude =
      ((currentCenter.lat + targetLatitude) / 2) * (Math.PI / 180);
    const centerDelta = Math.hypot(
      (currentCenter.lng - targetLongitude) * Math.cos(centerLatitude),
      currentCenter.lat - targetLatitude
    );
    const zoomDelta = Math.abs(currentZoom - targetZoom);

    if (centerDelta < 0.0001 && zoomDelta < 0.01) {
      return;
    }

    if (cameraAnimationTimeoutRef.current) {
      window.clearTimeout(cameraAnimationTimeoutRef.current);
      cameraAnimationTimeoutRef.current = null;
    }

    isProgrammaticMoveRef.current = true;
    map.stop();

    const targetViewState = {
      ...viewState,
      longitude: targetLongitude,
      latitude: targetLatitude,
      zoom: targetZoom,
    };

    const finishCameraMove = () => {
      if (!isProgrammaticMoveRef.current) {
        return;
      }

      isProgrammaticMoveRef.current = false;
      setViewState(targetViewState);
    };

    if (!animateCamera) {
      map.jumpTo({
        center: [targetLongitude, targetLatitude],
        zoom: targetZoom,
      });
      finishCameraMove();
      return;
    }

    map.once('moveend', finishCameraMove);
    map.easeTo({
      center: [targetLongitude, targetLatitude],
      zoom: targetZoom,
      duration: CAMERA_TRANSITION_MS,
      easing: easeOutCamera,
      essential: true,
    });

    cameraAnimationTimeoutRef.current = window.setTimeout(() => {
      map.off('moveend', finishCameraMove);
      finishCameraMove();
    }, CAMERA_TRANSITION_MS + 120);

    return () => {
      map.off('moveend', finishCameraMove);
      if (cameraAnimationTimeoutRef.current) {
        window.clearTimeout(cameraAnimationTimeoutRef.current);
        cameraAnimationTimeoutRef.current = null;
      }
    };
  }, [
    animateCamera,
    mapRef,
    setViewState,
    viewState,
    viewState.latitude,
    viewState.longitude,
    viewState.zoom,
  ]);
};

export { useMapCamera };
