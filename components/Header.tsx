'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { getGreeting, today, calcStreak } from '@/lib/utils';
import { Flame } from 'lucide-react';

export function Header() {
  const profile = useStore(s => s.profile);
  const logs = useStore(s => s.logs);
  const todayStr = today();

  const streak = useMemo(() => calcStreak(logs, todayStr), [logs, todayStr]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '20px 16px 8px' }}>
      {/* minWidth:0 allows the text block to shrink when the streak badge is wide */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 12, color: '#8FA08F', fontWeight: 500, marginBottom: 3 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 style={{
          fontSize: 22, fontWeight: 800, color: '#111B11', lineHeight: 1.15,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {getGreeting()}, {profile.name.split(' ')[0]}
        </h1>
      </div>
      {streak > 0 && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#FEF5D1', borderRadius: 20,
            padding: '7px 13px', border: '1px solid #F5C842',
          }}
        >
          <Flame size={15} color="#F5813E" fill="#F5813E" />
          <span style={{ fontSize: 14, fontWeight: 800, color: '#8B6E0A' }}>{streak}</span>
          <span style={{ fontSize: 11, color: '#A68A25', fontWeight: 500 }}>streak</span>
        </motion.div>
      )}
    </div>
  );
}
