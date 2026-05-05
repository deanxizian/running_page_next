import { COUNTRY_STANDARDIZATION } from '@/static/city';
import type { Activity } from '../model/types';
import { locationForRun } from '../lib/location';
import { monthKeyFor, sortDateFunc } from '../lib/date';
import { groupActivities } from '../lib/group';
import type { ActivityGroups } from '../lib/group';

export type ActivitySnapshot = {
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

const standardizeCountryName = (country: string): string => {
  for (const [pattern, standardName] of COUNTRY_STANDARDIZATION) {
    if (country.includes(pattern)) {
      return standardName;
    }
  }
  return country;
};

const buildActivitySnapshot = (activities: Activity[]): ActivitySnapshot => {
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
    years.add(run.year_key);
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
    latestMonth: latestRun ? monthKeyFor(latestRun) : '',
    earliestMonth: sortedActivities.length
      ? monthKeyFor(sortedActivities[sortedActivities.length - 1])
      : '',
  };
};

export { buildActivitySnapshot, standardizeCountryName };
