package com.fitmate.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * StepCounterPlugin
 *
 * Reads Android's hardware TYPE_STEP_COUNTER sensor — a cumulative counter
 * that the OS increments continuously (even when the app is closed), resetting
 * only on device reboot. The TypeScript layer stores a daily baseline so it can
 * compute "today's steps" as (currentSensorValue - midnightBaseline).
 *
 * On Android 10+ (API 29+) ACTIVITY_RECOGNITION must be requested at runtime.
 * This plugin requests it automatically on the first getStepCount() call if
 * it hasn't been granted yet.
 */
@CapacitorPlugin(
    name = "StepCounter",
    permissions = {
        @Permission(
            alias = "activityRecognition",
            strings = { "android.permission.ACTIVITY_RECOGNITION" }
        )
    }
)
public class StepCounterPlugin extends Plugin {

    // The pending call when we need to ask for permission before we can read the sensor
    private PluginCall pendingPermissionCall;

    @PluginMethod
    public void getStepCount(final PluginCall call) {
        // Android 10+ (API 29) requires ACTIVITY_RECOGNITION at runtime.
        // On older versions the permission is not declared and always passes.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            String permission = Manifest.permission.ACTIVITY_RECOGNITION;
            int granted = ActivityCompat.checkSelfPermission(getContext(), permission);

            if (granted != PackageManager.PERMISSION_GRANTED) {
                // Store the call so we can resume it after the user responds
                pendingPermissionCall = call;
                // Ask Capacitor to show the system permission dialog
                requestPermissionForAlias("activityRecognition", call, "activityRecognitionResult");
                return;
            }
        }

        // Permission is granted (or not needed) — read the sensor
        readSensor(call);
    }

    /**
     * Called by Capacitor after the user has responded to the ACTIVITY_RECOGNITION dialog.
     */
    @PermissionCallback
    private void activityRecognitionResult(PluginCall call) {
        String permission = Manifest.permission.ACTIVITY_RECOGNITION;
        int granted = ActivityCompat.checkSelfPermission(getContext(), permission);

        if (granted == PackageManager.PERMISSION_GRANTED) {
            readSensor(call);
        } else {
            // User denied — return supported:false so the UI hides the step widget
            resolve(call, 0, false);
        }
    }

    /**
     * Registers a one-shot sensor listener and resolves the Capacitor call when the
     * first reading arrives. If the device has no hardware step counter, resolves
     * immediately with supported:false.
     */
    private void readSensor(final PluginCall call) {
        Context ctx = getContext();
        SensorManager sm = (SensorManager) ctx.getSystemService(Context.SENSOR_SERVICE);

        if (sm == null) {
            resolve(call, 0, false);
            return;
        }

        Sensor stepSensor = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        if (stepSensor == null) {
            // Device does not have a hardware step counter
            resolve(call, 0, false);
            return;
        }

        // Register a one-shot listener: fire once, return value, unregister
        SensorEventListener listener = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                sm.unregisterListener(this);
                // event.values[0] is the cumulative step count (float, cast to long)
                resolve(call, (long) event.values[0], true);
            }

            @Override
            public void onAccuracyChanged(Sensor sensor, int accuracy) {
                // Not needed
            }
        };

        boolean registered = sm.registerListener(
                listener,
                stepSensor,
                SensorManager.SENSOR_DELAY_NORMAL
        );

        if (!registered) {
            resolve(call, 0, false);
        }
        // If registered, we wait for onSensorChanged — Capacitor keeps the PluginCall alive
    }

    private void resolve(PluginCall call, long steps, boolean supported) {
        JSObject result = new JSObject();
        result.put("steps", steps);
        result.put("supported", supported);
        call.resolve(result);
    }
}
