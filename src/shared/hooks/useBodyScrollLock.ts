import { useEffect, useRef } from 'react';

type BodyScrollLock = {
  scrollY: number;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
};

const useBodyScrollLock = (locked: boolean) => {
  const lockRef = useRef<BodyScrollLock | null>(null);

  useEffect(() => {
    if (!locked || lockRef.current) {
      return undefined;
    }

    const bodyStyle = document.body.style;
    const scrollY = window.scrollY;

    lockRef.current = {
      scrollY,
      bodyPosition: bodyStyle.position,
      bodyTop: bodyStyle.top,
      bodyWidth: bodyStyle.width,
    };

    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.width = '100%';

    return () => {
      const lock = lockRef.current;

      if (!lock) {
        return;
      }

      bodyStyle.position = lock.bodyPosition;
      bodyStyle.top = lock.bodyTop;
      bodyStyle.width = lock.bodyWidth;
      lockRef.current = null;
      window.scrollTo(0, lock.scrollY);
    };
  }, [locked]);
};

export { useBodyScrollLock };
