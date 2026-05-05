import {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { TOUCH_REVEAL_DURATION_MS } from './shared';

const useTouchRevealAction = (
  action?: () => void,
  options: { onRevealStart?: () => void; resetSignal?: number } = {}
) => {
  const [isTouchRevealActive, setIsTouchRevealActive] = useState(false);
  const isTouchRevealActiveRef = useRef(false);
  const pendingTouchActionRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const touchRevealTimeoutRef = useRef<number | null>(null);
  const { onRevealStart, resetSignal } = options;

  const clearTouchRevealTimeout = useCallback(() => {
    if (touchRevealTimeoutRef.current) {
      window.clearTimeout(touchRevealTimeoutRef.current);
      touchRevealTimeoutRef.current = null;
    }
  }, []);

  const hideTouchReveal = useCallback(() => {
    clearTouchRevealTimeout();
    isTouchRevealActiveRef.current = false;
    pendingTouchActionRef.current = false;
    suppressNextClickRef.current = false;
    setIsTouchRevealActive(false);
  }, [clearTouchRevealTimeout]);

  const showTouchReveal = useCallback(() => {
    onRevealStart?.();
    clearTouchRevealTimeout();
    isTouchRevealActiveRef.current = true;
    setIsTouchRevealActive(true);
    touchRevealTimeoutRef.current = window.setTimeout(
      hideTouchReveal,
      TOUCH_REVEAL_DURATION_MS
    );
  }, [clearTouchRevealTimeout, hideTouchReveal, onRevealStart]);

  useEffect(() => () => clearTouchRevealTimeout(), [clearTouchRevealTimeout]);

  useEffect(() => {
    hideTouchReveal();
  }, [hideTouchReveal, resetSignal]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!action || event.pointerType === 'mouse') {
        return;
      }

      if (!isTouchRevealActiveRef.current) {
        showTouchReveal();
        suppressNextClickRef.current = true;
        return;
      }

      pendingTouchActionRef.current = true;
    },
    [action, showTouchReveal]
  );

  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      if (!action) {
        return;
      }

      if (pendingTouchActionRef.current) {
        event.preventDefault();
        event.stopPropagation();
        pendingTouchActionRef.current = false;
        suppressNextClickRef.current = false;
        hideTouchReveal();
        action();
        return;
      }

      if (suppressNextClickRef.current) {
        event.preventDefault();
        event.stopPropagation();
        suppressNextClickRef.current = false;
        return;
      }

      hideTouchReveal();
      action();
    },
    [action, hideTouchReveal]
  );

  const handlePointerCancel = useCallback(() => {
    pendingTouchActionRef.current = false;
    suppressNextClickRef.current = false;
  }, []);

  return {
    isTouchRevealActive,
    touchRevealHandlers: action
      ? {
          onPointerDown: handlePointerDown,
          onPointerCancel: handlePointerCancel,
          onClick: handleClick,
        }
      : {},
  };
};

const useTouchPreview = <T>() => {
  const [previewedKey, setPreviewedKey] = useState<T | null>(null);
  const previewTimeoutRef = useRef<number | null>(null);

  const clearTouchPreview = useCallback(() => {
    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }

    setPreviewedKey(null);
  }, []);

  const showTouchPreview = useCallback((key: T | null | undefined) => {
    if (key === null || typeof key === 'undefined') {
      return;
    }

    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current);
    }

    setPreviewedKey(key);
    previewTimeoutRef.current = window.setTimeout(() => {
      setPreviewedKey(null);
      previewTimeoutRef.current = null;
    }, TOUCH_REVEAL_DURATION_MS);
  }, []);

  useEffect(() => clearTouchPreview, [clearTouchPreview]);

  return {
    previewedKey,
    showTouchPreview,
    clearTouchPreview,
  };
};

export { useTouchRevealAction, useTouchPreview };
