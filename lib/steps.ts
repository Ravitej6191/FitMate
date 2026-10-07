'use client';

import { registerPlugin } from '@capacitor/core';

// ─── Plugin Interface ─────────────────────────────────────────────────────────

interface StepCounterPlugin {
  getStepCount(): Promise<{ steps: number; supported: boolean; baseline?: number; baselineDate?: string }>;
}

/**
 * Register the native plugin.
 * The `web` fallback makes it safe to call in the browser / during SSR build.
 */
const StepCounter = registerPlugin<StepCounterPlugin>('StepCounter', {
  web: () => ({
    getStepCount: async () => ({ steps: 0, supported: false }),
  }),
});

// ─── Baseline Storage ─────────────────────────────────────────────────────────

const BASELINE_KEY = 'fitmate_step_baseline';

type Baseline = { date: string; value: number };

function readBaseline(): Baseline | null {
  try {
    const raw = localStorage.getItem(BASELINE_KEY);
    return raw ? (JSON.parse(raw) as Baseline) : null;
  } catch {
    return null;
  }
}

function writeBaseline(date: string, value: number) {
  try {
    localStorage.setItem(BASELINE_KEY, JSON.stringify({ date, value }));
  } catch { /* ignore */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type StepResult = {
  steps: number;      // today's steps
  supported: boolean; // whether hardware step counter is present
};

/**
 * Returns today's step count.
 *
 * How it works (same as Apple Health / Google Fit):
 *  - Android's TYPE_STEP_COUNTER sensor is a cumulative hardware counter that
 *    the OS keeps running 24/7, even when the app is closed.  It resets only
 *    on device reboot.
 *  - We store a "baseline" (the sensor value at the start of each day).
 *  - Today's steps = currentSensorValue − baseline.
 *
 * First open of a new day  → reset baseline, return 0.
 * Device reboot mid-day    → sensor drops below baseline → steps since boot are counted.
 */
export async function getTodaySteps(): Promise<StepResult> {
  try {
    const { steps: sensorValue, supported, baseline, baselineDate } = await StepCounter.getStepCount();

    if (!supported) return { steps: 0, supported: false };
    if (sensorValue === 0) return { steps: 0, supported: true };

    // Use LOCAL calendar components — same as formatDate() in utils.ts.
    // toISOString() is UTC-based: in IST (UTC+5:30) it returns yesterday's date
    // before 5:30 AM, which would store the wrong baseline for the whole day.
    const _d = new Date();
    const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
    // Preferred: baseline captured natively just after midnight (correct even if the
    // app wasn't opened until later in the day). A sensor reading below it means the
    // device rebooted since, so the counter restarted from 0.
    if (baselineDate === todayStr && typeof baseline === 'number') {
      return { steps: sensorValue >= baseline ? sensorValue - baseline : sensorValue, supported: true };
    }

    // Fallback (first install day, or no snapshot yet): baseline = first reading of the day.
    const saved = readBaseline();

    if (!saved || saved.date !== todayStr) {
      writeBaseline(todayStr, sensorValue);
      return { steps: 0, supported: true };
    }

    // Counter went backwards → device rebooted; everything since boot is today's.
    if (sensorValue < saved.value) {
      writeBaseline(todayStr, 0);
      return { steps: sensorValue, supported: true };
    }
    return { steps: sensorValue - saved.value, supported: true };

  } catch {
    return { steps: 0, supported: false };
  }
}
