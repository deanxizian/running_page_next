export const M_TO_DIST = 1000;
export const DIST_UNIT = 'km';

const formatPace = (d: number): string => {
  if (!Number.isFinite(d) || d <= 0) return '0';
  const pace = (M_TO_DIST / 60.0) * (1.0 / d);
  const minutes = Math.floor(pace);
  const seconds = Math.floor((pace - minutes) * 60.0);
  return `${minutes}'${seconds.toFixed(0).toString().padStart(2, '0')}"`;
};

const convertMovingTime2Sec = (moving_time: string): number => {
  if (!moving_time) {
    return 0;
  }

  const splits = moving_time.split(', ');
  const days = splits.length === 2 ? parseInt(splits[0], 10) : 0;
  const time = splits.splice(-1)[0];
  const [hours = 0, minutes = 0, seconds = 0] = time.split(':').map(Number);
  return ((days * 24 + hours) * 60 + minutes) * 60 + seconds;
};

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(
    2,
    '0'
  )}`;
};

const formatPaceDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

const formatDurationShort = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatRoundedHours = (seconds: number) =>
  Math.round(Math.max(0, seconds) / 3600).toString();

const formatMonthlyBarDistance = (distance: number) => {
  if (distance === 0) {
    return '0';
  }
  if (distance < 10) {
    return distance.toFixed(1);
  }
  return distance.toFixed(0);
};

export {
  formatPace,
  convertMovingTime2Sec,
  formatDuration,
  formatPaceDuration,
  formatDurationShort,
  formatRoundedHours,
  formatMonthlyBarDistance,
};
