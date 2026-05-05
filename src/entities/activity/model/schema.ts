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
    isNullableString(value.location_country) &&
    isNullableString(value.summary_polyline) &&
    isNullableNumber(value.average_heartrate) &&
    isNullableNumber(value.elevation_gain) &&
    isNumber(value.average_speed) &&
    isNumber(value.streak)
  );
};

export { REQUIRED_ACTIVITY_FIELDS, isActivity };
