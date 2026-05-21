import { useEffect, useState } from 'react';
import { dateKeyForDate } from '@/entities/activity/lib/date';

const nextLocalMidnightDelay = () => {
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    1
  );

  return Math.max(1000, nextMidnight.getTime() - now.getTime());
};

const useTodayDateKey = () => {
  const [todayDateKey, setTodayDateKey] = useState(() =>
    dateKeyForDate(new Date())
  );

  useEffect(() => {
    let timeoutId: number | null = null;

    const scheduleNextUpdate = () => {
      timeoutId = window.setTimeout(() => {
        setTodayDateKey(dateKeyForDate(new Date()));
        scheduleNextUpdate();
      }, nextLocalMidnightDelay());
    };

    scheduleNextUpdate();

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return todayDateKey;
};

export { useTodayDateKey };
