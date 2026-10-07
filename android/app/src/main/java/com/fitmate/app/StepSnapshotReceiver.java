package com.fitmate.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Handler;
import android.os.Looper;

import java.util.Calendar;
import java.util.Locale;

/**
 * Records the hardware step-counter value shortly after local midnight so that
 * "today's steps" is correct even if the app isn't opened until later in the day.
 * Also re-arms itself after reboot. Uses an inexact alarm (no exact-alarm permission).
 */
public class StepSnapshotReceiver extends BroadcastReceiver {
    static final String PREFS = "fitmate_steps";
    static final String KEY_DATE = "baseline_date";
    static final String KEY_VALUE = "baseline_value";

    static String todayString() {
        Calendar c = Calendar.getInstance();
        return String.format(Locale.US, "%04d-%02d-%02d",
                c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    /** Schedule the next snapshot for just after the coming local midnight. */
    static void schedule(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Calendar c = Calendar.getInstance();
        c.add(Calendar.DAY_OF_YEAR, 1);
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 5);
        c.set(Calendar.MILLISECOND, 0);
        Intent i = new Intent(ctx, StepSnapshotReceiver.class);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, 4201, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, c.getTimeInMillis(), pi);
    }

    @Override
    public void onReceive(final Context ctx, Intent intent) {
        schedule(ctx);
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return; // sensor restarted at 0

        final PendingResult pending = goAsync();
        final SensorManager sm = (SensorManager) ctx.getSystemService(Context.SENSOR_SERVICE);
        final Sensor sensor = sm == null ? null : sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if (sensor == null) { pending.finish(); return; }

        final SensorEventListener listener = new SensorEventListener() {
            private boolean done = false;
            @Override public void onSensorChanged(SensorEvent e) {
                if (done) return;
                done = true;
                sm.unregisterListener(this);
                ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                        .putString(KEY_DATE, todayString())
                        .putLong(KEY_VALUE, (long) e.values[0])
                        .apply();
                pending.finish();
            }
            @Override public void onAccuracyChanged(Sensor s, int a) {}
        };
        if (!sm.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)) {
            pending.finish();
            return;
        }
        // Safety net: never hold the receiver open for long
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            sm.unregisterListener(listener);
            try { pending.finish(); } catch (IllegalStateException ignored) {}
        }, 8000);
    }
}
