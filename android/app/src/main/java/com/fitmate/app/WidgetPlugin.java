package com.fitmate.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetPlugin")
public class WidgetPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        int steps = call.getInt("steps", 0);
        int stepsGoal = call.getInt("stepsGoal", 8000);
        int completionPct = call.getInt("completionPct", 0);
        String workoutName = call.getString("workoutName", "");

        Context ctx = getContext();
        SharedPreferences prefs = ctx.getSharedPreferences("fitmate_widget", Context.MODE_PRIVATE);
        prefs.edit()
            .putInt("steps", steps)
            .putInt("stepsGoal", stepsGoal)
            .putInt("completionPct", completionPct)
            .putString("workoutName", workoutName)
            .apply();

        // Trigger widget update
        android.appwidget.AppWidgetManager manager = android.appwidget.AppWidgetManager.getInstance(ctx);
        int[] ids = manager.getAppWidgetIds(
            new android.content.ComponentName(ctx, FitMateWidgetProvider.class)
        );
        if (ids.length > 0) {
            FitMateWidgetProvider.updateWidgets(ctx, manager, ids);
        }

        call.resolve();
    }
}
