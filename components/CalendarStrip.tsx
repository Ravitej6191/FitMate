'use client';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { weekDates, dayShort, today, calcCompletion, parseLocal } from '@/lib/utils';
import { haptic } from '@/lib/utils';

export function CalendarStrip() {
  const selectedDate    = useStore(s => s.selectedDate);
  const setSelectedDate = useStore(s => s.setSelectedDate);
  const logs            = useStore(s => s.logs);
  const todayStr        = today();

  const dates = weekDates(selectedDate);

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {dates.map(date => {
        const isSelected = date === selectedDate;
        const isToday    = date === todayStr;
        const isFuture   = date > todayStr;
        const log        = logs.find(l => l.date === date);
        const pct        = log ? calcCompletion(log.planned, log.completed) : 0;
        const isDone     = pct === 100;
        const isPartial  = pct > 0 && pct < 100;
        const isMissed   = !isFuture && !isDone && date < todayStr;
        const dayNum     = parseLocal(date).getDate();

        return (
          <motion.button
            key={date}
            // ── onClick instead of onTap ──────────────────────────────────
            // Framer Motion's onTap delays ~100-200 ms while it decides if
            // the pointer moved enough to be a "drag" vs a "tap". This is
            // perceptible on every calendar day tap on Android.
            // onClick fires immediately on pointer-up → no delay.
            onClick={() => { haptic('light'); setSelectedDate(date); }}
            whileTap={{ scale: 0.86 }}
            aria-label={`${dayShort(date)} ${dayNum}${isSelected ? ', selected' : ''}${isDone ? ', completed' : isPartial ? ', partial' : isMissed ? ', missed' : ''}`}
            style={{
              flex: 1, borderRadius: 16, padding: '9px 3px 7px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              cursor: 'pointer', outline: 'none', border: 'none',
              WebkitTapHighlightColor: 'transparent',
              background: isSelected ? '#1B3320' : isToday ? '#D3EDD0' : 'transparent',
              transition: 'background 0.15s',
            }}
          >
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: isSelected ? 'rgba(255,255,255,0.65)' : '#8FA08F',
            }}>
              {dayShort(date)}
            </span>
            <span style={{
              fontSize: 16, fontWeight: 800, lineHeight: 1,
              color: isSelected ? '#FFFFFF' : isToday ? '#1B3320' : '#111B11',
            }}>
              {dayNum}
            </span>
            {/* Status dot */}
            <div style={{ height: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isDone ? (
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: isSelected ? '#FFFFFF' : '#5AAD50' }} />
              ) : isPartial ? (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5C842' }} />
              ) : isMissed ? (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E86B5A', opacity: 0.7 }} />
              ) : (
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  border: `1.5px solid ${isSelected ? 'rgba(255,255,255,0.35)' : '#C8DEC4'}`,
                }} />
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
