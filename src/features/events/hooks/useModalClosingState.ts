import { useCallback, useEffect, useRef, useState } from 'react';

const useModalClosingState = (durationMs: number) => {
  const [isClosing, setIsClosing] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const clearClosingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetClosing = useCallback(() => {
    clearClosingTimeout();
    setIsClosing(false);
  }, [clearClosingTimeout]);

  const startClosing = useCallback(
    (onClosed: () => void) => {
      if (isClosing) {
        return;
      }

      setIsClosing(true);
      timeoutRef.current = window.setTimeout(() => {
        onClosed();
        setIsClosing(false);
        timeoutRef.current = null;
      }, durationMs);
    },
    [durationMs, isClosing]
  );

  useEffect(
    () => () => {
      clearClosingTimeout();
    },
    [clearClosingTimeout]
  );

  return {
    isClosing,
    resetClosing,
    startClosing,
  };
};

export { useModalClosingState };
