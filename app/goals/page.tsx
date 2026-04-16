'use client';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import type { Goal } from '@/lib/store';
import { BottomSheet } from '@/components/BottomSheet';
import { calcStreak, today } from '@/lib/utils';
import { haptic } from '@/lib/utils';
import { ChevronLeft, Plus, Trash2, CheckCircle2, Target, Footprints, Flame, Dumbbell, Droplets } from 'lucide-react';

const GOAL_TYPE_CONFIG = {
  steps:    { label: 'Steps (daily)',    icon: Footprints, color: '#9B6FDB', unit: 'steps' },
  streak:   { label: 'Streak (days)',    icon: Flame,      color: '#F5813E', unit: 'days'  },
  workouts: { label: 'Workouts (total)', icon: Dumbbell,   color: '#5AAD50', unit: 'workouts' },
  water:    { label: 'Water (best/day)', icon: Droplets,   color: '#4F9FDB', unit: 'L'     },
  custom:   { label: 'Custom',           icon: Target,     color: '#E86B5A', unit: 'units' },
};

export default function GoalsPage() {
  const router         = useRouter();
  const goals               = useStore(s => s.goals);
  const logs                = useStore(s => s.logs);
  const addGoal             = useStore(s => s.addGoal);
  const removeGoal          = useStore(s => s.removeGoal);
  const markGoalAchieved    = useStore(s => s.markGoalAchieved);
  const updateGoalProgress  = useStore(s => s.updateGoalProgress);

  const todayStr = today();
  const streak   = useMemo(() => calcStreak(logs, todayStr), [logs, todayStr]);

  // Compute current value for each goal type
  const getCurrent = (type: Goal['type']): number => {
    switch (type) {
      case 'steps':    return Math.max(...logs.map(l => l.stepCount), 0);
      case 'streak':   return streak;
      case 'workouts': return logs.filter(l => l.completed.workout).length;
      case 'water':    return Math.max(...logs.map(l => l.waterIntake), 0);
      case 'custom':   return 0;
    }
  };

  // Auto-mark achieved — useEffect (not useMemo) because this is a side effect
  useEffect(() => {
    goals.forEach(g => {
      if (!g.achieved && getCurrent(g.type) >= g.target) {
        markGoalAchieved(g.id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, logs]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    type: Goal['type'];
    target: string;
    unit: string;
  }>({ title: '', type: 'steps', target: '', unit: '' });

  const openAdd = () => {
    haptic('light');
    setForm({ title: '', type: 'steps', target: '', unit: '' });
    setSheetOpen(true);
  };

  const saveGoal = () => {
    if (!form.title.trim() || !form.target) return;
    haptic('success');
    addGoal({
      title: form.title.trim(),
      type: form.type,
      target: Number(form.target),
      unit: form.unit.trim() || GOAL_TYPE_CONFIG[form.type].unit,
    });
    setSheetOpen(false);
  };

  const activeGoals    = goals.filter(g => !g.achieved);
  const completedGoals = goals.filter(g => g.achieved);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px 12px' }}>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => router.back()}
          style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', outline: 'none',
          }}
        >
          <ChevronLeft size={18} color="var(--text-2)" />
        </motion.button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>Goals</h1>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Active goals */}
        {activeGoals.length === 0 && completedGoals.length === 0 ? (
          <div style={{
            padding: '36px 24px', textAlign: 'center',
            background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border-2)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎯</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>No goals set</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>
              Create a goal to track your progress over time.
            </p>
          </div>
        ) : (
          <>
            {activeGoals.length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Active Goals
                </p>
                <AnimatePresence>
                  {activeGoals.map(g => {
                    const cfg     = GOAL_TYPE_CONFIG[g.type];
                    const Icon    = cfg.icon;
                    const current = g.type === 'custom'
                      ? (g.progress ?? 0)
                      : getCurrent(g.type);
                    const pct     = Math.min((current / Math.max(g.target, 1)) * 100, 100);

                    return (
                      <motion.div
                        key={g.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="card"
                        style={{ padding: '14px 16px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                            background: cfg.color + '22', border: `1px solid ${cfg.color}33`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Icon size={18} color={cfg.color} strokeWidth={2} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {g.title}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                              {current} / {g.target} {g.unit}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            {g.type === 'custom' && (
                              <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={() => {
                                  haptic('light');
                                  updateGoalProgress(g.id, (g.progress ?? 0) + 1);
                                }}
                                style={{
                                  background: cfg.color + '22', border: `1px solid ${cfg.color}44`,
                                  borderRadius: 8, padding: '5px 10px',
                                  fontSize: 12, fontWeight: 700, color: cfg.color,
                                  cursor: 'pointer', outline: 'none',
                                }}
                              >
                                +1
                              </motion.button>
                            )}
                            <motion.button
                              whileTap={{ scale: 0.88 }}
                              onClick={() => { haptic('medium'); removeGoal(g.id); }}
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
                        {/* Progress bar */}
                        <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 100, overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5 }}
                            style={{ height: '100%', background: cfg.color, borderRadius: 100 }}
                          />
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, textAlign: 'right' }}>
                          {Math.round(pct)}%
                        </p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </>
            )}

            {/* Completed goals */}
            {completedGoals.length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>
                  Achieved
                </p>
                {completedGoals.map(g => (
                  <div
                    key={g.id}
                    className="card"
                    style={{ padding: '12px 16px', opacity: 0.65 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle2 size={20} color="#5AAD50" strokeWidth={2} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', textDecoration: 'line-through' }}>
                          {g.title}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          Achieved {g.achievedDate ?? ''} · {g.target} {g.unit}
                        </p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => { haptic('light'); removeGoal(g.id); }}
                        style={{
                          background: 'transparent', border: 'none',
                          cursor: 'pointer', outline: 'none', padding: 4,
                        }}
                      >
                        <Trash2 size={14} color="var(--text-3)" />
                      </motion.button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
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
          Add Goal
        </motion.button>
      </div>

      {/* Add goal sheet */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="New Goal">
        <div style={{ paddingBottom: 8 }}>
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Goal Title</p>
            <input
              autoFocus
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Hit 10k steps daily"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Type</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(Object.keys(GOAL_TYPE_CONFIG) as Goal['type'][]).map(t => {
                const cfg  = GOAL_TYPE_CONFIG[t];
                const Icon = cfg.icon;
                const sel  = form.type === t;
                return (
                  <motion.button
                    key={t}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setForm(f => ({ ...f, type: t, unit: cfg.unit }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: sel ? cfg.color + '22' : 'var(--surface-2)',
                      border: `1.5px solid ${sel ? cfg.color : 'var(--border)'}`,
                      borderRadius: 12, padding: '10px 14px',
                      cursor: 'pointer', outline: 'none', textAlign: 'left',
                    }}
                  >
                    <Icon size={16} color={sel ? cfg.color : 'var(--text-3)'} strokeWidth={2} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: sel ? cfg.color : 'var(--text-2)' }}>{cfg.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Target Number</p>
            <input
              type="number"
              min="1"
              value={form.target}
              onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
              placeholder="e.g. 10000"
            />
          </div>

          {form.type === 'custom' && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Unit</p>
              <input
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="e.g. sessions, pages..."
              />
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={saveGoal}
            style={{
              width: '100%', background: 'var(--primary)', border: 'none',
              borderRadius: 16, padding: 15, fontSize: 15, fontWeight: 800, color: '#fff',
              cursor: 'pointer', outline: 'none',
            }}
          >
            Create Goal
          </motion.button>
        </div>
      </BottomSheet>
    </div>
  );
}
