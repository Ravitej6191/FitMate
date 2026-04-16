export const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CHECKLIST_KEYS = ['workout', 'breakfast', 'lunch', 'midDaySnacks', 'dinner', 'proteinShake'] as const;
export type ChecklistKey = typeof CHECKLIST_KEYS[number];

export const CHECKLIST_CONFIG: Record<ChecklistKey, {
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  border: string;
}> = {
  workout:      { label: 'Workout',        sublabel: 'Training session',      color: '#1B3320', bg: '#D3EDD0', border: '#5AAD50' },
  breakfast:    { label: 'Breakfast',      sublabel: 'Morning meal',          color: '#B84F15', bg: '#FEE8D8', border: '#F5813E' },
  lunch:        { label: 'Lunch',          sublabel: 'Midday meal',           color: '#1A6B5E', bg: '#D1F0EB', border: '#3BB5A3' },
  midDaySnacks: { label: 'Mid-Day Snacks', sublabel: 'Afternoon snack',       color: '#8B6E0A', bg: '#FEF5D1', border: '#F5C842' },
  dinner:       { label: 'Dinner',         sublabel: 'Evening meal',          color: '#1A5E8B', bg: '#DCF0FC', border: '#4F9FDB' },
  proteinShake: { label: 'Protein Shake',  sublabel: 'Post-workout nutrition', color: '#5C2E8B', bg: '#EDE0FC', border: '#9B6FDB' },
};

export const GOAL_OPTIONS = [
  'Build Muscle', 'Lose Weight', 'Maintain Weight',
  'Improve Endurance', 'Increase Flexibility', 'Sports Performance',
];

export const WORKOUT_PRESETS = [
  'Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body',
  'Full Body', 'Cardio', 'HIIT', 'Yoga', 'Active Recovery',
];

export const STORAGE_KEY = 'fitmate_v3';

// ─── Achievement definitions ──────────────────────────────────────────────────
export type Achievement = {
  id: string; title: string; desc: string;
  icon: string; color: string; bg: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_workout',  title: 'First Rep',        desc: 'Complete your first workout',       icon: '🏋️', color: '#5AAD50', bg: '#EDF8EB' },
  { id: 'streak_3',       title: 'On a Roll',         desc: '3-day perfect streak',              icon: '🔥', color: '#F5813E', bg: '#FEF0E8' },
  { id: 'streak_7',       title: 'Week Warrior',      desc: '7-day perfect streak',              icon: '⚡', color: '#F5813E', bg: '#FEF0E8' },
  { id: 'streak_30',      title: 'Iron Will',         desc: '30-day perfect streak',             icon: '🏆', color: '#F5C842', bg: '#FEFBE8' },
  { id: 'perfect_day',    title: 'Perfect Day',       desc: 'Complete all tasks in a day',       icon: '⭐', color: '#F5C842', bg: '#FEFBE8' },
  { id: 'perfect_week',   title: 'Flawless Week',     desc: '7 consecutive perfect days',        icon: '👑', color: '#F5C842', bg: '#FEFBE8' },
  { id: 'steps_5k',       title: 'Walker',            desc: 'Hit 5,000 steps in a day',          icon: '👟', color: '#9B6FDB', bg: '#F3EEFF' },
  { id: 'steps_10k',      title: 'Strider',           desc: 'Hit 10,000 steps in a day',         icon: '🚶', color: '#9B6FDB', bg: '#F3EEFF' },
  { id: 'steps_50k_week', title: 'Step Machine',      desc: '50k total steps in any week',       icon: '🏃', color: '#9B6FDB', bg: '#F3EEFF' },
  { id: 'hydrated_7',     title: 'Hydration Hero',    desc: 'Hit water goal 7 days running',     icon: '💧', color: '#4F9FDB', bg: '#DCF0FC' },
  { id: 'first_macro',    title: 'Nutrition Logger',  desc: 'Log your first meal',               icon: '🥗', color: '#3BB5A3', bg: '#D1F0EB' },
  { id: 'macro_7',        title: 'Macro Streak',      desc: 'Log meals 7 days in a row',         icon: '🍎', color: '#3BB5A3', bg: '#D1F0EB' },
  { id: 'first_exercise', title: 'Rep Counter',       desc: 'Log your first exercise set',       icon: '💪', color: '#2E5E28', bg: '#D3EDD0' },
  { id: 'pr_set',         title: 'Personal Best',     desc: 'Set a new PR on any exercise',      icon: '🎖️', color: '#2E5E28', bg: '#D3EDD0' },
  { id: 'first_goal',     title: 'Goal Setter',       desc: 'Create your first goal',            icon: '🎯', color: '#E86B5A', bg: '#FDE8E5' },
  { id: 'goal_achieved',  title: 'Goal Crusher',      desc: 'Achieve a milestone goal',          icon: '🎉', color: '#E86B5A', bg: '#FDE8E5' },
];

// ─── Pre-built workout plan templates ─────────────────────────────────────────
export type PlanTemplate = {
  name: string;
  description: string;
  days: Array<{ workoutName: string; workout: boolean; breakfast: boolean; lunch: boolean; midDaySnacks: boolean; dinner: boolean; proteinShake: boolean }>;
};

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    name: 'Push Pull Legs',
    description: '6-day split · Classic hypertrophy',
    days: [
      { workoutName: 'Push Day',    workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Pull Day',    workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Leg Day',     workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Push Day',    workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Pull Day',    workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Leg Day',     workout: true,  breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: true  },
      { workoutName: 'Rest Day',    workout: false, breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: false },
    ],
  },
  {
    name: 'Upper Lower Split',
    description: '4-day split · Balanced strength',
    days: [
      { workoutName: 'Upper Body',  workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Lower Body',  workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Rest Day',    workout: false, breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: false },
      { workoutName: 'Upper Body',  workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Lower Body',  workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Cardio',      workout: true,  breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: false },
      { workoutName: 'Rest Day',    workout: false, breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: false },
    ],
  },
  {
    name: 'Full Body 3x',
    description: '3-day split · Beginner friendly',
    days: [
      { workoutName: 'Full Body',   workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Rest Day',    workout: false, breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: false },
      { workoutName: 'Full Body',   workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Rest Day',    workout: false, breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: false },
      { workoutName: 'Full Body',   workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Cardio',      workout: true,  breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: false },
      { workoutName: 'Rest Day',    workout: false, breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: false },
    ],
  },
  {
    name: 'Bro Split',
    description: '5-day split · Classic bodybuilding',
    days: [
      { workoutName: 'Chest Day',    workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Back Day',     workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Shoulder Day', workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Arm Day',      workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Leg Day',      workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: true  },
      { workoutName: 'Cardio',       workout: true,  breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: false },
      { workoutName: 'Rest Day',     workout: false, breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: false },
    ],
  },
  {
    name: 'Calisthenics',
    description: '3-day split · Bodyweight only',
    days: [
      { workoutName: 'Push (Chest)',    workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: false },
      { workoutName: 'Pull (Back)',     workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: false },
      { workoutName: 'Rest Day',        workout: false, breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: false },
      { workoutName: 'Legs & Core',     workout: true,  breakfast: true, lunch: true, midDaySnacks: true,  dinner: true, proteinShake: false },
      { workoutName: 'Skill Work',      workout: true,  breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: false },
      { workoutName: 'Active Recovery', workout: true,  breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: false },
      { workoutName: 'Rest Day',        workout: false, breakfast: true, lunch: true, midDaySnacks: false, dinner: true, proteinShake: false },
    ],
  },
];
