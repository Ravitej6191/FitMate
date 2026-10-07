'use client';
import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/Header';
import { CalendarStrip } from '@/components/CalendarStrip';
import { GaugeArc } from '@/components/GaugeArc';
import { ChecklistItem } from '@/components/ChecklistItem';
import { useStore } from '@/lib/store';
import { CHECKLIST_KEYS, ChecklistKey } from '@/lib/constants';
import { calcCompletion, calcStreak, today, dayFull } from '@/lib/utils';
import { getTodaySteps } from '@/lib/steps';
import {
  CheckCircle2, CheckCheck, Droplets, BedDouble, Bell,
  Dumbbell, Flame, Footprints, UtensilsCrossed, ChevronRight,
} from 'lucide-react';
import { haptic } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// Logical display groups — order within each group follows CHECKLIST_KEYS
const TRAINING_KEYS:   ReadonlyArray<ChecklistKey> = ['workout'];
const NUTRITION_KEYS:  ReadonlyArray<ChecklistKey> = ['breakfast', 'lunch', 'midDaySnacks', 'dinner', 'proteinShake'];

function motivationalText(pct: number, done: number, total: number): string {
  if (total === 0) return '';
  if (pct === 0)   return 'Ready to crush today?';
  if (pct < 50)    return `${total - done} more to go — keep pushing.`;
  if (pct < 100)   return `Almost there — ${total - done} left!`;
  return 'You nailed every single one. 💪';
}

export default function HomePage() {
  const router       = useRouter();
  const selectedDate = useStore(s => s.selectedDate);
  const logs         = useStore(s => s.logs);
  const profile      = useStore(s => s.profile);
  const toggleItem   = useStore(s => s.toggleItem);
  const markAllDone  = useStore(s => s.markAllDone);
  const setWater     = useStore(s => s.setWater);
  const setSteps     = useStore(s => s.setSteps);

  const todayStr    = today();
  const log         = logs.find(l => l.date === selectedDate);
  const isToday     = selectedDate === todayStr;
  const isFuture    = selectedDate > todayStr;
  const pct         = log ? calcCompletion(log.planned, log.completed) : 0;
  const allDone     = pct === 100;
  const plannedKeys = log ? CHECKLIST_KEYS.filter(k => log.planned[k]) : [];
  const doneCount   = log ? plannedKeys.filter(k => log.completed[k]).length : 0;

  // Grouped for display
  const trainingKeys  = plannedKeys.filter(k => TRAINING_KEYS.includes(k));
  const nutritionKeys = plannedKeys.filter(k => NUTRITION_KEYS.includes(k));

  // Water
  const waterIntake  = log?.waterIntake ?? 0;
  const waterTarget  = profile.waterTarget ?? 4.0;
  const STEP         = 0.5;
  const segmentCount = Math.round(waterTarget / STEP);
  const waterPct     = Math.min((waterIntake / waterTarget) * 100, 100);

  // Steps
  const stepCount    = logs.find(l => l.date === todayStr)?.stepCount ?? 0;
  const [stepSupported, setStepSupported] = useState(true);
  const stepSyncRef  = useRef(false);

  // Streak
  const streak = useMemo(() => calcStreak(logs, todayStr), [logs, todayStr]);

  // Afternoon water reminder
  // alertDismissed persists in sessionStorage so it survives tab navigation
  // within the same session (sessionStorage is cleared when the app is closed).
  const currentHour    = new Date().getHours();
  const showWaterAlert = isToday && currentHour >= 14 && waterIntake === 0;
  const [alertDismissed, setAlertDismissed] = useState<boolean>(() => {
    try { return sessionStorage.getItem('waterAlertDate') === todayStr; }
    catch { return false; }
  });
  const dismissWaterAlert = () => {
    try { sessionStorage.setItem('waterAlertDate', todayStr); } catch { /* ignore */ }
    setAlertDismissed(true);
  };

  // ── Auto-sync steps on mount + when app comes back to foreground ──────────
  useEffect(() => {
    async function syncSteps() {
      if (stepSyncRef.current) return;
      stepSyncRef.current = true;
      try {
        const { steps, supported } = await getTodaySteps();
        setStepSupported(supported);
        if (supported) {
          setSteps(todayStr, steps);
        }
      } catch { /* ignore */ } finally {
        stepSyncRef.current = false;
      }
    }
    syncSteps();

    function handleVisibility() {
      if (document.visibilityState === 'visible') syncSteps();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStr]);

  // Stagger index helper — cross-section continuous index
  let globalIdx = 0;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingBottom: 96 }}>
      <Header />

      {/* ── Gauge + calendar card ──────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          margin: '12px 16px', padding: 0, overflow: 'hidden',
          background: 'linear-gradient(160deg, #FFFFFF 0%, #F4FAF1 100%)',
        }}
      >
        {/* Workout + progress context row */}
        {plannedKeys.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0' }}>
            {/* Workout badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#D3EDD0', borderRadius: 20,
              padding: '5px 12px', border: '1px solid #5AAD5055',
            }}>
              <Dumbbell size={12} color="#2E5E28" strokeWidth={2.2} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#2E5E28', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log?.workoutName || 'Training Day'}
              </span>
            </div>
            {/* Done counter badge */}
            <div style={{
              background: allDone ? '#D3EDD0' : doneCount > 0 ? '#FEF5D1' : '#F4FAF1',
              border: `1px solid ${allDone ? '#5AAD50' : doneCount > 0 ? '#F5C842' : '#E0EDD8'}`,
              borderRadius: 20, padding: '5px 12px',
              fontSize: 12, fontWeight: 800,
              color: allDone ? '#2E5E28' : doneCount > 0 ? '#8B6E0A' : '#8FA08F',
            }}>
              {doneCount}/{plannedKeys.length} done
            </div>
          </div>
        )}

        {/* Gauge */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 16px 0' }}>
          <GaugeArc
            percent={pct}
            label={`${pct}%`}
            sublabel={isToday ? "Today's Progress" : dayFull(selectedDate)}
          />
        </div>

        {/* Calendar strip */}
        <div style={{ padding: '0 16px 14px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#8FA08F', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            This Week
          </p>
          <CalendarStrip />
        </div>
      </div>

      {/* ── Quick stats strip ───────────────────────────────────────────────
          Show on today (for Streak + Steps) even if it's a rest day with no
          planned items. On past/future rest days it's empty so we hide it. */}
      {(plannedKeys.length > 0 || isToday) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.08 }}
          style={{ display: 'flex', gap: 8, padding: '0 16px', marginBottom: 12 }}
        >
          {/* Tasks — only meaningful when something is planned */}
          {plannedKeys.length > 0 && (
            <QuickStat
              icon={<CheckCheck size={14} color="#5AAD50" strokeWidth={2.2} />}
              value={`${doneCount}/${plannedKeys.length}`}
              label="Tasks"
              color="#5AAD50"
              bg="#D3EDD0"
              border="#5AAD5033"
            />
          )}
          {/* Streak — always visible; shows '—' when no streak */}
          <QuickStat
            icon={<Flame size={14} color="#F5813E" fill="#F5813E" />}
            value={streak > 0 ? `${streak}d` : '—'}
            label="Streak"
            color="#F5813E"
            bg="#FEE8D8"
            border="#F5813E33"
          />
          {/* Steps — today only; tapping navigates to steps history */}
          {isToday && (
            <QuickStat
              icon={<Footprints size={14} color="#9B6FDB" strokeWidth={2} />}
              value={stepSupported ? (stepCount >= 1000 ? `${(stepCount / 1000).toFixed(1)}k` : `${stepCount}`) : '—'}
              label="Steps"
              color="#9B6FDB"
              bg="#EDE0FC"
              border="#9B6FDB33"
              onClick={() => { haptic('light'); router.push('/steps'); }}
            />
          )}
        </motion.div>
      )}


      {/* ── Afternoon water reminder ──────────────────────────────────────── */}
      <AnimatePresence>
        {showWaterAlert && !alertDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
            style={{
              margin: '0 16px 10px', padding: '10px 14px', borderRadius: 14,
              background: '#D1F0EB', border: '1px solid #3BB5A344',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <Bell size={14} color="#1A6B5E" strokeWidth={2} style={{ flexShrink: 0 }} />
            <p style={{ flex: 1, fontSize: 12, color: '#1A6B5E', fontWeight: 600, lineHeight: 1.4 }}>
              Afternoon reminder — you haven't logged any water yet today.
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={dismissWaterAlert}
              aria-label="Dismiss water reminder"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '2px 6px', flexShrink: 0, outline: 'none',
                fontSize: 18, lineHeight: 1, color: '#3BB5A3', fontWeight: 300,
              }}
            >
              ×
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Water intake tracker ──────────────────────────────────────────── */}
      {!isFuture && (
        <div className="card" style={{ margin: '0 16px 12px', padding: '12px 16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Droplets size={14} color="#4F9FDB" strokeWidth={2} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4A5D4A' }}>Water Intake</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#4F9FDB' }}>{waterIntake.toFixed(1)}</span>
              <span style={{ fontSize: 11, color: '#8FA08F' }}>/ {waterTarget.toFixed(1)} L</span>
            </div>
          </div>

          {/* Continuous fill bar */}
          <div style={{ height: 4, borderRadius: 2, background: '#E8F3E4', marginBottom: 8, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${waterPct}%` }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              style={{
                height: '100%', borderRadius: 2,
                background: waterPct >= 100 ? '#5AAD50' : 'linear-gradient(90deg, #87CEEB 0%, #4F9FDB 100%)',
              }}
            />
          </div>

          {/* Segment buttons */}
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: segmentCount }, (_, i) => {
              const segValue = (i + 1) * STEP;
              const filled   = waterIntake >= segValue - 0.001;
              return (
                <motion.button
                  key={i}
                  type="button"
                  whileTap={{ scale: 0.75 }}
                  aria-label={`Log ${segValue.toFixed(1)} litres`}
                  aria-pressed={filled}
                  onClick={() => {
                    haptic('light');
                    const newVal = Math.abs(waterIntake - segValue) < 0.001 ? segValue - STEP : segValue;
                    setWater(selectedDate, newVal);
                  }}
                  style={{
                    flex: 1, height: 34, borderRadius: 8,
                    background: filled ? '#DCF0FC' : '#F4FAF1',
                    border: `1.5px solid ${filled ? '#4F9FDB' : '#E0EDD8'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', outline: 'none', padding: 0,
                    WebkitTapHighlightColor: 'transparent', minWidth: 0,
                    transition: 'background 0.14s, border-color 0.14s',
                  }}
                >
                  {/* ── CSS transition replaces Framer Motion motion.div ──────
                    Previously each segment had a motion.div with animate={{scale,opacity}}
                    which created 8 active Framer Motion animation subscriptions.
                    On every water tap ALL 8 re-evaluated. Switching to CSS
                    transitions moves the work off the JS thread entirely. */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transform: filled ? 'scale(1)' : 'scale(0.78)',
                    opacity: filled ? 1 : 0.32,
                    transition: 'transform 0.14s ease, opacity 0.14s ease',
                  }}>
                    <Droplets size={13} color={filled ? '#4F9FDB' : '#B0C8D8'} strokeWidth={filled ? 2.2 : 1.5} />
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Scale labels */}
          <div style={{ display: 'flex', marginTop: 4 }}>
            {Array.from({ length: segmentCount }, (_, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                {(i + 1) % 2 === 0 && (
                  <span style={{ fontSize: 9, color: '#C8DEC4', fontWeight: 500 }}>
                    {((i + 1) * STEP).toFixed(1)}
                  </span>
                )}
              </div>
            ))}
          </div>

          <AnimatePresence>
            {waterIntake >= waterTarget - 0.001 && waterTarget > 0 && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: 11, color: '#4F9FDB', fontWeight: 700, marginTop: 8, textAlign: 'center' }}
              >
                Hydration goal reached! 💧
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Nutrition quick card ─────────────────────────────────────────── */}
      {!isFuture && (() => {
        const todayLog   = logs.find(l => l.date === selectedDate);
        const macros     = todayLog?.macros ?? [];
        const targets    = profile.macroTargets ?? { calories: 2000, protein: 150, carbs: 250, fat: 65 };
        const totalCal   = macros.reduce((s, m) => s + m.calories, 0);
        const totalP     = macros.reduce((s, m) => s + m.protein,  0);
        const totalC     = macros.reduce((s, m) => s + m.carbs,    0);
        const totalF     = macros.reduce((s, m) => s + m.fat,      0);
        const calPct     = Math.min((totalCal / Math.max(targets.calories, 1)) * 100, 100);
        const sumMacros  = totalP + totalC + totalF;
        const pPct       = sumMacros > 0 ? (totalP / sumMacros) * 100 : 33;
        const cPct       = sumMacros > 0 ? (totalC / sumMacros) * 100 : 34;
        const fPct       = sumMacros > 0 ? (totalF / sumMacros) * 100 : 33;
        return (
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="card"
            onClick={() => { haptic('light'); router.push('/nutrition'); }}
            style={{ margin: '0 16px 12px', padding: '12px 16px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'nowrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexShrink: 1 }}>
                <UtensilsCrossed size={14} color="#3BB5A3" strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>Nutrition</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#F5813E' }}>{totalCal}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>/ {targets.calories} kcal</span>
                </div>
                <ChevronRight size={12} color="var(--text-3)" />
              </div>
            </div>
            {/* Calorie progress bar */}
            <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 100, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: `${calPct}%`, background: '#F5813E', borderRadius: 100, transition: 'width 0.4s ease' }} />
            </div>
            {/* P/C/F mini bar */}
            {sumMacros > 0 && (
              <div style={{ display: 'flex', height: 4, borderRadius: 100, overflow: 'hidden', gap: 1 }}>
                <div style={{ flex: pPct, background: '#5AAD50', borderRadius: '100px 0 0 100px' }} />
                <div style={{ flex: cPct, background: '#F5C842' }} />
                <div style={{ flex: fPct, background: '#4F9FDB', borderRadius: '0 100px 100px 0' }} />
              </div>
            )}
          </motion.div>
        );
      })()}

      {/* ── Checklist section ─────────────────────────────────────────────── */}
      <div style={{ padding: '0 16px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#8FA08F', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {isToday ? "Today's Checklist" : dayFull(selectedDate)}
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#4A5D4A', marginTop: 2 }}>
              {plannedKeys.length === 0
                ? isFuture ? 'Select a past or current date' : 'Rest day'
                : motivationalText(pct, doneCount, plannedKeys.length)}
            </p>
          </div>
          {!allDone && plannedKeys.length > 0 && isToday && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => { haptic('success'); markAllDone(selectedDate); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: '#D3EDD0', border: '1px solid #5AAD50',
                borderRadius: 20, padding: '7px 13px',
                fontSize: 12, fontWeight: 700, color: '#2E5E28',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <CheckCheck size={13} color="#2E5E28" />
              Mark All
            </motion.button>
          )}
        </div>

        {/* Checklist body */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {plannedKeys.length === 0 ? (
              /* ── Rest / future empty state ── */
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  padding: '28px 20px 32px', textAlign: 'center',
                  background: '#FFFFFF', borderRadius: 20, border: '1px solid #EBF5E8',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: '#EDE0FC', border: '1px solid #9B6FDB33',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 4,
                }}>
                  <BedDouble size={24} color="#9B6FDB" strokeWidth={1.6} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#111B11' }}>
                  {isFuture ? 'Future day' : 'Rest & Recover'}
                </p>
                <p style={{ fontSize: 13, color: '#8FA08F', lineHeight: 1.55, maxWidth: 220 }}>
                  {isFuture
                    ? 'Check back when the day arrives.'
                    : 'Recovery is where the gains happen. Great choice.'}
                </p>
                {!isFuture && (
                  <p style={{ fontSize: 11, color: '#C8DEC4', marginTop: 2 }}>
                    Go to Plan tab to schedule this day.
                  </p>
                )}
              </motion.div>
            ) : (
              <>
                {/* Training section */}
                {trainingKeys.length > 0 && (
                  <>
                    <SectionLabel label="Training" />
                    {trainingKeys.map(key => {
                      const idx = globalIdx++;
                      return (
                        <ChecklistItem
                          key={key}
                          itemKey={key}
                          workoutName={key === 'workout' ? log?.workoutName : undefined}
                          note={log?.notes?.[key] || undefined}
                          done={log?.completed[key] ?? false}
                          onToggle={() => toggleItem(selectedDate, key)}
                          index={idx}
                        />
                      );
                    })}
                  </>
                )}

                {/* Meals & Nutrition section */}
                {nutritionKeys.length > 0 && (
                  <>
                    <SectionLabel label="Meals & Nutrition" />
                    {nutritionKeys.map(key => {
                      const idx = globalIdx++;
                      return (
                        <ChecklistItem
                          key={key}
                          itemKey={key}
                          note={log?.notes?.[key] || undefined}
                          done={log?.completed[key] ?? false}
                          onToggle={() => toggleItem(selectedDate, key)}
                          index={idx}
                        />
                      );
                    })}
                  </>
                )}

                {/* Perfect Day banner */}
                {allDone && <PerfectDayBanner count={plannedKeys.length} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QuickStat({ icon, value, label, color, bg, border, onClick }: {
  icon: React.ReactNode;
  value: string; label: string; color: string; bg: string; border: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={onClick ? { scale: 0.91 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      onClick={onClick}
      style={{
        flex: 1, background: bg, borderRadius: 14, padding: '10px 8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        border: `1px solid ${border}`,
        cursor: onClick ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {icon}
      <span style={{ fontSize: 17, fontWeight: 900, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 9, color: '#8FA08F', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
    </motion.div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, marginTop: 4 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color: '#8FA08F',
        textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: '#E8F3E4' }} />
    </div>
  );
}

function PerfectDayBanner({ count }: { count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      style={{
        marginTop: 6, padding: '16px 20px', borderRadius: 20,
        background: 'linear-gradient(135deg, #D3EDD0 0%, #C2E5BC 50%, #EBF7E8 100%)',
        border: '1.5px solid #5AAD5055',
        boxShadow: '0 4px 24px rgba(90,173,80,0.18)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}
    >
      {/* Wobble checkmark */}
      <motion.div
        animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
        transition={{ delay: 0.25, duration: 0.55, ease: 'easeInOut' }}
      >
        <CheckCircle2 size={32} color="#5AAD50" strokeWidth={2} />
      </motion.div>

      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 17, fontWeight: 800, color: '#2E5E28' }}>Perfect Day!</p>
        <p style={{ fontSize: 12, color: '#5AAD50', marginTop: 2 }}>
          All {count} tasks completed · Outstanding consistency
        </p>
      </div>

      {/* Pulsing dot — CSS animation (no JS thread cost) */}
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#5AAD50', animation: 'pulse 1.8s ease-in-out infinite' }} />
    </motion.div>
  );
}
