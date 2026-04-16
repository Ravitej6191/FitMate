'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import type { MacroTargets } from '@/lib/store';
import { BottomSheet } from '@/components/BottomSheet';
import { today } from '@/lib/utils';
import { haptic } from '@/lib/utils';
import { ChevronLeft, Plus, Trash2, UtensilsCrossed, Settings } from 'lucide-react';

function MacroRing({ value, target, label, color }: { value: number; target: number; label: string; color: string }) {
  const pct = Math.min((value / Math.max(target, 1)) * 100, 100);
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
            strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1 }}>
            {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
          </span>
        </div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
        {label}
      </span>
      <span style={{ fontSize: 9, color: 'var(--text-3)' }}>/ {target}</span>
    </div>
  );
}

export default function NutritionPage() {
  const router      = useRouter();
  const logs        = useStore(s => s.logs);
  const profile     = useStore(s => s.profile);
  const addMacro    = useStore(s => s.addMacro);
  const removeMacro = useStore(s => s.removeMacro);
  const updateProfile = useStore(s => s.updateProfile);

  const todayStr = today();
  const log      = logs.find(l => l.date === todayStr);
  const macros   = log?.macros ?? [];
  const targets  = profile.macroTargets;

  const totals = macros.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein:  acc.protein  + m.protein,
      carbs:    acc.carbs    + m.carbs,
      fat:      acc.fat      + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [targetSheetOpen, setTargetSheetOpen] = useState(false);

  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });
  const [targetForm, setTargetForm] = useState<MacroTargets>({ ...targets });

  const openAdd = () => {
    haptic('light');
    setForm({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    setSheetOpen(true);
  };

  const saveMeal = () => {
    if (!form.name.trim()) return;
    haptic('success');
    addMacro(todayStr, {
      name:     form.name.trim(),
      calories: Number(form.calories) || 0,
      protein:  Number(form.protein)  || 0,
      carbs:    Number(form.carbs)    || 0,
      fat:      Number(form.fat)      || 0,
    });
    setSheetOpen(false);
  };

  const saveTargets = () => {
    updateProfile({ macroTargets: targetForm });
    haptic('success');
    setTargetSheetOpen(false);
  };

  const caloriesPct = Math.min((totals.calories / Math.max(targets.calories, 1)) * 100, 100);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'var(--surface)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <ChevronLeft size={18} color="var(--text-2)" />
          </motion.button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)' }}>Nutrition</h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => { haptic('light'); setTargetForm({ ...targets }); setTargetSheetOpen(true); }}
          style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', outline: 'none',
          }}
        >
          <Settings size={16} color="var(--text-2)" />
        </motion.button>
      </div>

      {/* Calorie summary card */}
      <div className="card" style={{ margin: '0 16px 12px', padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Calories Today</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#F5813E', lineHeight: 1 }}>{totals.calories}</span>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>/ {targets.calories} kcal</span>
            </div>
          </div>
          <div style={{
            background: '#FEF0E8', borderRadius: 16,
            padding: '8px 12px', border: '1px solid #F5813E33',
            textAlign: 'right',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#F5813E' }}>
              {targets.calories - totals.calories > 0 ? `${targets.calories - totals.calories} left` : 'Goal reached!'}
            </p>
          </div>
        </div>

        {/* Calorie progress bar */}
        <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 100, overflow: 'hidden', marginBottom: 14 }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${caloriesPct}%` }}
            transition={{ duration: 0.6 }}
            style={{ height: '100%', background: '#F5813E', borderRadius: 100 }}
          />
        </div>

        {/* 4 macro rings */}
        <div style={{ display: 'flex', gap: 4 }}>
          <MacroRing value={totals.calories} target={targets.calories} label="Cal"     color="#F5813E" />
          <MacroRing value={totals.protein}  target={targets.protein}  label="Protein" color="#5AAD50" />
          <MacroRing value={totals.carbs}    target={targets.carbs}    label="Carbs"   color="#F5C842" />
          <MacroRing value={totals.fat}      target={targets.fat}      label="Fat"     color="#4F9FDB" />
        </div>
      </div>

      {/* Meal list */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
          Today's Meals
        </p>
        <AnimatePresence>
          {macros.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: '28px 24px', textAlign: 'center',
                background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border-2)',
              }}
            >
              <UtensilsCrossed size={28} color="var(--text-3)" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)' }}>No meals logged yet</p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Tap "Log Meal" to track your nutrition.</p>
            </motion.div>
          ) : (
            macros.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card"
                style={{ padding: '12px 14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#F5813E' }}>{m.calories}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>kcal</span>
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => { haptic('light'); removeMacro(todayStr, m.id); }}
                      style={{
                        background: '#FDE8E5', border: '1px solid #E86B5A',
                        borderRadius: 8, padding: '4px 6px',
                        cursor: 'pointer', outline: 'none',
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      <Trash2 size={12} color="#E86B5A" />
                    </motion.button>
                  </div>
                </div>
                {/* P/C/F row */}
                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { label: 'P', value: m.protein, color: '#5AAD50' },
                    { label: 'C', value: m.carbs,   color: '#F5C842' },
                    { label: 'F', value: m.fat,     color: '#4F9FDB' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 5, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color }}>{label}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{value}g</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add meal button */}
      <div style={{ padding: '16px 16px 0' }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={openAdd}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--primary)', border: 'none', borderRadius: 16,
            padding: 15, fontSize: 15, fontWeight: 700, color: '#fff',
            cursor: 'pointer', outline: 'none',
          }}
        >
          <Plus size={18} color="#fff" strokeWidth={2.5} />
          Log Meal
        </motion.button>
      </div>

      {/* Add meal sheet */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Log Meal">
        <div style={{ paddingBottom: 8 }}>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Meal Name</p>
            <input
              autoFocus
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value.slice(0, 80) }))}
              placeholder="e.g. Oats with Berries"
              maxLength={80}
            />
          </div>

          {[
            { key: 'calories' as const, label: 'Calories (kcal)', max: 10000 },
            { key: 'protein'  as const, label: 'Protein (g)',     max: 1000 },
            { key: 'carbs'    as const, label: 'Carbs (g)',       max: 2000 },
            { key: 'fat'      as const, label: 'Fat (g)',         max: 500 },
          ].map(({ key, label, max }) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</p>
              <input
                type="number"
                min="0"
                max={max}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder="0"
              />
            </div>
          ))}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={saveMeal}
            style={{
              width: '100%', background: 'var(--primary)', border: 'none',
              borderRadius: 16, padding: 15, marginTop: 4,
              fontSize: 15, fontWeight: 800, color: '#fff',
              cursor: 'pointer', outline: 'none',
            }}
          >
            Save Meal
          </motion.button>
        </div>
      </BottomSheet>

      {/* Edit targets sheet */}
      <BottomSheet open={targetSheetOpen} onClose={() => setTargetSheetOpen(false)} title="Macro Targets">
        <div style={{ paddingBottom: 8 }}>
          {([
            { key: 'calories' as keyof MacroTargets, label: 'Daily Calories (kcal)', min: 500,  max: 10000 },
            { key: 'protein'  as keyof MacroTargets, label: 'Protein (g)',            min: 10,   max: 1000  },
            { key: 'carbs'    as keyof MacroTargets, label: 'Carbs (g)',              min: 10,   max: 2000  },
            { key: 'fat'      as keyof MacroTargets, label: 'Fat (g)',                min: 5,    max: 500   },
          ]).map(({ key, label, min, max }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</p>
              <input
                type="number"
                min={min}
                max={max}
                value={targetForm[key] || ''}
                onChange={e => setTargetForm(f => ({ ...f, [key]: Number(e.target.value) }))}
              />
            </div>
          ))}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={saveTargets}
            style={{
              width: '100%', background: 'var(--primary)', border: 'none',
              borderRadius: 16, padding: 15, fontSize: 15, fontWeight: 800, color: '#fff',
              cursor: 'pointer', outline: 'none',
            }}
          >
            Save Targets
          </motion.button>
        </div>
      </BottomSheet>
    </div>
  );
}
