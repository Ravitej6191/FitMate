'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { today, formatDate } from '@/lib/utils';
import { ChevronLeft, Footprints, Trophy, TrendingUp, Target, Flame } from 'lucide-react';
import { haptic } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build an array of the last N calendar dates (today last), using local time */
function lastNDates(n: number): string[] {
  const dates: string[] = [];
  const base = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}

/** "Mon 26" label from a YYYY-MM-DD string */
function shortLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  icon, value, label, color, bg,
}: {
  icon: React.ReactNode; value: string; label: string; color: string; bg: string;
}) {
  return (
    <div style={{
      flex: 1, background: bg, borderRadius: 16, padding: '12px 6px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      border: `1px solid ${color}22`,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9, background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 16, fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 9, fontWeight: 600, color: '#8FA08F', textAlign: 'center', lineHeight: 1.3, whiteSpace: 'pre-line' }}>{label}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StepsPage() {
  const router  = useRouter();
  const logs    = useStore(s => s.logs);
  const profile = useStore(s => s.profile);

  const todayStr = today();
  const stepGoal = profile.stepGoal ?? 8000;

  // Build 30-day date range (local calendar dates)
  // todayStr in deps so the range refreshes if the app stays open past midnight
  const dates30 = useMemo(() => lastNDates(30), [todayStr]);

  // Map date → steps from store logs
  const stepMap = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach(l => map.set(l.date, l.stepCount ?? 0));
    return map;
  }, [logs]);

  // Per-day enriched data
  const dayData = useMemo(() => dates30.map(d => ({
    date:    d,
    steps:   stepMap.get(d) ?? 0,
    isToday: d === todayStr,
    hitGoal: (stepMap.get(d) ?? 0) >= stepGoal,
  })), [dates30, stepMap, todayStr, stepGoal]);

  // Summary stats
  const stats = useMemo(() => {
    const withSteps  = dayData.filter(d => d.steps > 0);
    const last7      = dayData.slice(-7);
    const last7Total = last7.reduce((s, d) => s + d.steps, 0);
    const last7Avg   = Math.round(last7Total / 7);
    const best       = withSteps.length > 0 ? Math.max(...withSteps.map(d => d.steps)) : 0;
    const daysHitGoal = dayData.filter(d => d.hitGoal).length;

    // Goal streak: consecutive days (going back from today) where steps ≥ goal
    let streak = 0;
    for (let i = dayData.length - 1; i >= 0; i--) {
      if (dayData[i].hitGoal) streak++;
      else break;
    }
    return { last7Avg, best, daysHitGoal, streak };
  }, [dayData]);

  // Today's values
  const todaySteps = stepMap.get(todayStr) ?? 0;
  const todayPct   = Math.min((todaySteps / stepGoal) * 100, 100);

  // Chart dimensions
  const BAR_H       = 90; // px — usable bar area height
  const BAR_W       = 10; // px — bar width
  const COL_GAP     = 5;  // px — gap between bars
  const COL_W       = BAR_W + COL_GAP;

  // Scale: max is the larger of the goal and any recorded day
  const chartMax = Math.max(stepGoal, ...dayData.map(d => d.steps), 1);
  const goalLineY  = BAR_H - (stepGoal / chartMax) * BAR_H; // px from top of chart area

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingBottom: 96 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 16px 12px' }}>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => { haptic('light'); router.back(); }}
          style={{
            width: 36, height: 36, borderRadius: 12, background: '#FFFFFF',
            border: '1.5px solid #EBF5E8', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', outline: 'none',
            boxShadow: '0 1px 4px rgba(27,51,32,0.06)', flexShrink: 0,
          }}
        >
          <ChevronLeft size={18} color="#4A5D4A" strokeWidth={2.2} />
        </motion.button>
        <div>
          <p style={{ fontSize: 11, color: '#8FA08F', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Activity
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111B11', lineHeight: 1.1 }}>Steps History</h1>
        </div>
      </div>

      {/* ── Today card ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ margin: '0 16px 12px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Footprints size={16} color="#9B6FDB" strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4A5D4A' }}>Today</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#9B6FDB' }}>
              {todaySteps.toLocaleString()}
            </span>
            <span style={{ fontSize: 12, color: '#8FA08F' }}>/ {stepGoal.toLocaleString()}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 8, borderRadius: 4, background: '#E8E0F5', overflow: 'hidden', marginBottom: 8 }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${todayPct}%` }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            style={{
              height: '100%', borderRadius: 4,
              background: todayPct >= 100
                ? 'linear-gradient(90deg, #5AAD50, #2E5E28)'
                : 'linear-gradient(90deg, #C9A7F5 0%, #9B6FDB 100%)',
            }}
          />
        </div>

        <p style={{ fontSize: 12, color: '#8FA08F' }}>
          {todayPct >= 100
            ? '🎉 Goal reached! Great work!'
            : todaySteps === 0
            ? 'Start moving — every step counts!'
            : `${Math.round(stepGoal - todaySteps).toLocaleString()} steps to reach your daily goal`}
        </p>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px', marginBottom: 12 }}>
        <StatTile
          icon={<TrendingUp size={14} color="#9B6FDB" strokeWidth={2} />}
          value={stats.last7Avg >= 1000 ? `${(stats.last7Avg / 1000).toFixed(1)}k` : `${stats.last7Avg}`}
          label={'7-day\navg'}
          color="#9B6FDB"
          bg="#F3EEFF"
        />
        <StatTile
          icon={<Trophy size={14} color="#F5813E" strokeWidth={2} />}
          value={stats.best >= 1000 ? `${(stats.best / 1000).toFixed(1)}k` : `${stats.best}`}
          label={'Best\nday'}
          color="#F5813E"
          bg="#FEF0E8"
        />
        <StatTile
          icon={<Target size={14} color="#5AAD50" strokeWidth={2} />}
          value={`${stats.daysHitGoal}`}
          label={'Days at\ngoal'}
          color="#5AAD50"
          bg="#EDF8EB"
        />
        <StatTile
          icon={<Flame size={14} color="#D4A017" strokeWidth={2} />}
          value={stats.streak > 0 ? `${stats.streak}d` : '—'}
          label={'Goal\nstreak'}
          color="#D4A017"
          bg="#FEFBE8"
        />
      </div>

      {/* ── 30-day bar chart ────────────────────────────────────────────────── */}
      <div className="card" style={{ margin: '0 16px 12px', padding: '16px' }}>
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#4A5D4A' }}>Last 30 Days</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#9B6FDB' }} />
              <span style={{ fontSize: 10, color: '#8FA08F' }}>Steps</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 14, height: 1, background: '#5AAD50', borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: '#8FA08F' }}>Goal</span>
            </div>
          </div>
        </div>

        {/* Chart — horizontally scrollable */}
        <div style={{ overflowX: 'auto', overflowY: 'visible', scrollbarWidth: 'none' }}>
          <div
            style={{
              position: 'relative',
              /* total width = 30 cols × (BAR_W + GAP) − last gap */
              width: dates30.length * COL_W - COL_GAP,
              /* chart area height + 20px for x-axis labels */
              height: BAR_H + 20,
            }}
          >
            {/* ── Goal line (dashed) — positioned inside chart area ── */}
            <div style={{
              position: 'absolute',
              top: goalLineY,
              left: 0,
              right: 0,
              height: 1,
              /* dashed via background repeating-linear-gradient */
              background: 'repeating-linear-gradient(90deg, #5AAD50 0px, #5AAD50 5px, transparent 5px, transparent 9px)',
              zIndex: 1,
              pointerEvents: 'none',
            }} />

            {/* ── Bars ── */}
            {dayData.map((d, i) => {
              const barH   = d.steps > 0 ? Math.max(3, (d.steps / chartMax) * BAR_H) : 0;
              const color  = d.isToday
                ? (d.hitGoal ? '#2E5E28' : '#9B6FDB')
                : d.hitGoal
                ? '#5AAD50'
                : d.steps > 0 ? '#C9A7F5' : '#E0EDD8';

              // Show date label at: first bar, every 7 bars, and today
              const showLabel = i === 0 || (i + 1) % 7 === 0 || d.isToday;
              const labelText = d.isToday ? 'Now' : shortLabel(d.date).split(' ')[1];

              return (
                <div
                  key={d.date}
                  style={{
                    position: 'absolute',
                    left: i * COL_W,
                    top: 0,
                    width: BAR_W,
                    height: BAR_H + 20,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                  }}
                >
                  {/* Bar — uses scaleY from bottom so it grows upward correctly */}
                  {barH > 0 && (
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: i * 0.01, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      style={{
                        width: BAR_W,
                        height: barH,
                        borderRadius: '3px 3px 0 0',
                        background: color,
                        transformOrigin: 'bottom center',
                        marginBottom: 0,
                        position: 'relative',
                        zIndex: 2,
                      }}
                    >
                      {/* Dot above today's bar */}
                      {d.isToday && (
                        <div style={{
                          position: 'absolute', top: -5, left: '50%',
                          transform: 'translateX(-50%)',
                          width: 5, height: 5, borderRadius: '50%',
                          background: color,
                        }} />
                      )}
                    </motion.div>
                  )}

                  {/* Empty bar placeholder (0 steps days) */}
                  {barH === 0 && (
                    <div style={{
                      width: BAR_W, height: 2, borderRadius: 1,
                      background: '#E0EDD8', marginBottom: 0,
                    }} />
                  )}

                  {/* X-axis label */}
                  <div style={{ height: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 2 }}>
                    {showLabel && (
                      <span style={{
                        fontSize: 8,
                        color: d.isToday ? '#9B6FDB' : '#8FA08F',
                        fontWeight: d.isToday ? 700 : 500,
                        whiteSpace: 'nowrap',
                        lineHeight: 1,
                      }}>
                        {labelText}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Y-axis hint */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 9, color: '#C8DEC4' }}>
            Goal: {stepGoal >= 1000 ? `${(stepGoal / 1000).toFixed(0)}k` : stepGoal} steps
          </span>
          <span style={{ fontSize: 9, color: '#C8DEC4' }}>
            Best: {stats.best >= 1000 ? `${(stats.best / 1000).toFixed(1)}k` : stats.best} steps
          </span>
        </div>
      </div>

    </div>
  );
}
