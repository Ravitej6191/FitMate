'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { ProgressRing } from '@/components/ProgressRing';
import {
  calcCompletion, avgCompletion, calcStreak, today, weekDates,
  daysInMonth, dayOfWeekFromDate, insightMessage, dayShort, monthDates,
} from '@/lib/utils';
import { CHECKLIST_KEYS } from '@/lib/constants';
import { Flame, CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Droplets, BarChart3 } from 'lucide-react';
import { haptic } from '@/lib/utils';


export default function ProgressPage() {
  const logs     = useStore(s => s.logs);
  const todayStr = today();
  const now      = new Date();

  // ── Month navigator ───────────────────────────────────────────────────────
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1); // 1-indexed

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth() + 1;
  const canGoNext      = !isCurrentMonth;

  const goPrev = () => {
    haptic('light');
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };

  const goNext = () => {
    if (!canGoNext) return;
    haptic('light');
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };

  const monthLabel = new Date(viewYear, viewMonth - 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ── This-week stats (always current) ─────────────────────────────────────
  const thisWeekDates = weekDates(todayStr);
  const weekLogs      = thisWeekDates.map(d => logs.find(l => l.date === d)).filter(Boolean) as typeof logs;
  const weekPct       = avgCompletion(weekLogs);

  // ── Streak (shared util — same logic as Header) ───────────────────────────
  const streak = useMemo(() => calcStreak(logs, todayStr), [logs, todayStr]);

  // ── Selected-month data ───────────────────────────────────────────────────
  const monthDatesArr = useMemo(() => monthDates(viewYear, viewMonth), [viewYear, viewMonth]);
  const firstDayDow   = dayOfWeekFromDate(`${viewYear}-${String(viewMonth).padStart(2, '0')}-01`);
  const monthLogsMap  = useMemo(() => {
    const map = new Map<string, typeof logs[0]>();
    logs.forEach(l => map.set(l.date, l));
    return map;
  }, [logs]);

  const monthStats = useMemo(() => {
    const pastDates    = monthDatesArr.filter(d => d <= todayStr);
    const pastLogs     = pastDates.map(d => monthLogsMap.get(d)).filter(Boolean) as typeof logs;
    const trackedDays  = pastLogs.length;
    const perfectDays  = pastLogs.filter(l => calcCompletion(l.planned, l.completed) === 100).length;
    const avgPct       = avgCompletion(pastLogs);
    const workoutDays  = pastLogs.filter(l => l.planned.workout && l.completed.workout).length;
    // total water logged this month (litres)
    const totalWater   = +pastLogs.reduce((sum, l) => sum + (l.waterIntake ?? 0), 0).toFixed(1);
    return { trackedDays, perfectDays, avgPct, workoutDays, totalWater };
  }, [monthDatesArr, monthLogsMap, todayStr]);

  const ringColor = weekPct >= 80 ? '#5AAD50' : weekPct >= 50 ? '#3BB5A3' : '#E86B5A';

  // True empty state — no logs at all yet (fresh install or after data reset)
  const hasAnyLog = logs.length > 0;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 12px' }}>
        <p style={{ fontSize: 11, color: '#8FA08F', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
          Overview
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111B11' }}>Progress</h1>
      </div>

      {/* ── Empty state (no data yet) ────────────────────────────────────────── */}
      {!hasAnyLog && (
        <div style={{
          margin: '24px 16px', padding: '36px 24px', borderRadius: 24,
          background: '#FFFFFF', border: '1px solid #EBF5E8',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: '#EDE0FC', border: '1px solid #9B6FDB22',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart3 size={30} color="#9B6FDB" strokeWidth={1.6} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 800, color: '#111B11' }}>No data yet</p>
          <p style={{ fontSize: 13, color: '#8FA08F', lineHeight: 1.6, maxWidth: 240 }}>
            Start ticking off your daily checklist on the Home tab — your stats will appear here after your first day.
          </p>
        </div>
      )}

      {/* Week summary */}
      {hasAnyLog && (<>
      <div className="card" style={{ margin: '0 16px 12px', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* showLabel={false} — the large % number is shown in text next to the ring;
              showing it inside the ring too creates a confusing duplicate. */}
          <ProgressRing percent={weekPct} size={84} strokeWidth={8} color={ringColor} trackColor="#E8F3E4" showLabel={false} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 30, fontWeight: 900, color: ringColor, lineHeight: 1 }}>{weekPct}%</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111B11', marginTop: 3 }}>This Week</p>
            <p style={{ fontSize: 12, color: '#8FA08F', marginTop: 4, lineHeight: 1.45 }}>{insightMessage(weekPct)}</p>
          </div>
        </div>
      </div>

      {/* ── Section divider ─────────────────────────────────────────────────── */}
      <div style={{ margin: '4px 16px 16px', height: 1, background: '#E8F3E4' }} />

      {/* ── Monthly section ───────────────────────────────────────────────── */}
      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 12 }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: '#111B11', letterSpacing: '-0.01em' }}>
          Monthly Stats
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={goPrev}
            aria-label="Previous month"
            style={{
              width: 30, height: 30, borderRadius: 10,
              background: '#F4FAF1', border: '1px solid #E0EDD8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <ChevronLeft size={15} color="#4A5D4A" />
          </motion.button>

          <AnimatePresence mode="wait">
            <motion.span
              key={`${viewYear}-${viewMonth}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              style={{ fontSize: 13, fontWeight: 700, color: '#111B11', minWidth: 110, textAlign: 'center' }}
            >
              {monthLabel}
            </motion.span>
          </AnimatePresence>

          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={goNext}
            aria-label="Next month"
            disabled={!canGoNext}
            style={{
              width: 30, height: 30, borderRadius: 10,
              background: canGoNext ? '#F4FAF1' : 'transparent',
              border: `1px solid ${canGoNext ? '#E0EDD8' : 'transparent'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: canGoNext ? 'pointer' : 'default', outline: 'none',
              opacity: canGoNext ? 1 : 0.25,
            }}
          >
            <ChevronRight size={15} color="#4A5D4A" />
          </motion.button>
        </div>
      </div>

      {/* Monthly stats row */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`stats-${viewYear}-${viewMonth}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, padding: '0 16px 12px' }}>
            <MiniStat Icon={Flame}        value={`${streak}`}                  label="Streak"    iconColor="#F5813E" bg="#FEE8D8" />
            <MiniStat Icon={CheckCircle2} value={`${monthStats.perfectDays}`}  label="Perfect"   iconColor="#5AAD50" bg="#D3EDD0" />
            <MiniStat Icon={CalendarCheck}value={`${monthStats.workoutDays}`}  label="Workouts"  iconColor="#4F9FDB" bg="#DCF0FC" />
            <MiniStat Icon={Droplets}     value={`${monthStats.totalWater}L`}  label="Water"     iconColor="#3BB5A3" bg="#D1F0EB" />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Monthly calendar */}
      <div className="card" style={{ margin: '0 16px 12px', padding: '14px 16px' }}>
        {/* Month summary row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: monthStats.avgPct >= 80 ? '#5AAD50' : monthStats.avgPct >= 50 ? '#3BB5A3' : '#8FA08F' }}>
              {monthStats.avgPct}%
            </span>
            <span style={{ fontSize: 11, color: '#8FA08F' }}>avg · {monthStats.trackedDays} days tracked</span>
          </div>
          {!isCurrentMonth && monthStats.trackedDays === 0 && (
            <span style={{ fontSize: 11, color: '#C8DEC4' }}>No data</span>
          )}
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#8FA08F', padding: '2px 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* ── Calendar grid ────────────────────────────────────────────────
          Previously: 31 individual motion.div cells each with staggered
          scale+opacity animation = 31 Framer Motion timelines running at once.
          On Android this caused visible jank every time the month changed.

          Now: ONE motion.div container animates (fade + slide), cells are
          plain divs with CSS. Same visual result, 30× less JS animation work. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`cal-${viewYear}-${viewMonth}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}
          >
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayDow }, (_, i) => <div key={`empty-${i}`} />)}

            {monthDatesArr.map((date, i) => {
              const dayNum   = i + 1;
              const isToday  = date === todayStr;
              const isFuture = date > todayStr;
              const log      = monthLogsMap.get(date);
              const pct      = log ? calcCompletion(log.planned, log.completed) : -1;

              const dotBg =
                isFuture ? 'transparent' :
                pct === -1 ? '#F4FAF1' :
                pct === 100 ? '#5AAD50' :
                pct >= 50 ? '#3BB5A3' :
                pct > 0 ? '#F5C842' : '#FDE8E5';

              const textColor =
                isToday ? '#FFFFFF' :
                isFuture ? '#C8DEC4' :
                pct === 100 ? '#2E5E28' :
                pct > 0 ? '#111B11' : '#8FA08F';

              return (
                <div
                  key={date}
                  style={{
                    aspectRatio: '1', borderRadius: 8,
                    background: isToday ? '#1B3320' : dotBg,
                    border: isToday ? 'none' : isFuture ? '1px solid #EBF5E8' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: isToday ? 800 : 600, color: textColor }}>
                    {dayNum}
                  </span>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { color: '#5AAD50', label: '100%' },
            { color: '#3BB5A3', label: '≥ 50%' },
            { color: '#F5C842', label: '> 0%' },
            { color: '#FDE8E5', label: '0%' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
              <span style={{ fontSize: 10, color: '#8FA08F' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* This week bar chart */}
      {(() => {
        const BAR_H = 70;
        return (
          <div className="card" style={{ margin: '0 16px 12px', padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#8FA08F', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
              Daily Completion — This Week
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {thisWeekDates.map((date, i) => {
                const isToday  = date === todayStr;
                const isFuture = date > todayStr;
                const log      = logs.find(l => l.date === date);
                const pct      = log ? calcCompletion(log.planned, log.completed) : 0;
                const scaleY   = isFuture ? 6 / BAR_H : Math.max(pct / 100, 6 / BAR_H);
                const barColor = isFuture ? '#EBF5E8'
                  : pct === 100 ? '#5AAD50'
                  : pct >= 50  ? '#3BB5A3'
                  : pct > 0    ? '#F5C842' : '#EBF5E8';

                return (
                  <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    {/* Bar column — fixed height, bar grows from bottom via scaleY */}
                    <div style={{ width: '100%', height: BAR_H, position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
                      {isToday && (
                        <div style={{
                          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                          width: 6, height: 6, borderRadius: '50%', background: '#1B3320',
                          zIndex: 1,
                        }} />
                      )}
                      <motion.div
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY }}
                        transition={{ delay: i * 0.06, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                          width: '100%', height: BAR_H,
                          borderRadius: '6px 6px 3px 3px', background: barColor,
                          transformOrigin: 'bottom center',
                          boxShadow: pct === 100 ? '0 2px 8px rgba(90,173,80,0.25)' : 'none',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: isToday ? 800 : 600, color: isToday ? '#1B3320' : '#8FA08F' }}>
                      {dayShort(date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      </>)}
    </div>
  );
}

// MiniStat: plain div — no entry animation.
// Previously used motion.div with initial={{ opacity:0, y:6 }} which re-animated
// on every mount AND every month navigation (no key to reset). Removed.
// The parent AnimatePresence container already fades the whole stats block in/out.
function MiniStat({ Icon, value, label, iconColor, bg }: {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  value: string; label: string; iconColor: string; bg: string;
}) {
  return (
    <div
      style={{
        background: bg, borderRadius: 16, padding: '12px 6px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        border: `1px solid ${iconColor}22`,
      }}
    >
      <Icon size={18} color={iconColor} strokeWidth={2} />
      <span style={{ fontSize: 20, fontWeight: 900, color: iconColor, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 9, color: '#8FA08F', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</span>
    </div>
  );
}
