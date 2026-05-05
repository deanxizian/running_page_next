import { useCallback } from 'react';
import {
  clampMonthKey,
  isMonthWithinRange,
} from '@/entities/activity/lib/date';

const useCalendarRange = (earliestMonth: string, latestMonth: string) => {
  const isMonthWithinActivityRange = useCallback(
    (monthKey: string) =>
      isMonthWithinRange(monthKey, earliestMonth, latestMonth),
    [earliestMonth, latestMonth]
  );

  const clampMonthToActivityRange = useCallback(
    (monthKey: string) => clampMonthKey(monthKey, earliestMonth, latestMonth),
    [earliestMonth, latestMonth]
  );

  return {
    isMonthWithinActivityRange,
    clampMonthToActivityRange,
  };
};

export { useCalendarRange };
