import { useEffect, useState, type ComponentType } from 'react';

type TelemetryComponents = {
  Analytics: ComponentType;
  SpeedInsights: ComponentType;
};

const DeferredTelemetry = () => {
  const [components, setComponents] = useState<TelemetryComponents | null>(
    null
  );

  useEffect(() => {
    if (!import.meta.env.PROD || import.meta.env.VERCEL !== '1') {
      return undefined;
    }

    let cancelled = false;
    const loadTelemetry = async () => {
      const [{ Analytics }, { SpeedInsights }] = await Promise.all([
        import('@vercel/analytics/react'),
        import('@vercel/speed-insights/react'),
      ]);

      if (!cancelled) {
        setComponents({ Analytics, SpeedInsights });
      }
    };
    const startLoading = () => {
      void loadTelemetry().catch(() => undefined);
    };
    let cancelScheduledLoad: () => void;

    if (typeof window.requestIdleCallback === 'function') {
      const idleCallbackId = window.requestIdleCallback(startLoading, {
        timeout: 2_000,
      });
      cancelScheduledLoad = () => window.cancelIdleCallback(idleCallbackId);
    } else {
      const timeoutId = window.setTimeout(startLoading, 1_000);
      cancelScheduledLoad = () => window.clearTimeout(timeoutId);
    }

    return () => {
      cancelled = true;
      cancelScheduledLoad();
    };
  }, []);

  if (!components) {
    return null;
  }

  const { Analytics, SpeedInsights } = components;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
};

export default DeferredTelemetry;
