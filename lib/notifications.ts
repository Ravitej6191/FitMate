'use client';

import { Capacitor } from '@capacitor/core';
import type { NotificationPrefs } from './store';

// Notification IDs — fixed so we can cancel/replace them reliably
const ID_MORNING = 1001;
const ID_WATER   = 1002;
const ID_EVENING = 1003;

/**
 * Returns the LocalNotifications plugin ONLY when running inside a real
 * Capacitor native container (Android/iOS).  Returns null everywhere else
 * (browser dev, SSR build) so all notification calls become harmless no-ops.
 *
 * We cannot rely on try/catch alone because Capacitor's web stub throws
 * "not implemented on web" as an uncaught rejection that escapes catch blocks.
 */
async function getPlugin() {
  if (typeof window === 'undefined') return null;
  if (!Capacitor.isNativePlatform()) return null;   // ← browser / desktop → skip
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    return LocalNotifications;
  } catch {
    return null;
  }
}

/**
 * Creates the Android notification channel + requests display permission.
 * Returns true if we should proceed (permission is not explicitly denied).
 *
 * Robustness notes:
 * - On some Android versions Capacitor returns 'prompt' immediately after
 *   the user taps "Allow" in the system dialog, even though permission was
 *   granted. Checking === 'granted' would block the toggle — so we accept
 *   anything that is NOT explicitly 'denied'.
 * - If the permission was already granted in a previous session,
 *   checkPermissions() returns 'granted' without showing any dialog.
 * - If any call throws unexpectedly, we proceed optimistically rather than
 *   silently disabling the feature.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const plugin = await getPlugin();
  if (!plugin) return false; // not a native platform — no-op

  try {
    // (Re-)create channel — safe to call repeatedly, Android ignores duplicates
    await plugin.createChannel({
      id:          'fitmate-reminders',
      name:        'FitMate Reminders',
      description: 'Daily workout, hydration, and evening reminders',
      importance:  4,   // HIGH — shows heads-up banner in status bar
      visibility:  1,   // PUBLIC
      vibration:   true,
      sound:       'default',
    });
  } catch { /* channel API unavailable on some older builds — ignore */ }

  try {
    // Fast path: already granted → skip the system dialog
    const current = await plugin.checkPermissions();
    if (current.display === 'granted') return true;

    // Request the permission — shows the Android 13+ POST_NOTIFICATIONS dialog
    const result = await plugin.requestPermissions();

    // Accept any outcome except an explicit 'denied' so we don't block
    // the toggle when Capacitor mis-reports 'prompt' after the user
    // already tapped "Allow" (observed on some Samsung/Xiaomi devices).
    return result.display !== 'denied';
  } catch {
    // If permission check/request throws for any reason, proceed optimistically.
    // Android will silently drop notifications if the OS hasn't granted them.
    return true;
  }
}

/**
 * Cancel all pending FitMate notifications, then re-schedule based on prefs.
 * Call this whenever notification prefs change.
 *
 * Schedule format notes (Capacitor Local Notifications v8):
 *   - `on: { hour, minute }` fires every day at that time (no `every:` needed).
 *   - `allowWhileIdle: true` is required on Android so the alarm fires in
 *     Doze / battery-saver mode (uses setExactAndAllowWhileIdle under the hood).
 *   - The notification channel must exist before scheduling on Android 8+.
 *     We (re-)create it here so scheduling works even after app updates that
 *     clear channels or on first runs where only scheduling is called.
 */
export async function scheduleAllNotifications(prefs: NotificationPrefs): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;

  // (Re-)create the channel every time — Android ignores duplicate channel IDs,
  // so this is safe and guarantees the channel always exists before scheduling.
  try {
    await plugin.createChannel({
      id:          'fitmate-reminders',
      name:        'FitMate Reminders',
      description: 'Daily workout, hydration, and evening reminders',
      importance:  4,   // HIGH — shows in status bar
      visibility:  1,   // PUBLIC
      vibration:   true,
      sound:       'default',
    });
  } catch { /* ignore — channel API missing on some older Android builds */ }

  // Always cancel existing ones first to avoid duplicates
  try {
    const pending = await plugin.getPending();
    const fitmate = pending.notifications.filter(n =>
      [ID_MORNING, ID_WATER, ID_EVENING].includes(n.id)
    );
    if (fitmate.length > 0) await plugin.cancel({ notifications: fitmate });
  } catch { /* ignore */ }

  if (!prefs.enabled) return; // master switch off — done

  const toSchedule: Parameters<typeof plugin.schedule>[0]['notifications'] = [];

  if (prefs.morningEnabled) {
    toSchedule.push({
      id:        ID_MORNING,
      title:     'Good morning! 💪',
      body:      "Your plan is ready — let's crush today.",
      channelId: 'fitmate-reminders',
      // `on: { hour, minute }` alone = fires every day at this time.
      // Do NOT combine with `every:` — it causes duplicate/incorrect scheduling.
      schedule:  { on: { hour: prefs.morningHour, minute: prefs.morningMinute }, allowWhileIdle: true },
      extra:     { type: 'morning' },
    });
  }

  if (prefs.waterEnabled) {
    toSchedule.push({
      id:        ID_WATER,
      title:     'Hydration check 💧',
      body:      "Don't forget to log your water intake.",
      channelId: 'fitmate-reminders',
      schedule:  { on: { hour: prefs.waterHour, minute: prefs.waterMinute }, allowWhileIdle: true },
      extra:     { type: 'water' },
    });
  }

  if (prefs.eveningEnabled) {
    toSchedule.push({
      id:        ID_EVENING,
      title:     'Evening check-in 🌙',
      body:      'Log your activities before the day wraps up.',
      channelId: 'fitmate-reminders',
      schedule:  { on: { hour: prefs.eveningHour, minute: prefs.eveningMinute }, allowWhileIdle: true },
      extra:     { type: 'evening' },
    });
  }

  if (toSchedule.length > 0) {
    try {
      await plugin.schedule({ notifications: toSchedule });
    } catch (e) {
      console.warn('[FitMate] Schedule error:', e);
    }
  }
}

/** Cancel all FitMate notifications (e.g. on data reset) */
export async function cancelAllNotifications(): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    const pending = await plugin.getPending();
    const fitmate = pending.notifications.filter(n =>
      [ID_MORNING, ID_WATER, ID_EVENING].includes(n.id)
    );
    if (fitmate.length > 0) await plugin.cancel({ notifications: fitmate });
  } catch { /* ignore */ }
}
