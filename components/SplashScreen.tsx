'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Fill-based dumbbell — identical to the shape used in icon.tsx / apple-icon.tsx / icon.svg.
 * Using the same asset everywhere gives visual consistency across splash, favicon, and app icon.
 * Fill-based (not stroke-based) scales crisply at any size — no strokeWidth artefacts.
 */
function DumbbellFill({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
      {/* Left weight plate */}
      <rect x="1"  y="7"   width="4" height="10" rx="1.5" fill={color} />
      {/* Left collar */}
      <rect x="5"  y="9.5" width="2" height="5"  rx="1"   fill={color} />
      {/* Bar */}
      <rect x="7"  y="11"  width="10" height="2" rx="1"   fill={color} />
      {/* Right collar */}
      <rect x="17" y="9.5" width="2" height="5"  rx="1"   fill={color} />
      {/* Right weight plate */}
      <rect x="19" y="7"   width="4" height="10" rx="1.5" fill={color} />
    </svg>
  );
}

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExit(true),  2000);
    const t2 = setTimeout(() => onDone(),        2520);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <AnimatePresence>
      {!exit && (
        <motion.div
          key="splash"
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.52, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'linear-gradient(160deg, #0B1A0B 0%, #0E200F 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            cursor: 'default',
            touchAction: 'none',
          }}
        >
          {/* ── Logo mark ──
              pointerEvents: none — no Android tap-ripple on the icon.
              Tween easing instead of spring: eliminates the "bounce jerk"
              that spring transitions can cause on Android with variable frame rates.
              ease: [0.175, 0.885, 0.32, 1.275] = easeOutBack — clean scale-in
              with a tiny controlled overshoot at the end, no spring ringing. */}
          <motion.div
            initial={{ scale: 0.25, rotate: -20, opacity: 0 }}
            animate={{ scale: 1,    rotate: 0,   opacity: 1 }}
            transition={{ type: 'tween', duration: 0.55, delay: 0.08, ease: [0.175, 0.885, 0.32, 1.275] }}
            style={{
              width: 90, height: 90, borderRadius: 28,
              background: 'linear-gradient(135deg, #D3EDD0 0%, #B8E0B4 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 56px rgba(90,173,80,0.55), 0 14px 36px rgba(0,0,0,0.45)',
              marginBottom: 26,
              pointerEvents: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <DumbbellFill size={44} color="#1B3320" />
          </motion.div>

          {/* ── App name ── */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'tween', delay: 0.38, duration: 0.4, ease: [0.34, 1.05, 0.64, 1] }}
            style={{
              fontSize: 40, fontWeight: 900, color: '#FFFFFF',
              letterSpacing: '-0.03em', margin: 0, lineHeight: 1,
              pointerEvents: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            FitMate
          </motion.h1>

          {/* ── Tagline ── */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'tween', delay: 0.60, duration: 0.36, ease: 'easeOut' }}
            style={{
              fontSize: 13, color: '#5AAD50', marginTop: 8,
              fontWeight: 500, letterSpacing: '0.02em',
              pointerEvents: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Your daily fitness companion
          </motion.p>

          {/* ── Loading dots ────────────────────────────────────────────────────
            Uses Framer Motion (not CSS animation) to avoid the "mid-cycle jerk":
            CSS animations start running the moment the element mounts (t=0),
            so when the parent made them visible at t=0.9 s they were already
            0.9/1.1 = 82 % through their cycle — they appeared mid-pulse.

            With Framer Motion + per-dot delay, each dot starts from opacity:0
            (initial) and only begins its pulsing cycle after its own delay
            fires. The jump from opacity:0 → 0.3 (first keyframe) is barely
            perceptible because 0.3 is already dim.

            pointerEvents: none on every dot — prevents Android tap-ripple. */}
          <div
            style={{ position: 'absolute', bottom: 52, display: 'flex', gap: 7, alignItems: 'center', pointerEvents: 'none' }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
                transition={{
                  repeat: Infinity,
                  repeatType: 'loop',
                  duration: 1.1,
                  delay: 0.9 + i * 0.18, // appear after logo/name, staggered
                  ease: 'easeInOut',
                  repeatDelay: 0,
                }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: '#5AAD50', pointerEvents: 'none' }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
