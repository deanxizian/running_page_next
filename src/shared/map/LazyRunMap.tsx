import { lazy, Suspense } from 'react';
import type { CSSProperties } from 'react';
import type { RunMapProps } from './RunMap';
import { DEFAULT_MAP_HEIGHT } from './lib/bounds';

const RunMap = lazy(() => import('./RunMap'));

const fallbackStyleFor = (height: RunMapProps['height']): CSSProperties => ({
  width: '100%',
  height: height ?? DEFAULT_MAP_HEIGHT,
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
export type { RunMapProps };
