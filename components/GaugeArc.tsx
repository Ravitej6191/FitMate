'use client';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';

interface GaugeArcProps {
  percent: number;
  label?: string;
  sublabel?: string;
}

/**
 *  Layout (cross-section):
 *
 *       ╭──── colored arc ────╮
 *      ╱                       ╲
 *     ╱    ← needle sweeps here  ╲
 *    ╱                             ╲
 *   ●─────────────────────────────●   ← cy  (pivot line / arc mouth)
 *   0%          67%            100%
 *           Today's Progress
 *
 *  Text lives BELOW cy → needle can never cover it.
 */
export function GaugeArc({ percent, label, sublabel }: GaugeArcProps) {
  const W  = 260;
  const H  = 196;
  const cx = W / 2;   // 130 — horizontal centre
  const cy = 88;      // pivot row — arc above, text below
  const R  = 84;      // arc radius
  const SW = 15;      // stroke width
  const NL = R - 12;  // needle length (slightly shorter than arc)

  // Semicircle: bottom-left → top → bottom-right
  const arcPath = `M ${cx - R},${cy} A ${R},${R} 0 0 1 ${cx + R},${cy}`;
  const arcLen  = Math.PI * R;

  // ── Animated progress value ───────────────────────────────────────────────
  const pv = useMotionValue(0);
  useEffect(() => {
    const ctrl = animate(pv, percent, {
      duration: 1.1,
      ease: [0.4, 0, 0.2, 1],
      delay: 0.1,
    });
    return ctrl.stop;
  }, [percent, pv]);

  // Arc fill
  const dashOffset = useTransform(pv, v => arcLen - (v / 100) * arcLen);

  // Needle tip — pure trig, no CSS transform
  // 0 % → angle 180° (left)   tip = (cx - NL, cy)
  // 50% → angle  90° (up)     tip = (cx,       cy - NL)
  // 100%→ angle   0° (right)  tip = (cx + NL, cy)
  const tipX = useTransform(pv, v =>
    cx + NL * Math.cos(((180 - (v / 100) * 180) * Math.PI) / 180)
  );
  const tipY = useTransform(pv, v =>
    cy - NL * Math.sin(((180 - (v / 100) * 180) * Math.PI) / 180)
  );

  const ticks = [0, 25, 50, 75, 100];

  return (
    <div style={{ userSelect: 'none' }}>
      <svg
        width={W} height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: 'visible', display: 'block' }}
      >
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#F5C842" />
            <stop offset="50%"  stopColor="#5AAD50" />
            <stop offset="100%" stopColor="#2E5E28" />
          </linearGradient>
        </defs>

        {/* ── Background track ── */}
        <path
          d={arcPath} fill="none"
          stroke="#E0EDD8" strokeWidth={SW} strokeLinecap="round"
        />

        {/* ── Animated fill ── */}
        <motion.path
          d={arcPath} fill="none"
          stroke="url(#gaugeGrad)" strokeWidth={SW} strokeLinecap="round"
          strokeDasharray={arcLen}
          style={{ strokeDashoffset: dashOffset }}
        />

        {/* ── Tick marks ── */}
        {ticks.map(t => {
          const rad = ((180 - (t / 100) * 180) * Math.PI) / 180;
          const ir  = R - SW / 2 - 2;
          const or  = R + SW / 2 + 5;
          return (
            <line key={t}
              x1={cx + ir * Math.cos(rad)} y1={cy - ir * Math.sin(rad)}
              x2={cx + or * Math.cos(rad)} y2={cy - or * Math.sin(rad)}
              stroke="#C8DEC4" strokeWidth={1.5} strokeLinecap="round"
            />
          );
        })}

        {/* ── Needle — no tip dot ── */}
        <motion.line
          x1={cx} y1={cy}
          x2={tipX} y2={tipY}
          stroke="#1B3320" strokeWidth={2.5} strokeLinecap="round"
        />

        {/* ── Centre hub ── */}
        <circle cx={cx} cy={cy} r={8.5} fill="#1B3320" />
        <circle cx={cx} cy={cy} r={4}   fill="#FFFFFF" />

        {/* ══ Text zone — safely BELOW pivot, never touched by needle ══ */}

        {/* Big % number */}
        {label && (
          <text
            x={cx} y={cy + 54}
            textAnchor="middle"
            fontSize="32" fontWeight="800" fill="#111B11"
            fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
          >
            {label}
          </text>
        )}

        {/* Subtitle */}
        {sublabel && (
          <text
            x={cx} y={cy + 76}
            textAnchor="middle"
            fontSize="11" fontWeight="500" fill="#8FA08F"
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
          >
            {sublabel}
          </text>
        )}

        {/* ── Scale edge labels flush with arc mouth ── */}
        <text
          x={cx - R + 2} y={cy + 20}
          textAnchor="middle" fontSize="10" fontWeight="600" fill="#8FA08F"
        >
          0%
        </text>
        <text
          x={cx + R - 2} y={cy + 20}
          textAnchor="middle" fontSize="10" fontWeight="600" fill="#8FA08F"
        >
          100%
        </text>
      </svg>
    </div>
  );
}
