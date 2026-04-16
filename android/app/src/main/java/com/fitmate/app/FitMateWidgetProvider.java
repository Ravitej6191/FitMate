package com.fitmate.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class FitMateWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        updateWidgets(ctx, mgr, ids);
    }

    public static void updateWidgets(Context ctx, AppWidgetManager mgr, int[] ids) {
        SharedPreferences prefs = ctx.getSharedPreferences("fitmate_widget", Context.MODE_PRIVATE);
        int steps = prefs.getInt("steps", 0);
        int stepsGoal = prefs.getInt("stepsGoal", 8000);
        int completionPct = prefs.getInt("completionPct", 0);
        String workoutName = prefs.getString("workoutName", "Today");

        String stepsStr = steps >= 1000
            ? String.format("%.1fk", steps / 1000.0)
            : String.valueOf(steps);

        Intent intent = new Intent(ctx, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        for (int id : ids) {
            RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_fitmate);
            views.setTextViewText(R.id.widget_steps, stepsStr + " steps");
            views.setTextViewText(R.id.widget_goal, "Goal: " + stepsGoal);
            views.setTextViewText(R.id.widget_completion, completionPct + "% done");
            views.setTextViewText(R.id.widget_workout, workoutName);
            views.setProgressBar(R.id.widget_progress, 100, completionPct, false);
            views.setOnClickPendingIntent(R.id.widget_root, pi);
            mgr.updateAppWidget(id, views);
        }
    }
}
