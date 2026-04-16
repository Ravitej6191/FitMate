'use client';
import { motion } from 'framer-motion';

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  color?: string;
  trackColor?: string;
  labelSize?: number;
}

export function ProgressRing({
  percent,
  size = 64,
  strokeWidth = 5,
  showLabel = true,
  color = '#5AAD50',
  trackColor = '#E8F3E4',
  labelSize = 13,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <motion.circle
          cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: labelSize, fontWeight: 700, color: '#111B11' }}>{percent}%</span>
        </div>
      )}
    </div>
  );
}
