import { ChecklistKey, CHECKLIST_KEYS } from './constants';

/**
 * Format a Date → "YYYY-MM-DD" using LOCAL calendar components.
 * NEVER use toISOString() here — that converts to UTC and shifts the date
 * in timezones ahead of UTC (e.g. IST UTC+5:30 makes midnight → prev day).
 */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today as YYYY-MM-DD (local time) */
export function today(): string {
  return formatDate(new Date());
}

/**
 * Parse "YYYY-MM-DD" into a local Date without timezone ambiguity.
 * new Date("2026-03-17") is parsed as UTC midnight → wrong in +5:30.
 * new Date(2026, 2, 17) is always local midnight → correct everywhere.
 */
export function parseLocal(dateStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

/** Day-of-week index 0=Mon … 6=Sun */
export function dayOfWeekFromDate(dateStr: string): number {
  const js = parseLocal(dateStr).getDay(); // 0=Sun
  return js === 0 ? 6 : js - 1;
}

/** Monday of the ISO week containing dateStr */
export function mondayOf(dateStr: string): Date {
  const d = parseLocal(dateStr);
  const dow = d.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

/** 7 date strings Mon–Sun for the week containing dateStr */
export function weekDates(dateStr: string): string[] {
  const mon = mondayOf(dateStr);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return formatDate(d);
  });
}

/** "Mon", "Tue"… */
export function dayShort(dateStr: string): string {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayOfWeekFromDate(dateStr)];
}

/** "Monday", "Tuesday"… */
export function dayFull(dateStr: string): string {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayOfWeekFromDate(dateStr)];
}

/** "March 2026" */
export function monthYearLabel(dateStr: string): string {
  return parseLocal(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Days in a given month */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** All YYYY-MM-DD strings for a calendar month */
export function monthDates(year: number, month: number): string[] {
  return Array.from({ length: daysInMonth(year, month) }, (_, i) =>
    formatDate(new Date(year, month - 1, i + 1))
  );
}

/** Completion % for a day log */
export function calcCompletion(
  planned: Record<ChecklistKey, boolean>,
  completed: Record<ChecklistKey, boolean>
): number {
  const plannedKeys = CHECKLIST_KEYS.filter(k => planned[k]);
  if (plannedKeys.length === 0) return 0;
  const done = plannedKeys.filter(k => completed[k]).length;
  return Math.round((done / plannedKeys.length) * 100);
}

/** Average completion across multiple log entries */
export function avgCompletion(
  entries: Array<{ planned: Record<ChecklistKey, boolean>; completed: Record<ChecklistKey, boolean> }>
): number {
  if (entries.length === 0) return 0;
  const sum = entries.reduce((acc, e) => acc + calcCompletion(e.planned, e.completed), 0);
  return Math.round(sum / entries.length);
}

/** BMI value + label */
export function calcBMI(weightKg: number, heightCm: number): { value: number; label: string } {
  if (!weightKg || !heightCm) return { value: 0, label: '—' };
  const h = heightCm / 100;
  const bmi = parseFloat((weightKg / (h * h)).toFixed(1));
  const label =
    bmi < 18.5 ? 'Underweight' :
    bmi < 25   ? 'Normal'      :
    bmi < 30   ? 'Overweight'  : 'Obese';
  return { value: bmi, label };
}

export function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
}

// ─── Haptics ──────────────────────────────────────────────────────────────────
export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error';

/**
 * haptic(style) — unified haptic feedback.
 * Falls back to navigator.vibrate on Android WebView / Chrome.
 * On iOS/Capacitor the native HapticsAPI would layer on top of this.
 */
export function haptic(style: HapticStyle = 'light'): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  const patterns: Record<HapticStyle, number | number[]> = {
    light:   6,
    medium:  12,
    heavy:   22,
    success: [8, 55, 8],   // double-tap feel — achievement
    error:   [18, 40, 18], // buzz — warning
  };
  navigator.vibrate(patterns[style]);
}

/** @deprecated use haptic() */
export function vibrate(ms = 8): void { haptic('light'); void ms; }

/**
 * Consecutive days streak — counts days where completion ≥ 50%.
 *
 * Fixes vs. previous version:
 * 1. Gap detection: if a calendar day has no log at all (user never opened
 *    the app that day) the streak resets — previously it silently skipped
 *    missing dates and gave inflated counts.
 * 2. Rest-day neutral: days with zero planned items (pure rest days) neither
 *    add to the streak count NOR break it — they are skipped over.
 * 3. Today grace: if today is still in-progress (< 50%) the streak does not
 *    break — yesterday's streak is preserved while the user works toward
 *    completing today.
 */
export function calcStreak(
  logs: Array<{ date: string; planned: Record<ChecklistKey, boolean>; completed: Record<ChecklistKey, boolean> }>,
  todayStr: string,
): number {
  // O(1) lookup by date string
  const logMap = new Map(logs.map(l => [l.date, l]));
  let count = 0;

  // Walk backwards from today, one calendar day at a time
  const cursor = parseLocal(todayStr);

  for (let i = 0; i < 365; i++) {
    const dateStr = formatDate(cursor);
    const log     = logMap.get(dateStr);

    if (!log) {
      if (i === 0) {
        // Today not yet logged (app just opened) — skip forward to yesterday
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break; // Gap in a past day → streak resets
    }

    const plannedCount = CHECKLIST_KEYS.filter(k => log.planned[k]).length;

    if (plannedCount === 0) {
      // Rest day — skip without breaking the streak
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    const pct = calcCompletion(log.planned, log.completed);

    if (pct >= 50) {
      count++;
    } else if (i === 0) {
      // Today is in-progress — don't penalise; keep yesterday's streak intact
    } else {
      break; // Past day below threshold → streak ends
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
}

export function insightMessage(pct: number): string {
  if (pct >= 80) return 'Great consistency! Keep it up.';
  if (pct >= 50) return 'Good progress — push a little harder.';
  return 'Stay consistent. Every day counts.';
}
