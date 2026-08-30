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

let englishToChineseRegionNames: ReadonlyMap<string, string> | null = null;

const regionNames = () => {
  if (englishToChineseRegionNames) {
    return englishToChineseRegionNames;
  }

  const names = new Map<string, string>();
  try {
    const englishNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const chineseNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' });

    for (let first = 65; first <= 90; first += 1) {
      for (let second = 65; second <= 90; second += 1) {
        const regionCode = String.fromCharCode(first, second);
        const englishName = englishNames.of(regionCode);
        const chineseName = chineseNames.of(regionCode);

        if (
          englishName &&
          chineseName &&
          englishName !== regionCode &&
          chineseName !== regionCode
        ) {
          names.set(englishName.toLocaleLowerCase('en'), chineseName);
        }
      }
    }
  } catch {
    // Keep the original name on browsers without Intl.DisplayNames.
  }

  englishToChineseRegionNames = names;
  return englishToChineseRegionNames;
};

const standardizeCountryName = (country: string): string => {
  for (const [pattern, standardName] of COUNTRY_STANDARDIZATION) {
    if (country.includes(pattern)) {
      return standardName;
    }
  }

  return (
    regionNames().get(country.trim().toLocaleLowerCase('en')) ?? country.trim()
  );
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
