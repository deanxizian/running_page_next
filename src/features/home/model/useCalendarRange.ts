import { useCallback } from 'react';
import {
  clampMonthKey,
  isMonthWithinRange,
  latestStartedMonthKey,
} from '@/entities/activity/lib/date';

const useCalendarRange = (earliestMonth: string, latestMonth: string) => {
  const latestSelectableMonth = latestStartedMonthKey(latestMonth);

  const isMonthWithinActivityRange = useCallback(
    (monthKey: string) =>
      isMonthWithinRange(monthKey, earliestMonth, latestSelectableMonth),
    [earliestMonth, latestSelectableMonth]
  );

  const clampMonthToActivityRange = useCallback(
    (monthKey: string) =>
      clampMonthKey(monthKey, earliestMonth, latestSelectableMonth),
    [earliestMonth, latestSelectableMonth]
  );

  return {
    isMonthWithinActivityRange,
    clampMonthToActivityRange,
  };
};

export { useCalendarRange };
