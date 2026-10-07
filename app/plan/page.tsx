'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { BottomSheet } from '@/components/BottomSheet';
import { CHECKLIST_KEYS, CHECKLIST_CONFIG, WORKOUT_PRESETS, ChecklistKey } from '@/lib/constants';
import { DAYS_FULL, DAYS_SHORT } from '@/lib/constants';
import type { ExerciseEntry, ExerciseSet } from '@/lib/store';
import {
  Dumbbell, Coffee, UtensilsCrossed, Cookie, Moon, GlassWater,
  ChevronRight, ChevronLeft, Info, Plus, Trash2, Pencil,
} from 'lucide-react';
import { haptic } from '@/lib/utils';

const ITEM_ICONS: Record<ChecklistKey, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  workout: Dumbbell, breakfast: Coffee, lunch: UtensilsCrossed,
  midDaySnacks: Cookie, dinner: Moon, proteinShake: GlassWater,
};

type SheetView = 'day' | 'ex-form';

export default function PlanPage() {
  const template               = useStore(s => s.template);
  const updateTemplate         = useStore(s => s.updateTemplate);
  const toggleTemplateItem     = useStore(s => s.toggleTemplateItem);
  const updateTemplateNote     = useStore(s => s.updateTemplateNote);
  const addTemplateExercise    = useStore(s => s.addTemplateExercise);
  const updateTemplateExercise = useStore(s => s.updateTemplateExercise);
  const removeTemplateExercise = useStore(s => s.removeTemplateExercise);

  // Day sheet
  const [editDow, setEditDow]           = useState<number | null>(null);
  const [workoutInput, setWorkoutInput] = useState('');
  const [sheetView, setSheetView]       = useState<SheetView>('day');

  // Exercise form state (lives inside the day sheet)
  const [exEditIndex, setExEditIndex] = useState<number | null>(null);
  const [exName, setExName]           = useState('');
  const [sets, setSets]               = useState<ExerciseSet[]>([{ reps: 10, weight: 0 }]);

  const editTpl = editDow !== null ? template[editDow] : null;

  /* ── Day sheet ──────────────────────────────────────────────────────────── */
  const openDaySheet = (dow: number) => {
    haptic('medium');
    setEditDow(dow);
    setWorkoutInput(template[dow].workoutName);
    setSheetView('day');
  };

  const closeDaySheet = () => {
    setEditDow(null);
    setSheetView('day');
  };

  const saveDaySheet = () => {
    if (editDow === null) return;
    const name = workoutInput.trim() || template[editDow].workoutName;
    updateTemplate(editDow, { workoutName: name });
    closeDaySheet();
  };

  /* ── Exercise form (in-sheet) ───────────────────────────────────────────── */
  const openAddExercise = () => {
    haptic('light');
    setExEditIndex(null);
    setExName('');
    setSets([{ reps: 10, weight: 0 }]);
    setSheetView('ex-form');
  };

  const openEditExercise = (idx: number) => {
    haptic('light');
    const entry = editTpl?.exercises[idx];
    if (!entry) return;
    setExEditIndex(idx);
    setExName(entry.name);
    setSets(entry.sets.map(s => ({ ...s })));
    setSheetView('ex-form');
  };

  const addSet    = () => setSets(prev => [...prev, { reps: 10, weight: 0 }]);
  const removeSet = (i: number) => setSets(prev => prev.filter((_, idx) => idx !== i));
  const updateSet = (i: number, field: keyof ExerciseSet, val: number) =>
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  const saveExercise = () => {
    if (!exName.trim() || editDow === null) return;
    const entry: ExerciseEntry = { name: exName.trim(), sets };
    if (exEditIndex !== null) {
      updateTemplateExercise(editDow, exEditIndex, entry);
    } else {
      addTemplateExercise(editDow, entry);
    }
    haptic('success');
    setSheetView('day');
  };

  const sheetTitle = sheetView === 'ex-form'
    ? (exEditIndex !== null ? 'Edit Exercise' : 'Add Exercise')
    : (editDow !== null ? DAYS_FULL[editDow] : '');

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingBottom: 96 }}>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 12px' }}>
        <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
          Weekly Template
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Workout Plan</h1>
      </div>

      {/* ── Info banner ──────────────────────────────────────────────────────── */}
      <div style={{
        margin: '0 16px 14px', padding: '11px 14px', borderRadius: 14,
        background: '#F0FAF0', border: '1px solid #C8EAC4',
        display: 'flex', alignItems: 'flex-start', gap: 9,
      }}>
        <Info size={15} color="#5AAD50" style={{ marginTop: 1, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: '#4A5D4A', lineHeight: 1.5 }}>
          Tap a day to set your workout, meals, and exercises for that day.
        </p>
      </div>

      {/* ── 7 day cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px' }}>
        {template.map((tpl, i) => {
          const workoutOn   = tpl.enabled.workout;
          const activeCount = CHECKLIST_KEYS.filter(k => tpl.enabled[k]).length;

          return (
            <motion.button
              key={tpl.dayOfWeek}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.975 }}
              onClick={() => openDaySheet(tpl.dayOfWeek)}
              style={{
                background: '#FFFFFF', borderRadius: 20,
                border: '1.5px solid #EBF5E8',
                padding: '14px 16px', cursor: 'pointer',
                outline: 'none', textAlign: 'left', width: '100%',
                boxShadow: '0 1px 4px rgba(27,51,32,0.05)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Day badge */}
                <div style={{
                  width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                  background: workoutOn ? '#D3EDD0' : '#F4FAF1',
                  border: `1px solid ${workoutOn ? '#5AAD50' : '#E0EDD8'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: workoutOn ? '#2E5E28' : '#8FA08F', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {DAYS_SHORT[i]}
                  </span>
                </div>

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#111B11', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tpl.workoutName}
                  </p>
                  <p style={{ fontSize: 11, color: '#8FA08F', marginTop: 2 }}>{DAYS_FULL[i]}</p>
                  <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {CHECKLIST_KEYS.map(k => {
                      const on  = tpl.enabled[k];
                      const Icon = ITEM_ICONS[k];
                      const cfg  = CHECKLIST_CONFIG[k];
                      return (
                        <div key={k} style={{
                          width: 26, height: 26, borderRadius: 8,
                          background: on ? cfg.bg : '#F4FAF1',
                          border: `1px solid ${on ? cfg.border : '#E0EDD8'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon size={13} color={on ? cfg.border : '#C8DEC4'} strokeWidth={1.8} />
                        </div>
                      );
                    })}
                    <span style={{ fontSize: 10, color: '#C8DEC4', marginLeft: 2 }}>{activeCount} active</span>
                  </div>
                </div>

                <ChevronRight size={16} color="#C8DEC4" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── Day Sheet (+ inline exercise form) ───────────────────────────────── */}
      <BottomSheet open={editDow !== null} onClose={closeDaySheet} title={sheetTitle}>
        {editTpl && editDow !== null && (
          <AnimatePresence mode="wait">

            {/* ── Day setup view ───────────────────────────────────────── */}
            {sheetView === 'day' && (
              <motion.div
                key="day"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                style={{ paddingBottom: 8 }}
              >
                {/* Workout name */}
                <p style={{ fontSize: 11, fontWeight: 700, color: '#8FA08F', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  Workout Name
                </p>
                <input
                  autoFocus
                  value={workoutInput}
                  onChange={e => setWorkoutInput(e.target.value.slice(0, 60))}
                  onKeyDown={e => e.key === 'Enter' && saveDaySheet()}
                  placeholder="e.g. Push Day, Cardio, Yoga..."
                  autoComplete="off"
                  maxLength={60}
                  style={{ marginBottom: 10 }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                  {WORKOUT_PRESETS.map(p => (
                    <motion.button key={p} whileTap={{ scale: 0.92 }} onClick={() => setWorkoutInput(p)}
                      style={{
                        background: workoutInput === p ? '#D3EDD0' : '#F4FAF1',
                        border: `1.5px solid ${workoutInput === p ? '#5AAD50' : '#DFF0D8'}`,
                        borderRadius: 20, padding: '6px 13px',
                        fontSize: 12, fontWeight: 600,
                        color: workoutInput === p ? '#2E5E28' : '#4A5D4A',
                        cursor: 'pointer', outline: 'none',
                      }}
                    >{p}</motion.button>
                  ))}
                </div>

                {/* Checklist items */}
                <p style={{ fontSize: 11, fontWeight: 700, color: '#8FA08F', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                  Include in Daily Checklist
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {CHECKLIST_KEYS.map(key => {
                    const on        = editTpl.enabled[key];
                    const Icon      = ITEM_ICONS[key];
                    const cfg       = CHECKLIST_CONFIG[key];
                    const noteVal   = editTpl.notes?.[key] ?? '';
                    const isWorkout = key === 'workout';
                    const exercises = editTpl.exercises;
                    const notePlaceholders: Record<string, string> = {
                      breakfast:    'e.g. Oats, Eggs & Toast…',
                      lunch:        'e.g. Rice, Dal, Salad…',
                      midDaySnacks: 'e.g. Banana, Protein Bar…',
                      dinner:       'e.g. Chicken, Dal & Curry…',
                      proteinShake: 'e.g. Whey Chocolate, 2 scoops…',
                      workout:      '',
                    };

                    return (
                      <div key={key}>
                        {/* Toggle row */}
                        <motion.button
                          type="button" role="switch" aria-checked={on}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { haptic('light'); toggleTemplateItem(editDow, key); }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                            padding: '11px 14px',
                            borderRadius: on ? '14px 14px 0 0' : 14,
                            background: on ? cfg.bg : '#FAFCFA',
                            border: `1.5px solid ${on ? cfg.border : '#E0EDD8'}`,
                            borderBottom: on ? 'none' : undefined,
                            cursor: 'pointer', outline: 'none', textAlign: 'left',
                          }}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: on ? cfg.border + '22' : '#F4FAF1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Icon size={16} color={on ? cfg.border : '#C8DEC4'} strokeWidth={1.8} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: on ? cfg.color : '#4A5D4A' }}>{cfg.label}</p>
                            <p style={{ fontSize: 11, color: '#8FA08F' }}>{cfg.sublabel}</p>
                          </div>
                          <div style={{
                            width: 38, height: 22, borderRadius: 11,
                            background: on ? cfg.border : '#E0EDD8',
                            position: 'relative', transition: 'background 0.18s', flexShrink: 0,
                          }}>
                            <motion.div
                              animate={{ left: on ? 18 : 2 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              style={{
                                position: 'absolute', top: 2,
                                width: 18, height: 18, borderRadius: '50%',
                                background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                              }}
                            />
                          </div>
                        </motion.button>

                        {/* Expanded content */}
                        <AnimatePresence>
                          {on && (
                            <motion.div
                              key={`expand-${key}`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: 'easeInOut' }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div style={{
                                background: cfg.bg,
                                border: `1.5px solid ${cfg.border}`,
                                borderTop: 'none',
                                borderRadius: '0 0 14px 14px',
                              }}>
                                {/* Note input — skip for workout */}
                                {!isWorkout && (
                                  <div style={{ padding: '8px 14px 10px' }}>
                                    <input
                                      value={noteVal}
                                      onChange={e => updateTemplateNote(editDow, key, e.target.value.slice(0, 100))}
                                      placeholder={notePlaceholders[key]}
                                      maxLength={100}
                                      style={{
                                        width: '100%', fontSize: 12, fontWeight: 500,
                                        color: '#111B11', background: 'transparent',
                                        border: 'none', outline: 'none', padding: 0,
                                      }}
                                    />
                                  </div>
                                )}

                                {/* Exercises section — workout only */}
                                {isWorkout && (
                                  <div style={{ padding: '12px 14px 14px' }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                          Exercises
                                        </span>
                                        {exercises.length > 0 && (
                                          <div style={{
                                            background: cfg.border + '33', borderRadius: 20,
                                            padding: '1px 7px', fontSize: 10, fontWeight: 800, color: cfg.color,
                                          }}>
                                            {exercises.length}
                                          </div>
                                        )}
                                      </div>
                                      <motion.button
                                        whileTap={{ scale: 0.88 }}
                                        onClick={openAddExercise}
                                        style={{
                                          display: 'flex', alignItems: 'center', gap: 4,
                                          background: cfg.border, border: 'none',
                                          borderRadius: 9, padding: '5px 10px',
                                          fontSize: 11, fontWeight: 700, color: '#fff',
                                          cursor: 'pointer', outline: 'none',
                                        }}
                                      >
                                        <Plus size={11} color="#fff" strokeWidth={2.5} />
                                        Add
                                      </motion.button>
                                    </div>

                                    {/* Empty state */}
                                    {exercises.length === 0 && (
                                      <div style={{
                                        padding: '12px 14px', borderRadius: 10,
                                        background: cfg.border + '18',
                                        border: `1px dashed ${cfg.border}66`,
                                        textAlign: 'center',
                                      }}>
                                        <p style={{ fontSize: 11, color: cfg.color, opacity: 0.7 }}>
                                          No exercises yet — tap Add to plan your sets.
                                        </p>
                                      </div>
                                    )}

                                    {/* Exercise list */}
                                    {exercises.length > 0 && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {exercises.map((entry, idx) => (
                                          <div key={`${entry.name}-${idx}`} style={{
                                            background: '#fff', borderRadius: 12,
                                            border: `1px solid ${cfg.border}44`, overflow: 'hidden',
                                          }}>
                                            {/* Row */}
                                            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', gap: 8 }}>
                                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.border, flexShrink: 0 }} />
                                              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#111B11' }}>{entry.name}</span>
                                              <span style={{ fontSize: 10, color: '#8FA08F', fontWeight: 600 }}>{entry.sets.length}×</span>
                                              <motion.button whileTap={{ scale: 0.85 }} onClick={() => openEditExercise(idx)}
                                                style={{ width: 26, height: 26, borderRadius: 7, background: '#F4FAF1', border: '1px solid #E0EDD8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}>
                                                <Pencil size={10} color="#4A5D4A" />
                                              </motion.button>
                                              <motion.button whileTap={{ scale: 0.85 }} onClick={() => { haptic('medium'); removeTemplateExercise(editDow, idx); }}
                                                style={{ width: 26, height: 26, borderRadius: 7, background: '#FDE8E5', border: '1px solid #E86B5A44', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}>
                                                <Trash2 size={10} color="#E86B5A" />
                                              </motion.button>
                                            </div>
                                            {/* Sets strip */}
                                            <div style={{ display: 'flex', gap: 4, padding: '0 10px 8px' }}>
                                              {entry.sets.map((s, si) => (
                                                <div key={si} style={{
                                                  flex: 1, maxWidth: 56,
                                                  background: cfg.bg, border: `1px solid ${cfg.border}33`,
                                                  borderRadius: 7, padding: '4px 6px',
                                                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                                                }}>
                                                  <span style={{ fontSize: 7, color: cfg.color, fontWeight: 700, textTransform: 'uppercase', opacity: 0.7 }}>S{si + 1}</span>
                                                  <span style={{ fontSize: 13, fontWeight: 900, color: '#111B11', lineHeight: 1 }}>{s.reps}</span>
                                                  <span style={{ fontSize: 8, color: '#8FA08F', fontWeight: 600 }}>{s.weight === 0 ? 'BW' : `${s.weight}kg`}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                <motion.button whileTap={{ scale: 0.97 }} onClick={saveDaySheet}
                  style={{
                    width: '100%', background: '#1B3320', border: 'none',
                    borderRadius: 16, padding: 16,
                    fontSize: 15, fontWeight: 800, color: '#FFFFFF',
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  Save Day Plan
                </motion.button>
              </motion.div>
            )}

            {/* ── Exercise form view ───────────────────────────────────── */}
            {sheetView === 'ex-form' && (
              <motion.div
                key="ex-form"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18 }}
                style={{ paddingBottom: 8 }}
              >
                {/* Back */}
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setSheetView('day')}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 14px', outline: 'none' }}>
                  <ChevronLeft size={14} color="#8FA08F" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#8FA08F' }}>Back to day plan</span>
                </motion.button>

                <p style={{ fontSize: 11, fontWeight: 700, color: '#8FA08F', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Exercise Name</p>
                <input autoFocus value={exName} onChange={e => setExName(e.target.value.slice(0, 60))}
                  placeholder="e.g. Bench Press, Squat..." maxLength={60} style={{ marginBottom: 16 }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#8FA08F', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Sets</p>
                  <motion.button whileTap={{ scale: 0.88 }} onClick={addSet}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F4FAF1', border: '1px solid #E0EDD8', borderRadius: 10, padding: '5px 10px', fontSize: 12, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', outline: 'none' }}>
                    <Plus size={12} strokeWidth={2.5} />
                    Add Set
                  </motion.button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                  {sets.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: '#F4FAF1', border: '1px solid #E0EDD8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#8FA08F' }}>{i + 1}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 9, fontWeight: 600, color: '#8FA08F', marginBottom: 3, textTransform: 'uppercase' }}>Reps</p>
                        <input type="number" min="1" max="999" value={s.reps || ''} onChange={e => updateSet(i, 'reps', Math.min(999, Math.max(1, Number(e.target.value))))}
                          style={{ fontSize: 14, fontWeight: 700, padding: '8px 12px' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 9, fontWeight: 600, color: '#8FA08F', marginBottom: 3, textTransform: 'uppercase' }}>Weight (kg / 0=BW)</p>
                        <input type="number" min="0" max="9999" step="0.5" value={s.weight || ''} onChange={e => updateSet(i, 'weight', Math.min(9999, Math.max(0, Number(e.target.value))))}
                          placeholder="0" style={{ fontSize: 14, fontWeight: 700, padding: '8px 12px' }} />
                      </div>
                      {sets.length > 1 && (
                        <motion.button whileTap={{ scale: 0.88 }} onClick={() => removeSet(i)}
                          style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, background: '#FDE8E5', border: '1px solid #E86B5A', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none', marginTop: 14 }}>
                          <Trash2 size={12} color="#E86B5A" />
                        </motion.button>
                      )}
                    </div>
                  ))}
                </div>

                <motion.button whileTap={{ scale: 0.97 }} onClick={saveExercise}
                  style={{ width: '100%', background: 'var(--primary)', border: 'none', borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 800, color: '#fff', cursor: 'pointer', outline: 'none' }}>
                  {exEditIndex !== null ? 'Update Exercise' : 'Save Exercise'}
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </BottomSheet>
    </div>
  );
}
