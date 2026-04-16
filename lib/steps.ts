'use client';

import { registerPlugin } from '@capacitor/core';

// ─── Plugin Interface ─────────────────────────────────────────────────────────

interface StepCounterPlugin {
  getStepCount(): Promise<{ steps: number; supported: boolean }>;
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
 * Device reboot mid-day    → sensor drops below baseline → Math.max(0, …) = 0.
 */
export async function getTodaySteps(): Promise<StepResult> {
  try {
    const { steps: sensorValue, supported } = await StepCounter.getStepCount();

    if (!supported) return { steps: 0, supported: false };
    if (sensorValue === 0) return { steps: 0, supported: true };

    // Use LOCAL calendar components — same as formatDate() in utils.ts.
    // toISOString() is UTC-based: in IST (UTC+5:30) it returns yesterday's date
    // before 5:30 AM, which would store the wrong baseline for the whole day.
    const _d = new Date();
    const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
    const saved = readBaseline();

    if (!saved || saved.date !== todayStr) {
      // New day (or first install) — store current reading as today's baseline
      writeBaseline(todayStr, sensorValue);
      return { steps: 0, supported: true };
    }

    // Normal case: subtract midnight baseline
    const todaySteps = Math.max(0, sensorValue - saved.value);
    return { steps: todaySteps, supported: true };

  } catch {
    return { steps: 0, supported: false };
  }
}

/**
 * One-time permission request for ACTIVITY_RECOGNITION (Android 10+).
 * The permission is declared in AndroidManifest.xml — this requests it at runtime.
 * Returns true if already granted or just granted.
 */
export async function requestActivityPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    // Capacitor doesn't have a standalone ACTIVITY_RECOGNITION plugin,
    // but reading the sensor on Android 10+ will prompt the system permission dialog
    // automatically on first getStepCount() call. So a test-read is enough.
    const { supported } = await StepCounter.getStepCount();
    return supported;
  } catch {
    return false;
  }
}
