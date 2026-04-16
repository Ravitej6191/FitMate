'use client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { ACHIEVEMENTS } from '@/lib/constants';
import { haptic } from '@/lib/utils';
import { ChevronLeft, Lock } from 'lucide-react';

export default function AchievementsPage() {
  const router               = useRouter();
  const unlockedAchievements = useStore(s => s.unlockedAchievements);

  const total    = ACHIEVEMENTS.length;
  const unlocked = unlockedAchievements.length;
  const pct      = Math.round((unlocked / total) * 100);

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
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>Achievements</h1>
      </div>

      {/* Stats row */}
      <div className="card" style={{ margin: '0 16px 16px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)' }}>{unlocked}</span>
            <span style={{ color: 'var(--text-3)' }}> / {total} unlocked</span>
          </p>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 100, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6 }}
            style={{ height: '100%', background: 'var(--accent)', borderRadius: 100 }}
          />
        </div>
      </div>

      {/* Achievement grid — unlocked first, then locked */}
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[...ACHIEVEMENTS].sort((a, b) => {
          const aU = unlockedAchievements.includes(a.id) ? 0 : 1;
          const bU = unlockedAchievements.includes(b.id) ? 0 : 1;
          return aU - bU;
        }).map((a, i) => {
          const isUnlocked = unlockedAchievements.includes(a.id);
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              style={{
                background: isUnlocked ? a.bg : 'var(--surface)',
                border: `1.5px solid ${isUnlocked ? a.color + '55' : 'var(--border)'}`,
                borderRadius: 18,
                padding: '16px 14px',
                position: 'relative',
                boxShadow: isUnlocked ? `0 4px 20px ${a.color}22` : 'var(--shadow-sm)',
                filter: isUnlocked ? 'none' : 'grayscale(0.6)',
                opacity: isUnlocked ? 1 : 0.6,
              }}
            >
              {/* Lock overlay for locked */}
              {!isUnlocked && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Lock size={10} color="var(--text-3)" strokeWidth={2} />
                </div>
              )}
              <div style={{ fontSize: 26, marginBottom: 8 }}>{a.icon}</div>
              <p style={{
                fontSize: 13, fontWeight: 800,
                color: isUnlocked ? a.color : 'var(--text-2)',
                marginBottom: 3, lineHeight: 1.2,
              }}>
                {a.title}
              </p>
              <p style={{ fontSize: 11, color: isUnlocked ? a.color + 'cc' : 'var(--text-3)', lineHeight: 1.4 }}>
                {a.desc}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
