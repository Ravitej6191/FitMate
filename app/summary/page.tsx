'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
  calcCompletion, weekDates, formatDate, mondayOf, today,
} from '@/lib/utils';
import { haptic } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Dumbbell,
  Droplets, Footprints, Star, Flame, UtensilsCrossed,
} from 'lucide-react';

function sundayOf(mondayDate: Date): Date {
  const d = new Date(mondayDate);
  d.setDate(d.getDate() + 6);
  return d;
}

function formatWeekRange(monday: Date, sunday: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString('en-US', opts)} – ${sunday.toLocaleDateString('en-US', opts)}`;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function motivationalInsight(params: { workouts: number; perfect: number; avgSteps: number; avgWater: number }): string {
  const { workouts, perfect, avgSteps } = params;
  if (perfect === 7)         return 'Flawless week! Every single day was perfect.';
  if (perfect >= 5)          return 'Outstanding consistency! Nearly a perfect week.';
  if (workouts >= 5)         return 'Great workout frequency this week!';
  if (avgSteps >= 10000)     return 'Incredible step count! You\'re on fire.';
  if (workouts >= 3)         return 'Solid effort — keep building the habit.';
  if (perfect > 0)           return 'Good start — aim for more perfect days.';
  return 'Every step forward counts. Keep going!';
}

export default function SummaryPage() {
  const router  = useRouter();
  const logs    = useStore(s => s.logs);

  const todayStr = today();
  const [weekOffset, setWeekOffset] = useState(0);

  const monday = useMemo(() => {
    const base = mondayOf(todayStr);
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [todayStr, weekOffset]);

  const sunday = sundayOf(monday);
  const canGoNext = weekOffset < 0;
  const weekLabel = formatWeekRange(monday, sunday);

  const weekDateStrings = useMemo(() => weekDates(formatDate(monday)), [monday]);

  const weekLogs = useMemo(() =>
    weekDateStrings.map(d => logs.find(l => l.date === d) ?? null),
    [weekDateStrings, logs]
  );

  const stats = useMemo(() => {
    const planned = weekLogs.filter(l => l !== null && Object.values(l.planned).some(Boolean));
    const workouts = weekLogs.filter(l => l?.completed?.workout === true).length;
    const perfect  = weekLogs.filter(l => {
      if (!l) return false;
      const pk = Object.keys(l.planned).filter(k => l.planned[k as keyof typeof l.planned]);
      return pk.length > 0 && pk.every(k => l.completed[k as keyof typeof l.completed]);
    }).length;
    const stepValues    = weekLogs.map(l => l?.stepCount ?? 0);
    const avgSteps      = planned.length > 0 ? Math.round(stepValues.reduce((a, b) => a + b, 0) / 7) : 0;
    const bestSteps     = Math.max(...stepValues, 0);
    const waterValues   = weekLogs.map(l => l?.waterIntake ?? 0);
    const avgWater      = +(waterValues.reduce((a, b) => a + b, 0) / 7).toFixed(1);
    const totalCal      = weekLogs.reduce((sum, l) => sum + (l?.macros?.reduce((s, m) => s + m.calories, 0) ?? 0), 0);
    // Days where workout was specifically planned this week (correct denominator for workouts card)
    const workoutDays   = weekLogs.filter(l => l?.planned?.workout === true).length;

    return { workouts, perfect, avgSteps, bestSteps, avgWater, totalCal, workoutDays };
  }, [weekLogs]);

  const insight = motivationalInsight(stats);

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
            cursor: 'pointer', outline: 'none',
          }}
        >
          <ChevronLeft size={18} color="var(--text-2)" />
        </motion.button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>Weekly Summary</h1>
      </div>

      {/* Week selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 16px 14px' }}>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => { haptic('light'); setWeekOffset(w => w - 1); }}
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', outline: 'none',
          }}
        >
          <ChevronLeft size={16} color="var(--text-2)" />
        </motion.button>

        <AnimatePresence mode="wait">
          <motion.span
            key={weekLabel}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', minWidth: 160, textAlign: 'center' }}
          >
            {weekLabel}
          </motion.span>
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => { if (!canGoNext) return; haptic('light'); setWeekOffset(w => w + 1); }}
          disabled={!canGoNext}
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: canGoNext ? 'var(--surface)' : 'transparent',
            border: `1px solid ${canGoNext ? 'var(--border)' : 'transparent'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: canGoNext ? 'pointer' : 'default', outline: 'none',
            opacity: canGoNext ? 1 : 0.3,
          }}
        >
          <ChevronRight size={16} color="var(--text-2)" />
        </motion.button>
      </div>

      {/* Summary cards */}
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {[
          { icon: Dumbbell,    value: `${stats.workouts}/${stats.workoutDays > 0 ? stats.workoutDays : 7}`, label: 'Workouts', color: '#5AAD50', bg: '#D3EDD0' },
          { icon: Star,        value: `${stats.perfect}/7`, label: 'Perfect Days', color: '#F5C842', bg: '#FEF5D1' },
          { icon: Footprints,  value: stats.avgSteps >= 1000 ? `${(stats.avgSteps / 1000).toFixed(1)}k` : `${stats.avgSteps}`, label: 'Avg Steps', color: '#9B6FDB', bg: '#EDE0FC' },
          { icon: Flame,       value: stats.bestSteps >= 1000 ? `${(stats.bestSteps / 1000).toFixed(1)}k` : `${stats.bestSteps}`, label: 'Best Steps', color: '#F5813E', bg: '#FEE8D8' },
          { icon: Droplets,    value: `${stats.avgWater}L`, label: 'Avg Water', color: '#4F9FDB', bg: '#DCF0FC' },
          { icon: UtensilsCrossed, value: `${stats.totalCal}`, label: 'Total Kcal', color: '#3BB5A3', bg: '#D1F0EB' },
        ].map(({ icon: Icon, value, label, color, bg }) => (
          <div
            key={label}
            style={{
              background: bg, borderRadius: 18, padding: '14px',
              border: `1px solid ${color}33`, display: 'flex', flexDirection: 'column', gap: 4,
            }}
          >
            <Icon size={18} color={color} strokeWidth={2} />
            <p style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1, marginTop: 4 }}>{value}</p>
            <p style={{ fontSize: 11, color: color + 'cc', fontWeight: 600 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Insight message */}
      <div style={{
        margin: '0 16px 12px', padding: '14px 16px', borderRadius: 16,
        background: 'var(--surface)', border: '1px solid var(--border-2)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ fontSize: 20, flexShrink: 0 }}>💡</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, fontWeight: 600 }}>{insight}</p>
      </div>

      {/* Daily breakdown */}
      <div className="card" style={{ margin: '0 16px', padding: '14px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          Daily Breakdown
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {weekDateStrings.map((date, i) => {
            const log  = weekLogs[i];
            const pct  = log ? calcCompletion(log.planned, log.completed) : -1;
            const isToday = date === todayStr;
            const isFuture = date > todayStr;

            const barColor =
              isFuture ? 'var(--border)' :
              pct === 100 ? '#5AAD50' :
              pct >= 50   ? '#3BB5A3' :
              pct > 0     ? '#F5C842' : '#E8F3E4';

            return (
              <div key={date} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 11, fontWeight: isToday ? 800 : 600,
                  color: isToday ? 'var(--primary)' : 'var(--text-3)',
                  width: 30, flexShrink: 0,
                }}>
                  {DAY_LABELS[i]}
                </span>
                <div style={{ flex: 1, height: 22, background: 'var(--surface-3)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                  {!isFuture && pct >= 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, 4)}%` }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      style={{ height: '100%', background: barColor, borderRadius: 8 }}
                    />
                  )}
                  {isFuture && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>—</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, width: 100, flexShrink: 0, justifyContent: 'flex-end' }}>
                  {!isFuture && (
                    <>
                      <span style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Footprints size={9} color="var(--text-3)" />
                        {log?.stepCount ? (log.stepCount >= 1000 ? `${(log.stepCount / 1000).toFixed(1)}k` : log.stepCount) : '—'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Droplets size={9} color="var(--text-3)" />
                        {log?.waterIntake ? `${log.waterIntake}L` : '—'}
                      </span>
                    </>
                  )}
                </div>
                {log?.completed?.workout && !isFuture && (
                  <CheckCircle2 size={14} color="#5AAD50" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
