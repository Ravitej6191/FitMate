'use client';
import { registerPlugin } from '@capacitor/core';

export type WidgetData = { steps: number; stepsGoal: number; completionPct: number; workoutName: string };

interface WidgetPluginApi {
  update(data: WidgetData): Promise<void>;
}

/** Native home-screen widget bridge (WidgetPlugin.java). No-op on web. */
export const WidgetPlugin = registerPlugin<WidgetPluginApi>('WidgetPlugin', {
  web: () => ({ update: async () => {} }),
});
