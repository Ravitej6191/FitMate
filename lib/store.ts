'use client';
import { create } from 'zustand';
import { CHECKLIST_KEYS, ChecklistKey, STORAGE_KEY, MAX_LOGS } from './constants';
import { today, dayOfWeekFromDate, calcStreak, calcCompletion } from './utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChecklistState = Record<ChecklistKey, boolean>;
export type ChecklistNotes = Record<ChecklistKey, string>;

export type ExerciseSet   = { reps: number; weight: number }; // weight in kg; 0 = bodyweight
export type ExerciseEntry = { name: string; sets: ExerciseSet[] };
export type MacroEntry    = { id: string; name: string; calories: number; protein: number; carbs: number; fat: number };
export type MacroTargets  = { calories: number; protein: number; carbs: number; fat: number };
export type Goal          = { id: string; title: string; type: 'steps' | 'streak' | 'workouts' | 'water' | 'custom'; target: number; unit: string; achieved: boolean; achievedDate?: string; createdDate: string; progress?: number };

/** What you plan to do on a given day of the week — repeats every week */
export type DayTemplate = {
  dayOfWeek: number;     // 0=Mon … 6=Sun
  workoutName: string;
  enabled: ChecklistState; // which items are planned for this day
  notes: ChecklistNotes;   // detail notes per item, e.g. "Dal and Curry"
  exercises: ExerciseEntry[]; // planned exercises for this workout day
};

/** A concrete daily entry created from the template when the day starts */
export type DayLog = {
  date: string;              // YYYY-MM-DD
  workoutName: string;
  planned: ChecklistState;   // snapshot of template.enabled at creation
  completed: ChecklistState; // what was actually ticked off
  notes: ChecklistNotes;     // snapshot of template.notes at creation
  waterIntake: number;       // litres consumed today (increments of 0.5 L)
  stepCount: number;         // steps synced from hardware sensor today
  exercises: ExerciseEntry[];
  macros:    MacroEntry[];
};

export type NotificationPrefs = {
  enabled: boolean;
  morningEnabled: boolean;
  morningHour: number;
  morningMinute: number;
  waterEnabled: boolean;
  waterHour: number;
  waterMinute: number;
  eveningEnabled: boolean;
  eveningHour: number;
  eveningMinute: number;
};

export type UserProfile = {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  heightCm: number;
  weightKg: number;
  goal: string;
  waterTarget: number;       // daily water goal in litres (default 4.0, steps of 0.5)
  stepGoal: number;          // daily step goal (default 8000)
  photoBase64?: string;      // compressed JPEG base64 for profile photo (manual upload)
  email?: string;            // Google account email (set on Google sign-in)
  googlePhotoUrl?: string;   // Google profile photo URL (set on Google sign-in)
  notifications: NotificationPrefs;
  theme: 'dark' | 'light';
  macroTargets: MacroTargets;
};

export type AppState = {
  template: DayTemplate[];
  logs: DayLog[];
  profile: UserProfile;
  selectedDate: string;
  goals: Goal[];
  unlockedAchievements: string[];

  toggleItem: (date: string, key: ChecklistKey) => void;
  markAllDone: (date: string) => void;
  updateTemplate: (dayOfWeek: number, patch: Partial<Omit<DayTemplate, 'dayOfWeek'>>) => void;
  toggleTemplateItem: (dayOfWeek: number, key: ChecklistKey) => void;
  updateTemplateNote: (dayOfWeek: number, key: ChecklistKey, note: string) => void;
  addTemplateExercise:    (dayOfWeek: number, entry: ExerciseEntry) => void;
  updateTemplateExercise: (dayOfWeek: number, index: number, entry: ExerciseEntry) => void;
  removeTemplateExercise: (dayOfWeek: number, index: number) => void;
  setWater: (date: string, litres: number) => void;
  setSteps: (date: string, steps: number) => void;
  setSelectedDate: (date: string) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  ensureLog: (date: string) => void;
  initStore: () => void;
  resetStore: () => void;
  /** Replace all data with a backup produced by exportData(). Returns false if invalid. */
  importData: (raw: string) => boolean;
  /** Serialise all persisted data as a JSON backup string. */
  exportData: () => string;

  addExercise:      (date: string, entry: ExerciseEntry) => void;
  updateExercise:   (date: string, index: number, entry: ExerciseEntry) => void;
  removeExercise:   (date: string, index: number) => void;
  addMacro:         (date: string, entry: Omit<MacroEntry, 'id'>) => void;
  removeMacro:      (date: string, id: string) => void;
  addGoal:            (g: Omit<Goal, 'id' | 'achieved' | 'achievedDate' | 'createdDate'>) => void;
  removeGoal:         (id: string) => void;
  markGoalAchieved:   (id: string) => void;
  updateGoalProgress: (id: string, progress: number) => void;
  unlockAchievement:(id: string) => void;
  checkAchievements:() => void;
  setTheme:         (theme: 'dark' | 'light') => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyChecklist(): ChecklistState {
  return Object.fromEntries(CHECKLIST_KEYS.map(k => [k, false])) as ChecklistState;
}

function emptyNotes(): ChecklistNotes {
  return Object.fromEntries(CHECKLIST_KEYS.map(k => [k, ''])) as ChecklistNotes;
}

function defaultTemplate(): DayTemplate[] {
  const workouts = ['Push Day', 'Pull Day', 'Leg Day', 'Push Day', 'Pull Day', 'Cardio', 'Yoga'];
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    workoutName: workouts[i],
    enabled: {
      workout: true,
      breakfast: true,
      lunch: true,
      midDaySnacks: i < 5,
      dinner: true,
      proteinShake: i < 6,
    },
    notes: emptyNotes(),
    exercises: [],
  }));
}

function defaultNotifications(): NotificationPrefs {
  return {
    enabled: false,
    morningEnabled: true,  morningHour: 7,  morningMinute: 0,
    waterEnabled:   true,  waterHour:   14, waterMinute:   0,
    eveningEnabled: true,  eveningHour: 20, eveningMinute: 0,
  };
}

function defaultProfile(): UserProfile {
  return {
    name: 'Athlete', age: 25, gender: 'male',
    heightCm: 175, weightKg: 75, goal: 'Build Muscle',
    waterTarget: 4.0,
    stepGoal: 8000,
    notifications: defaultNotifications(),
    theme: 'light',
    macroTargets: { calories: 2000, protein: 150, carbs: 250, fat: 65 },
  };
}

function makeLog(date: string, tpl: DayTemplate): DayLog {
  return {
    date,
    workoutName: tpl.workoutName,
    planned: { ...tpl.enabled },
    completed: emptyChecklist(),
    notes: { ...(tpl.notes ?? emptyNotes()) },
    waterIntake: 0,
    stepCount: 0,
    exercises: tpl.exercises ? tpl.exercises.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s })) })) : [],
    macros: [],
  };
}

// Debounced persist — batches rapid updates (e.g. fast water taps) into one write.
// The latest pending snapshot is kept so it can be flushed immediately when the
// app is backgrounded (see flushPersist) instead of being lost to the debounce.
type Persisted = Pick<AppState, 'template' | 'logs' | 'profile' | 'selectedDate' | 'goals' | 'unlockedAchievements'>;
let _persistTimer: ReturnType<typeof setTimeout> | null = null;
let _pending: Persisted | null = null;

function writeNow(state: Persisted) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      template: state.template,
      logs: state.logs.slice(-MAX_LOGS),
      profile: state.profile,
      goals: state.goals,
      unlockedAchievements: state.unlockedAchievements,
    }));
  } catch (err) {
    // Most likely quota exceeded (e.g. large profile photo) — don't fail silently.
    console.warn('[FitMate] Failed to save data:', err);
  }
}

/** Write any pending state right now. Safe to call at any time. */
export function flushPersist() {
  if (_persistTimer) { clearTimeout(_persistTimer); _persistTimer = null; }
  if (_pending) { const s = _pending; _pending = null; writeNow(s); }
}

function persist(state: Persisted) {
  _pending = state;
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(flushPersist, 250);
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  template: defaultTemplate(),
  logs: [],
  profile: defaultProfile(),
  selectedDate: today(),
  goals: [],
  unlockedAchievements: [],

  initStore: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // Migrate old template entries that lack notes field
        const template: DayTemplate[] = (saved.template ?? defaultTemplate()).map((t: DayTemplate) => ({
          ...t,
          notes: t.notes ?? emptyNotes(),
          exercises: t.exercises ?? [],
        }));
        // Migrate old logs that lack notes/stepCount/exercises/macros fields
        const logs: DayLog[] = (saved.logs ?? []).map((l: DayLog & { waterGlasses?: number }) => ({
          ...l,
          notes: l.notes ?? emptyNotes(),
          // Migrate old "waterGlasses" count (250 ml each) → litres
          waterIntake: l.waterIntake ?? (l.waterGlasses != null ? +(l.waterGlasses * 0.25).toFixed(1) : 0),
          stepCount: l.stepCount ?? 0,
          exercises: l.exercises ?? [],
          macros: l.macros ?? [],
        }));
        const dp = defaultProfile();
        set({
          template,
          logs,
          profile: {
            ...dp,
            ...(saved.profile ?? {}),
            waterTarget:   saved.profile?.waterTarget ?? 4.0,
            stepGoal:      saved.profile?.stepGoal ?? 8000,
            theme:         saved.profile?.theme ?? 'light',
            macroTargets:  { ...dp.macroTargets, ...(saved.profile?.macroTargets ?? {}) },
            // Migrate: older saves won't have notifications — fill with defaults
            notifications: { ...defaultNotifications(), ...(saved.profile?.notifications ?? {}) },
          },
          selectedDate: today(),
          goals: saved.goals ?? [],
          unlockedAchievements: saved.unlockedAchievements ?? [],
        });
      }
    } catch { /* ignore */ }
    get().ensureLog(today());
  },

  ensureLog: (date) => {
    const state = get();
    if (state.logs.find(l => l.date === date)) return;
    const dow = dayOfWeekFromDate(date);
    const log = makeLog(date, state.template[dow]);
    const logs = [...state.logs, log];
    set({ logs });
    persist({ ...state, logs });
  },

  toggleItem: (date, key) => {
    set(state => {
      const logs = state.logs.map(l =>
        l.date === date ? { ...l, completed: { ...l.completed, [key]: !l.completed[key] } } : l
      );
      persist({ ...state, logs });
      return { logs };
    });
    get().checkAchievements();
  },

  markAllDone: (date) => {
    set(state => {
      const logs = state.logs.map(l => {
        if (l.date !== date) return l;
        const completed = { ...l.completed };
        CHECKLIST_KEYS.forEach(k => { if (l.planned[k]) completed[k] = true; });
        return { ...l, completed };
      });
      persist({ ...state, logs });
      return { logs };
    });
    get().checkAchievements();
  },

  updateTemplate: (dayOfWeek, patch) => {
    set(state => {
      const template = state.template.map(t =>
        t.dayOfWeek === dayOfWeek ? { ...t, ...patch } : t
      );
      // Propagate workout name / plan / notes to today and future logs only.
      // Historical logs must not be touched — retroactively changing what was
      // "planned" would corrupt past completion percentages and progress stats.
      const todayStr = today();
      const logs = state.logs.map(l => {
        if (dayOfWeekFromDate(l.date) !== dayOfWeek) return l;
        if (l.date < todayStr) return l; // preserve historical records
        const tpl = template.find(t => t.dayOfWeek === dayOfWeek)!;
        return { ...l, workoutName: tpl.workoutName, planned: { ...tpl.enabled }, notes: { ...tpl.notes } };
      });
      persist({ ...state, template, logs });
      return { template, logs };
    });
  },

  toggleTemplateItem: (dayOfWeek, key) => {
    set(state => {
      const template = state.template.map(t =>
        t.dayOfWeek === dayOfWeek ? { ...t, enabled: { ...t.enabled, [key]: !t.enabled[key] } } : t
      );
      const tpl = template.find(t => t.dayOfWeek === dayOfWeek)!;
      const todayStr = today();
      const logs = state.logs.map(l => {
        if (dayOfWeekFromDate(l.date) !== dayOfWeek) return l;
        if (l.date < todayStr) return l; // preserve historical records
        return { ...l, planned: { ...tpl.enabled } };
      });
      persist({ ...state, template, logs });
      return { template, logs };
    });
  },

  updateTemplateNote: (dayOfWeek, key, note) => {
    set(state => {
      const template = state.template.map(t =>
        t.dayOfWeek === dayOfWeek ? { ...t, notes: { ...t.notes, [key]: note } } : t
      );
      const todayStr = today();
      const logs = state.logs.map(l => {
        if (dayOfWeekFromDate(l.date) !== dayOfWeek) return l;
        if (l.date < todayStr) return l; // preserve historical records
        return { ...l, notes: { ...l.notes, [key]: note } };
      });
      persist({ ...state, template, logs });
      return { template, logs };
    });
  },

  addTemplateExercise: (dayOfWeek, entry) => {
    set(state => {
      const template = state.template.map(t =>
        t.dayOfWeek === dayOfWeek ? { ...t, exercises: [...t.exercises, entry] } : t
      );
      persist({ ...state, template });
      return { template };
    });
  },

  updateTemplateExercise: (dayOfWeek, index, entry) => {
    set(state => {
      const template = state.template.map(t => {
        if (t.dayOfWeek !== dayOfWeek) return t;
        const exercises = [...t.exercises];
        exercises[index] = entry;
        return { ...t, exercises };
      });
      persist({ ...state, template });
      return { template };
    });
  },

  removeTemplateExercise: (dayOfWeek, index) => {
    set(state => {
      const template = state.template.map(t =>
        t.dayOfWeek === dayOfWeek
          ? { ...t, exercises: t.exercises.filter((_, i) => i !== index) }
          : t
      );
      persist({ ...state, template });
      return { template };
    });
  },

  setWater: (date, litres) => {
    set(state => {
      const logs = state.logs.map(l =>
        l.date === date ? { ...l, waterIntake: Math.max(0, +litres.toFixed(1)) } : l
      );
      persist({ ...state, logs });
      return { logs };
    });
    get().checkAchievements();
  },

  setSteps: (date, steps) => {
    set(state => {
      const logs = state.logs.map(l =>
        l.date === date ? { ...l, stepCount: Math.max(0, Math.round(steps)) } : l
      );
      persist({ ...state, logs });
      return { logs };
    });
    get().checkAchievements();
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date });
    get().ensureLog(date);
  },

  updateProfile: (patch) => {
    set(state => {
      const profile = { ...state.profile, ...patch };
      persist({ ...state, profile });
      return { profile };
    });
  },

  // ── Exercise actions ───────────────────────────────────────────────────────
  addExercise: (date, entry) => {
    set(state => {
      const logs = state.logs.map(l =>
        l.date === date ? { ...l, exercises: [...l.exercises, entry] } : l
      );
      persist({ ...state, logs });
      return { logs };
    });
    get().checkAchievements();
  },

  updateExercise: (date, index, entry) => {
    set(state => {
      const logs = state.logs.map(l => {
        if (l.date !== date) return l;
        const exercises = [...l.exercises];
        exercises[index] = entry;
        return { ...l, exercises };
      });
      persist({ ...state, logs });
      return { logs };
    });
  },

  removeExercise: (date, index) => {
    set(state => {
      const logs = state.logs.map(l => {
        if (l.date !== date) return l;
        const exercises = l.exercises.filter((_, i) => i !== index);
        return { ...l, exercises };
      });
      persist({ ...state, logs });
      return { logs };
    });
  },

  // ── Macro actions ──────────────────────────────────────────────────────────
  addMacro: (date, entry) => {
    get().ensureLog(date);          // guarantee the log row exists first
    const id = `macro_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    set(state => {
      const logs = state.logs.map(l =>
        l.date === date ? { ...l, macros: [...l.macros, { ...entry, id }] } : l
      );
      persist({ ...state, logs });
      return { logs };
    });
    get().checkAchievements();
  },

  removeMacro: (date, id) => {
    set(state => {
      const logs = state.logs.map(l =>
        l.date === date ? { ...l, macros: l.macros.filter(m => m.id !== id) } : l
      );
      persist({ ...state, logs });
      return { logs };
    });
  },

  // ── Goal actions ───────────────────────────────────────────────────────────
  addGoal: (g) => {
    const goal: Goal = {
      ...g,
      id: `goal_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      achieved: false,
      createdDate: today(),
    };
    set(state => {
      const goals = [...state.goals, goal];
      persist({ ...state, goals });
      return { goals };
    });
    get().checkAchievements();
  },

  removeGoal: (id) => {
    set(state => {
      const goals = state.goals.filter(g => g.id !== id);
      persist({ ...state, goals });
      return { goals };
    });
  },

  markGoalAchieved: (id) => {
    set(state => {
      const goals = state.goals.map(g =>
        g.id === id ? { ...g, achieved: true, achievedDate: today() } : g
      );
      persist({ ...state, goals });
      return { goals };
    });
    get().checkAchievements();
  },

  updateGoalProgress: (id, progress) => {
    set(state => {
      const goals = state.goals.map(g =>
        g.id === id ? { ...g, progress } : g
      );
      persist({ ...state, goals });
      return { goals };
    });
  },

  // ── Achievement actions ────────────────────────────────────────────────────
  unlockAchievement: (id) => {
    set(state => {
      if (state.unlockedAchievements.includes(id)) return state;
      const unlockedAchievements = [...state.unlockedAchievements, id];
      persist({ ...state, unlockedAchievements });
      return { unlockedAchievements };
    });
  },

  checkAchievements: () => {
    const state = get();
    const { goals, unlockedAchievements } = state;
    const todayStr = today();
    const unlock = (id: string) => {
      if (!unlockedAchievements.includes(id)) get().unlockAchievement(id);
    };
    // Sort logs by date ascending so streak checks that walk backwards from
    // the END of the array work correctly even when logs were appended
    // out-of-order (e.g. user visited a past date after a future date).
    const logs = [...state.logs].sort((a, b) => a.date.localeCompare(b.date));

    // first_workout
    if (logs.some(l => l.completed.workout === true)) unlock('first_workout');

    // streak thresholds
    const streak = calcStreak(logs, todayStr);
    if (streak >= 3)  unlock('streak_3');
    if (streak >= 7)  unlock('streak_7');
    if (streak >= 30) unlock('streak_30');

    // perfect_day
    if (logs.some(l => {
      const planned = CHECKLIST_KEYS.filter(k => l.planned[k]);
      return planned.length > 0 && planned.every(k => l.completed[k]);
    })) unlock('perfect_day');

    // steps thresholds
    if (logs.some(l => l.stepCount >= 5000))  unlock('steps_5k');
    if (logs.some(l => l.stepCount >= 10000)) unlock('steps_10k');

    // first_macro
    if (logs.some(l => l.macros.length > 0)) unlock('first_macro');

    // first_exercise
    if (logs.some(l => l.exercises.length > 0)) unlock('first_exercise');

    // first_goal
    if (goals.length > 0) unlock('first_goal');

    // goal_achieved
    if (goals.some(g => g.achieved)) unlock('goal_achieved');

    // steps_50k_week: any 7 consecutive log entries totalling ≥ 50k steps
    if (logs.length >= 7) {
      for (let i = 0; i <= logs.length - 7; i++) {
        const weekSteps = logs.slice(i, i + 7).reduce((s, l) => s + (l.stepCount ?? 0), 0);
        if (weekSteps >= 50000) { unlock('steps_50k_week'); break; }
      }
    }

    // hydrated_7: 7 consecutive days (most recent) hitting the water goal
    const waterTarget = state.profile.waterTarget ?? 4.0;
    let hydraStreak = 0;
    for (let i = logs.length - 1; i >= 0; i--) {
      if ((logs[i].waterIntake ?? 0) >= waterTarget) hydraStreak++;
      else break;
    }
    if (hydraStreak >= 7) unlock('hydrated_7');

    // macro_7: 7 consecutive days (most recent) logging at least one meal
    let macroStreak = 0;
    for (let i = logs.length - 1; i >= 0; i--) {
      if ((logs[i].macros?.length ?? 0) > 0) macroStreak++;
      else break;
    }
    if (macroStreak >= 7) unlock('macro_7');

    // perfect_day completion check
    const pctForDate = (l: DayLog) => calcCompletion(l.planned, l.completed);
    // Check perfect_week (7 consecutive perfect days)
    for (let i = 0; i <= logs.length - 7; i++) {
      const slice = logs.slice(i, i + 7);
      if (slice.every(l => {
        const planned = CHECKLIST_KEYS.filter(k => l.planned[k]);
        return planned.length > 0 && pctForDate(l) === 100;
      })) {
        unlock('perfect_week');
        break;
      }
    }
  },

  setTheme: (theme) => {
    set(state => {
      const profile = { ...state.profile, theme };
      persist({ ...state, profile });
      return { profile };
    });
  },

  exportData: () => {
    const { template, logs, profile, goals, unlockedAchievements } = get();
    return JSON.stringify({ app: 'fitmate', version: 1, exportedAt: new Date().toISOString(), template, logs, profile, goals, unlockedAchievements });
  },

  importData: (raw) => {
    try {
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object' || !Array.isArray(saved.template) || !Array.isArray(saved.logs) || typeof saved.profile !== 'object') return false;
      if (_persistTimer) { clearTimeout(_persistTimer); _persistTimer = null; }
      _pending = null;
      const { app: _a, version: _v, exportedAt: _e, ...data } = saved;
      void _a; void _v; void _e;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      get().initStore(); // runs the same migrations as a normal load
      return true;
    } catch {
      return false;
    }
  },

  // ── Hard reset: wipe localStorage AND in-memory state back to defaults ──
  resetStore: () => {
    if (_persistTimer) { clearTimeout(_persistTimer); _persistTimer = null; }
    _pending = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }

    const template     = defaultTemplate();
    const profile      = defaultProfile();
    const selectedDate = today();
    const todayStr     = selectedDate;
    const dow          = dayOfWeekFromDate(todayStr);
    const logs         = [makeLog(todayStr, template[dow])];

    set({ template, logs, profile, selectedDate, goals: [], unlockedAchievements: [] });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ template, logs, profile, goals: [], unlockedAchievements: [] }));
    } catch { /* ignore */ }
  },
}));
