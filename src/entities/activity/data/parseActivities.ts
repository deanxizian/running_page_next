import { isActivity } from '../model/schema';
import type { Activity } from '../model/types';

const parseActivities = (rawActivities: unknown): Activity[] => {
  if (!Array.isArray(rawActivities)) {
    throw new Error('activities.json must contain an array of activities.');
  }

  rawActivities.forEach((activity, index) => {
    if (!isActivity(activity)) {
      throw new Error(`Invalid activity record at index ${index}.`);
    }
  });

  return rawActivities;
};

export { parseActivities };
