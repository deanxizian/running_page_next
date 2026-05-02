import { useMemo } from 'react';
import type { Activity } from '@/utils/utils';
import { locationForRun, sortDateFunc } from '@/utils/utils';
import rawActivities from '@/static/activities.json';
import { COUNTRY_STANDARDIZATION } from '@/static/city';

const activities = rawActivities as Activity[];

export type ActivityGroups = {
  byDate: Map<string, Activity[]>;
  byMonth: Map<string, Activity[]>;
  byYear: Map<string, Activity[]>;
};

type ProcessedActivities = {
  activities: Activity[];
  sortedActivities: Activity[];
  activityGroups: ActivityGroups;
  years: string[];
  countries: string[];
  provinces: string[];
  thisYear: string;
  latestRun: Activity | null;
  latestMonth: string;
  earliestMonth: string;
};

let processedActivitiesCache: ProcessedActivities | null = null;

const standardizeCountryName = (country: string): string => {
  for (const [pattern, standardName] of COUNTRY_STANDARDIZATION) {
    if (country.includes(pattern)) {
      return standardName;
    }
  }
  return country;
};

const groupActivities = (runs: Activity[]): ActivityGroups => {
  const byDate = new Map<string, Activity[]>();
  const byMonth = new Map<string, Activity[]>();
  const byYear = new Map<string, Activity[]>();

  runs.forEach((run) => {
    const date = run.start_date_local.slice(0, 10);
    const month = run.start_date_local.slice(0, 7);
    const year = run.start_date_local.slice(0, 4);

    byDate.set(date, [...(byDate.get(date) ?? []), run]);
    byMonth.set(month, [...(byMonth.get(month) ?? []), run]);
    byYear.set(year, [...(byYear.get(year) ?? []), run]);
  });

  return { byDate, byMonth, byYear };
};

const buildProcessedActivities = (): ProcessedActivities => {
  const provinces: Set<string> = new Set();
  const countries: Set<string> = new Set();
  const years: Set<string> = new Set();
  const sortedActivities = activities.slice().sort(sortDateFunc);
  const activityGroups = groupActivities(sortedActivities);

  sortedActivities.forEach((run) => {
    const location = locationForRun(run);
    const { province, country } = location;
    if (province) provinces.add(province);
    if (country) countries.add(standardizeCountryName(country));
    const year = run.start_date_local.slice(0, 4);
    years.add(year);
  });

  const yearsArray = [...years].sort().reverse();
  const latestRun = sortedActivities[0] ?? null;

  return {
    activities,
    sortedActivities,
    activityGroups,
    years: yearsArray,
    countries: [...countries],
    provinces: [...provinces],
    thisYear: yearsArray[0] || '',
    latestRun,
    latestMonth: latestRun ? latestRun.start_date_local.slice(0, 7) : '',
    earliestMonth: sortedActivities.length
      ? sortedActivities[sortedActivities.length - 1].start_date_local.slice(0, 7)
      : '',
  };
};

const useActivities = () => {
  return useMemo(() => {
    if (!processedActivitiesCache) {
      processedActivitiesCache = buildProcessedActivities();
    }
    return processedActivitiesCache;
  }, []);
};

export default useActivities;
