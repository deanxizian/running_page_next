import { lazy, Suspense } from 'react';
import type { CSSProperties } from 'react';
import type { RunMapProps } from './index';

const RunMap = lazy(() => import('./index'));
const DEFAULT_FALLBACK_HEIGHT = 600;

const fallbackStyleFor = (height: RunMapProps['height']): CSSProperties => ({
  width: '100%',
  height: height ?? DEFAULT_FALLBACK_HEIGHT,
  maxWidth: '100%',
});

const LazyRunMap = (props: RunMapProps) => (
  <Suspense
    fallback={<div aria-hidden="true" style={fallbackStyleFor(props.height)} />}
  >
    <RunMap {...props} />
  </Suspense>
);

export default LazyRunMap;
