import { describe, it, expect } from 'vitest';
import { calcCompletion, calcStreak, formatDate, parseLocal, dayOfWeekFromDate } from '@/lib/utils';
import { CHECKLIST_KEYS, ChecklistKey } from '@/lib/constants';

const flags = (on: ChecklistKey[]) =>
  Object.fromEntries(CHECKLIST_KEYS.map(k => [k, on.includes(k)])) as Record<ChecklistKey, boolean>;

const [k1, k2, k3, k4] = CHECKLIST_KEYS;
const day = (date: string, planned: ChecklistKey[], completed: ChecklistKey[]) =>
  ({ date, planned: flags(planned), completed: flags(completed) });

describe('dates', () => {
  it('formatDate/parseLocal round-trip using local components', () => {
    expect(formatDate(parseLocal('2026-03-17'))).toBe('2026-03-17');
  });
  it('dayOfWeekFromDate: Monday=0, Sunday=6', () => {
    expect(dayOfWeekFromDate('2026-10-05')).toBe(0); // Monday
    expect(dayOfWeekFromDate('2026-10-11')).toBe(6); // Sunday
  });
});

describe('calcCompletion', () => {
  it('is 0 when nothing is planned', () => {
    expect(calcCompletion(flags([]), flags([k1]))).toBe(0);
  });
  it('counts only planned items', () => {
    expect(calcCompletion(flags([k1, k2]), flags([k1, k3]))).toBe(50);
  });
  it('is 100 when all planned items are done', () => {
    expect(calcCompletion(flags([k1, k2, k3, k4]), flags([k1, k2, k3, k4]))).toBe(100);
  });
});

describe('calcStreak', () => {
  const today = '2026-10-07';
  it('is 0 with no logs', () => {
    expect(calcStreak([], today)).toBe(0);
  });
  it('counts consecutive days at >= 50%', () => {
    const logs = [
      day('2026-10-07', [k1, k2], [k1]),
      day('2026-10-06', [k1, k2], [k1, k2]),
      day('2026-10-05', [k1, k2], [k1]),
    ];
    expect(calcStreak(logs, today)).toBe(3);
  });
  it('does not break on an in-progress today', () => {
    const logs = [
      day('2026-10-07', [k1, k2], []),
      day('2026-10-06', [k1, k2], [k1, k2]),
    ];
    expect(calcStreak(logs, today)).toBe(1);
  });
  it('skips rest days without breaking', () => {
    const logs = [
      day('2026-10-07', [k1], [k1]),
      day('2026-10-06', [], []),
      day('2026-10-05', [k1], [k1]),
    ];
    expect(calcStreak(logs, today)).toBe(2);
  });
  it('breaks on a missed past day', () => {
    const logs = [
      day('2026-10-07', [k1], [k1]),
      day('2026-10-06', [k1, k2], []),
      day('2026-10-05', [k1], [k1]),
    ];
    expect(calcStreak(logs, today)).toBe(1);
  });
  it('breaks on a gap in the logs', () => {
    const logs = [day('2026-10-07', [k1], [k1]), day('2026-10-05', [k1], [k1])];
    expect(calcStreak(logs, today)).toBe(1);
  });
});
