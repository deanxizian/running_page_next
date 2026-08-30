const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

const localDateFor = (value: string) => {
  const match = value.match(LOCAL_DATE_TIME_PATTERN);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute, second);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null;
  }

  return date;
};

const lastRunTextFor = (localDate: string, now = new Date()) => {
  const runDate = localDateFor(localDate);
  if (!runDate) {
    return 'last run recently';
  }

  const elapsedMs = Math.max(0, now.getTime() - runDate.getTime());
  if (elapsedMs < DAY_IN_MS) {
    const hoursAgo = Math.floor(elapsedMs / HOUR_IN_MS);

    if (hoursAgo === 0) {
      return 'last run less than 1 hour ago';
    }
    if (hoursAgo === 1) {
      return 'last run 1 hour ago';
    }
    return `last run ${hoursAgo} hours ago`;
  }

  const daysAgo = Math.floor(elapsedMs / DAY_IN_MS);
  return daysAgo === 1 ? 'last run 1 day ago' : `last run ${daysAgo} days ago`;
};

export { lastRunTextFor };
