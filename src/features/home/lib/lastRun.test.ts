import { describe, expect, it } from 'vitest';
import { lastRunTextFor } from './lastRun';

const now = new Date(2026, 7, 31, 18, 30, 0);

describe('last run relative time', () => {
  it('shows hours for runs less than one day ago', () => {
    expect(lastRunTextFor('2026-08-31 18:15:00', now)).toBe(
      'last run less than 1 hour ago'
    );
    expect(lastRunTextFor('2026-08-31 17:00:00', now)).toBe(
      'last run 1 hour ago'
    );
    expect(lastRunTextFor('2026-08-30 19:00:00', now)).toBe(
      'last run 23 hours ago'
    );
  });

  it('switches to days at the 24-hour boundary', () => {
    expect(lastRunTextFor('2026-08-30 18:30:00', now)).toBe(
      'last run 1 day ago'
    );
    expect(lastRunTextFor('2026-08-29 17:30:00', now)).toBe(
      'last run 2 days ago'
    );
  });

  it('handles future or invalid timestamps safely', () => {
    expect(lastRunTextFor('2026-08-31 19:00:00', now)).toBe(
      'last run less than 1 hour ago'
    );
    expect(lastRunTextFor('invalid', now)).toBe('last run recently');
  });
});
