'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Dumbbell, Coffee, UtensilsCrossed, Cookie, Moon, GlassWater } from 'lucide-react';
import { ChecklistKey, CHECKLIST_CONFIG } from '@/lib/constants';
import { haptic } from '@/lib/utils';

const ICONS: Record<ChecklistKey, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  workout:      Dumbbell,
  breakfast:    Coffee,
  lunch:        UtensilsCrossed,
  midDaySnacks: Cookie,
  dinner:       Moon,
  proteinShake: GlassWater,
};

interface ChecklistItemProps {
  itemKey: ChecklistKey;
  workoutName?: string;
  note?: string;
  done: boolean;
  onToggle: () => void;
  index?: number;
}

export function ChecklistItem({ itemKey, workoutName, note, done, onToggle, index = 0 }: ChecklistItemProps) {
  const cfg  = CHECKLIST_CONFIG[itemKey];
  const Icon = ICONS[itemKey];
  const [flash, setFlash] = useState(false);

  // ── onClick instead of Framer Motion's onTap ─────────────────────────────
  // onTap is Framer Motion's gesture event — it waits ~100-200 ms to
  // distinguish a tap from a drag before firing. On Android this causes
  // a noticeable input lag on every checklist interaction.
  // Native onClick fires immediately on pointer-up, which feels snappy.
  const handleTap = () => {
    haptic(done ? 'light' : 'medium');
    onToggle();
    setFlash(true);
    setTimeout(() => setFlash(false), 320);
  };

  return (
    <div
      style={{
        marginBottom: 8,
        position: 'relative',
        opacity: 0,
        animation: `slideIn 0.3s ease forwards ${index * 0.045}s`,
      }}
    >
      {/* Flash ripple overlay — fires once, no infinite loop */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0.35, scale: 0.92 }}
            animate={{ opacity: 0,    scale: 1.04 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            style={{
              position: 'absolute', inset: 0, borderRadius: 16,
              background: done ? cfg.border : cfg.bg,
              pointerEvents: 'none', zIndex: 1,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Button: whileTap for visual feedback, onClick for native speed ── */}
      <motion.button
        onClick={handleTap}
        aria-pressed={done}
        aria-label={`${itemKey === 'workout' && workoutName ? workoutName : CHECKLIST_CONFIG[itemKey].label} — ${done ? 'done, tap to unmark' : 'tap to mark done'}`}
        whileTap={{ scale: 0.96 }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '13px 16px', borderRadius: 16,
          border: `1.5px solid ${done ? cfg.border : '#EBF5E8'}`,
          background: done ? cfg.bg : '#FFFFFF',
          cursor: 'pointer', outline: 'none', textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
          boxShadow: done
            ? `0 2px 10px ${cfg.border}28`
            : '0 1px 3px rgba(27,51,32,0.05)',
          position: 'relative', overflow: 'hidden',
          transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
          // willChange:transform intentionally removed — forcing a GPU compositing
          // layer on every checklist row was the root cause of the Android WebView
          // background-disappear bug (same class of issue as the TabBar).
        }}
      >
        {/* Icon box — scale pulse on done change, colors via CSS */}
        <motion.div
          animate={{ scale: done ? [1, 1.18, 1] : 1 }}
          transition={{ duration: 0.22 }}
          style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            border: `1px solid ${done ? cfg.border + '55' : '#DFF0D8'}`,
            background: done ? cfg.border + '28' : '#F4FAF1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.18s, border-color 0.18s',
          }}
        >
          <Icon size={18} color={done ? cfg.border : '#8FA08F'} strokeWidth={1.8} />
        </motion.div>

        {/* Label — pure CSS transition */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontWeight: 700,
            color: done ? cfg.color : '#111B11',
            opacity: done ? 0.78 : 1,
            textDecoration: done ? 'line-through' : 'none',
            transition: 'color 0.18s, opacity 0.18s',
          }}>
            {itemKey === 'workout' && workoutName ? workoutName : cfg.label}
          </p>
          <p style={{
            fontSize: 11, color: note ? '#5AAD50' : '#8FA08F', marginTop: 1,
            fontWeight: note ? 600 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {note
              ? note
              : itemKey === 'workout' && workoutName
                ? 'Workout'
                : cfg.sublabel}
          </p>
        </div>

        {/* Checkbox — scale pulse on done change, colors via CSS */}
        <motion.div
          animate={{ scale: done ? [1, 1.25, 1] : 1 }}
          transition={{ duration: 0.2, times: done ? [0, 0.4, 1] : undefined }}
          style={{
            width: 24, height: 24, borderRadius: 8, flexShrink: 0,
            border: `2px solid ${done ? cfg.border : '#C8DEC4'}`,
            backgroundColor: done ? cfg.border : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background-color 0.18s, border-color 0.18s',
          }}
        >
          <AnimatePresence>
            {done && (
              <motion.svg
                key="check"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                width="12" height="9" viewBox="0 0 12 9" fill="none"
              >
                <motion.path
                  d="M1 4L4.5 7.5L11 1"
                  stroke="white" strokeWidth="1.9"
                  strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.button>
    </div>
  );
}
