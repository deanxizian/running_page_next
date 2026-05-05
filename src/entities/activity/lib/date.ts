import type { Activity } from '../model/types';

const sortDateFunc = (a: Activity, b: Activity) => {
  return b.start_time_local_ms - a.start_time_local_ms;
};

const getMondayFirstDayIndex = (date: Date) => (date.getDay() + 6) % 7;

const monthKeyFor = (value: string | Pick<Activity, 'month_key'>) =>
  typeof value === 'string' ? value.slice(0, 7) : value.month_key;

const yearKeyFor = (value: string | Pick<Activity, 'year_key'>) =>
  typeof value === 'string' ? value.slice(0, 4) : value.year_key;

const shiftMonthKey = (monthKey: string, delta: number) => {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const monthOrderFor = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return year * 12 + month;
};

const isMonthWithinRange = (
  monthKey: string,
  firstMonthKey: string,
  lastMonthKey: string
) => {
  if (!monthKey || !firstMonthKey || !lastMonthKey) {
    return false;
  }

  const monthOrder = monthOrderFor(monthKey);
  return (
    monthOrder >= monthOrderFor(firstMonthKey) &&
    monthOrder <= monthOrderFor(lastMonthKey)
  );
};

const clampMonthKey = (
  monthKey: string,
  firstMonthKey: string,
  lastMonthKey: string
) => {
  if (!monthKey || !firstMonthKey || !lastMonthKey) {
    return monthKey;
  }

  if (monthOrderFor(monthKey) < monthOrderFor(firstMonthKey)) {
    return firstMonthKey;
  }

  if (monthOrderFor(monthKey) > monthOrderFor(lastMonthKey)) {
    return lastMonthKey;
  }

  return monthKey;
};

export {
  sortDateFunc,
  getMondayFirstDayIndex,
  monthKeyFor,
  yearKeyFor,
  shiftMonthKey,
  monthOrderFor,
  isMonthWithinRange,
  clampMonthKey,
};
