import type { Activity } from './types';

const REQUIRED_ACTIVITY_FIELDS = [
  'run_id',
  'name',
  'distance',
  'moving_time',
  'type',
  'subtype',
  'start_date',
  'start_date_local',
  'start_time_local_ms',
  'month_key',
  'year_key',
  'average_speed',
  'streak',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isString = (value: unknown) => typeof value === 'string';

const isNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value);

const isNullableNumber = (value: unknown) => value === null || isNumber(value);

const isNullableString = (value: unknown) =>
  value === null || value === undefined || isString(value);

const localStartFieldsFor = (value: string) => {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
  );

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    return null;
  }

  return {
    start_time_local_ms: date.getTime(),
    month_key: `${yearText}-${monthText}`,
    year_key: yearText,
  };
};

const hasConsistentLocalStartFields = (value: Record<string, unknown>) => {
  if (!isString(value.start_date_local)) {
    return false;
  }

  const expected = localStartFieldsFor(value.start_date_local);
  return (
    expected !== null &&
    value.start_time_local_ms === expected.start_time_local_ms &&
    value.month_key === expected.month_key &&
    value.year_key === expected.year_key
  );
};

const isActivity = (value: unknown): value is Activity => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    REQUIRED_ACTIVITY_FIELDS.every((field) => field in value) &&
    isNumber(value.run_id) &&
    isString(value.name) &&
    isNumber(value.distance) &&
    isString(value.moving_time) &&
    isString(value.type) &&
    isString(value.subtype) &&
    isString(value.start_date) &&
    isString(value.start_date_local) &&
    isNumber(value.start_time_local_ms) &&
    isString(value.month_key) &&
    isString(value.year_key) &&
    hasConsistentLocalStartFields(value) &&
    isNullableString(value.location_country) &&
    isNullableString(value.summary_polyline) &&
    isNullableNumber(value.average_heartrate) &&
    isNullableNumber(value.elevation_gain) &&
    isNumber(value.average_speed) &&
    isNumber(value.streak)
  );
};

export { REQUIRED_ACTIVITY_FIELDS, isActivity, localStartFieldsFor };
