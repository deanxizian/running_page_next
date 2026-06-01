import { useCallback } from 'react';
import {
  clampMonthKey,
  isMonthWithinRange,
} from '@/entities/activity/lib/date';

const useCalendarRange = (
  earliestMonth: string,
  latestSelectableMonth: string
) => {
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
