import { useMemo } from 'react';
import rawActivities from '@/static/activities.json';
import { buildActivitySnapshot } from '../data/buildActivitySnapshot';
import { parseActivities } from '../data/parseActivities';
import type { ActivitySnapshot } from '../data/buildActivitySnapshot';

let activitySnapshotCache: ActivitySnapshot | null = null;

const useActivities = () => {
  return useMemo(() => {
    if (!activitySnapshotCache) {
      activitySnapshotCache = buildActivitySnapshot(
        parseActivities(rawActivities)
      );
    }
    return activitySnapshotCache;
  }, []);
};

export type { ActivitySnapshot };
export default useActivities;
