'use client';
import { useState, Suspense } from 'react';
import { Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { BottomSheet } from '@/components/BottomSheet';
import type { ExerciseEntry, ExerciseSet } from '@/lib/store';
import { today } from '@/lib/utils';
import { haptic } from '@/lib/utils';
import { ChevronLeft, Plus, Trash2, Dumbbell, Trophy } from 'lucide-react';

function ExercisesContent() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const dateParam     = searchParams.get('date');
  const selectedDate  = dateParam ?? today();

  const logs              = useStore(s => s.logs);
  const addExercise       = useStore(s => s.addExercise);
  const updateExercise    = useStore(s => s.updateExercise);
  const removeExercise    = useStore(s => s.removeExercise);
  const unlockAchievement = useStore(s => s.unlockAchievement);

  const log = logs.find(l => l.date === selectedDate);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [exName, setExName] = useState('');
  const [sets, setSets] = useState<ExerciseSet[]>([{ reps: 10, weight: 0 }]);

  const isPR = (entry: ExerciseEntry, currentIdx: number): boolean => {
    const allPrevious = logs
      .filter(l => l.date < selectedDate)
      .flatMap(l => l.exercises)
      .concat(
        (log?.exercises ?? []).filter((_, i) => i < currentIdx)
      )
      .filter(e => e.name.toLowerCase() === entry.name.toLowerCase());

    const currentBest = Math.max(...entry.sets.map(s => s.reps * s.weight), 0);
    const prevBest    = Math.max(...allPrevious.flatMap(e => e.sets).map(s => s.reps * s.weight), 0);
    return entry.sets.some(s => s.weight > 0) && currentBest > prevBest;
  };

  const openAdd = () => {
    haptic('light');
    setEditIndex(null);
    setExName('');
    setSets([{ reps: 10, weight: 0 }]);
    setSheetOpen(true);
  };

  const openEdit = (idx: number) => {
    haptic('light');
    const entry = log?.exercises[idx];
    if (!entry) return;
    setEditIndex(idx);
    setExName(entry.name);
    setSets([...entry.sets.map(s => ({ ...s }))]);
    setSheetOpen(true);
  };

  const addSet = () => setSets(prev => [...prev, { reps: 10, weight: 0 }]);
  const removeSet = (i: number) => setSets(prev => prev.filter((_, idx) => idx !== i));
  const updateSet = (i: number, field: keyof ExerciseSet, value: number) => {
    setSets(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const saveExercise = () => {
    if (!exName.trim()) return;
    const entry: ExerciseEntry = { name: exName.trim(), sets };
    // Check for PR before mutating the store (log snapshot is still the old state)
    const currentIdx = editIndex !== null ? editIndex : (log?.exercises.length ?? 0);
    const prDetected = isPR(entry, currentIdx);
    if (editIndex !== null) {
      updateExercise(selectedDate, editIndex, entry);
    } else {
      addExercise(selectedDate, entry);
    }
    if (prDetected) unlockAchievement('pr_set');
    haptic('success');
    setSheetOpen(false);
  };

  const handleRemove = (idx: number) => {
    haptic('medium');
    removeExercise(selectedDate, idx);
  };

  const displayDate = selectedDate === today() ? 'Today' : selectedDate;
  const workoutName = log?.workoutName ?? 'Workout';

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px 12px' }}>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => { haptic('light'); router.back(); }}
          style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', outline: 'none', flexShrink: 0,
          }}
        >
          <ChevronLeft size={18} color="var(--text-2)" />
        </motion.button>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {displayDate}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>Exercise Log</h1>
        </div>
      </div>

      {/* Workout name badge */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'var(--surface-2)', borderRadius: 20, padding: '7px 14px',
          border: '1px solid var(--border)',
        }}>
          <Dumbbell size={13} color="var(--primary)" strokeWidth={2} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{workoutName}</span>
        </div>
      </div>

      {/* Exercise list */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence>
          {(log?.exercises ?? []).length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: '36px 24px', textAlign: 'center',
                background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border-2)',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>💪</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>No exercises logged</p>
              <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>
                Tap "Add Exercise" to start tracking your sets and reps.
              </p>
            </motion.div>
          ) : (
            (log?.exercises ?? []).map((entry, idx) => {
              const pr = isPR(entry, idx);
              return (
                <motion.div
                  key={`${entry.name}-${idx}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.04 }}
                  className="card"
                  style={{ padding: '14px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{entry.name}</span>
                      {pr && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: '#FEF5D1', borderRadius: 10, padding: '3px 8px',
                          border: '1px solid #F5C842',
                        }}>
                          <Trophy size={10} color="#8B6E0A" strokeWidth={2} />
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#8B6E0A' }}>PR!</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => openEdit(idx)}
                        style={{
                          background: 'var(--surface-2)', border: '1px solid var(--border)',
                          borderRadius: 8, padding: '5px 10px', fontSize: 11,
                          fontWeight: 700, color: 'var(--text-2)', cursor: 'pointer', outline: 'none',
                        }}
                      >
                        Edit
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => handleRemove(idx)}
                        style={{
                          background: '#FDE8E5', border: '1px solid #E86B5A',
                          borderRadius: 8, padding: '5px 8px',
                          cursor: 'pointer', outline: 'none',
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        <Trash2 size={12} color="#E86B5A" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Sets table */}
                  <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr', gap: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Set</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reps</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Weight</span>
                    {entry.sets.map((s, si) => (
                      <Fragment key={si}>
                        <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>{si + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{s.reps}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                          {s.weight === 0 ? 'BW' : `${s.weight} kg`}
                        </span>
                      </Fragment>
                    ))}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Add button */}
      <div style={{ padding: '16px 16px 0' }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={openAdd}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--primary)', border: 'none', borderRadius: 16,
            padding: 15, fontSize: 15, fontWeight: 700, color: '#fff',
            cursor: 'pointer', outline: 'none',
          }}
        >
          <Plus size={18} color="#fff" strokeWidth={2.5} />
          Add Exercise
        </motion.button>
      </div>

      {/* Bottom sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editIndex !== null ? 'Edit Exercise' : 'Add Exercise'}
      >
        <div style={{ paddingBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Exercise Name
          </p>
          <input
            autoFocus
            value={exName}
            onChange={e => setExName(e.target.value)}
            placeholder="e.g. Bench Press, Squat..."
            style={{ marginBottom: 16 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Sets
            </p>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={addSet}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '5px 10px',
                fontSize: 12, fontWeight: 700, color: 'var(--primary)',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <Plus size={12} strokeWidth={2.5} />
              Add Set
            </motion.button>
          </div>

          {/* Set rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {sets.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>{i + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reps</p>
                  <input
                    type="number"
                    min="1"
                    value={s.reps || ''}
                    onChange={e => updateSet(i, 'reps', Number(e.target.value))}
                    style={{ fontSize: 14, fontWeight: 700, padding: '8px 12px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Weight (kg / 0=BW)
                  </p>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={s.weight || ''}
                    onChange={e => updateSet(i, 'weight', Number(e.target.value))}
                    placeholder="0"
                    style={{ fontSize: 14, fontWeight: 700, padding: '8px 12px' }}
                  />
                </div>
                {sets.length > 1 && (
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => removeSet(i)}
                    style={{
                      flexShrink: 0, width: 32, height: 32, borderRadius: 10,
                      background: '#FDE8E5', border: '1px solid #E86B5A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', outline: 'none', marginTop: 14,
                    }}
                  >
                    <Trash2 size={13} color="#E86B5A" />
                  </motion.button>
                )}
              </div>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={saveExercise}
            style={{
              width: '100%', background: 'var(--primary)', border: 'none',
              borderRadius: 16, padding: 15, fontSize: 15, fontWeight: 800, color: '#fff',
              cursor: 'pointer', outline: 'none',
            }}
          >
            {editIndex !== null ? 'Update Exercise' : 'Save Exercise'}
          </motion.button>
        </div>
      </BottomSheet>
    </div>
  );
}

export default function ExercisesPage() {
  return (
    <Suspense fallback={<div style={{ background: 'var(--bg)', minHeight: '100dvh' }} />}>
      <ExercisesContent />
    </Suspense>
  );
}
