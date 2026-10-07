'use client';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { BottomSheet } from '@/components/BottomSheet';
import { BodyCard, FormField } from '@/components/ProfileParts';
import { calcBMI, haptic } from '@/lib/utils';
import { STORAGE_KEY, GOAL_OPTIONS } from '@/lib/constants';
import {
  User, Ruler, Scale, Edit2, Trash2, Activity,
  Droplets, Camera, Footprints, ChevronRight,
  Trophy, Download, Upload, Save, LogOut, ShieldCheck,
} from 'lucide-react';
import { cancelAllNotifications } from '@/lib/notifications';
import { useRouter } from 'next/navigation';
import { getAuthType, signOutGoogle } from '@/lib/auth'; // getAuthType used in useState initializer

// ─── Image compression helper ─────────────────────────────────────────────────
// Centre-crop to square → resize to max 300px → JPEG 75% → base64
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      const MAX = 300;
      canvas.width = canvas.height = Math.min(size, MAX);
      const ctx = canvas.getContext('2d')!;
      const sx = (img.width  - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router        = useRouter();
  const profile       = useStore(s => s.profile);
  const updateProfile = useStore(s => s.updateProfile);
  const resetStore    = useStore(s => s.resetStore);
  const exportData    = useStore(s => s.exportData);
  const importData    = useStore(s => s.importData);
  const logs          = useStore(s => s.logs);
  const unlockedAchievements = useStore(s => s.unlockedAchievements);

  const [editOpen,        setEditOpen]        = useState(false);
  const [form,            setForm]            = useState({ ...profile });
  const [showReset,       setShowReset]       = useState(false);
  const [showSignOut,     setShowSignOut]     = useState(false);
  const [restoreOpen,     setRestoreOpen]     = useState(false);
  const [restoreText,     setRestoreText]     = useState('');
  const [restoreError,    setRestoreError]    = useState('');

  const [authType, setAuthTypeState] = useState(() => getAuthType());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const bmi = calcBMI(profile.weightKg, profile.heightCm);
  const bmiColor =
    bmi.value === 0 ? '#8FA08F' :
    bmi.value < 18.5 ? '#4F9FDB' :
    bmi.value < 25   ? '#5AAD50' :
    bmi.value < 30   ? '#F5C842' : '#E86B5A';

  // ── Photo picker ────────────────────────────────────────────────────────────
  const handleAvatarTap = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await compressImage(file);
      updateProfile({ photoBase64: b64 });
    } catch { /* ignore */ }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // ── Edit sheet ───────────────────────────────────────────────────────────────
  const openEdit = () => { setForm({ ...profile }); setEditOpen(true); };

  const save = () => {
    updateProfile({
      ...form,
      name:        form.name.trim() || 'Athlete',
      age:         Math.min(120, Math.max(1,   Number(form.age)       || 25)),
      heightCm:    Math.min(300, Math.max(50,  Number(form.heightCm)  || 175)),
      weightKg:    Math.min(500, Math.max(20,  Number(form.weightKg)  || 75)),
      waterTarget: +Math.min(6.0, Math.max(1.0, Number(form.waterTarget) || 4.0)).toFixed(1),
      stepGoal:    Math.min(50000, Math.max(1000, Number(form.stepGoal) || 8000)),
    });
    setEditOpen(false);
  };

  // ── CSV Export ──────────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    haptic('light');
    const header = 'date,workoutName,workout_done,breakfast_done,lunch_done,steps,waterIntake,totalCalories,totalProtein,totalCarbs,totalFat';
    const rows = logs.map(l => {
      const totCal  = l.macros?.reduce((s, m) => s + m.calories, 0) ?? 0;
      const totPro  = l.macros?.reduce((s, m) => s + m.protein,  0) ?? 0;
      const totCarb = l.macros?.reduce((s, m) => s + m.carbs,    0) ?? 0;
      const totFat  = l.macros?.reduce((s, m) => s + m.fat,      0) ?? 0;
      return [
        l.date, l.workoutName,
        l.completed.workout ? '1' : '0',
        l.completed.breakfast ? '1' : '0',
        l.completed.lunch ? '1' : '0',
        l.stepCount, l.waterIntake,
        totCal, totPro, totCarb, totFat,
      ].join(',');
    });
    const csv = [header, ...rows].join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'FitMate Export', text: csv });
      } else {
        await navigator.clipboard.writeText(csv);
        alert('CSV copied to clipboard!');
      }
    } catch { /* ignore */ }
  };

  // ── Backup ──────────────────────────────────────────────────────────────────
  const handleBackup = async () => {
    haptic('light');
    const data = exportData();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'FitMate Backup', text: data });
      } else {
        await navigator.clipboard.writeText(data);
        alert('Backup copied to clipboard!');
      }
    } catch { /* ignore */ }
  };

  // ── Restore ─────────────────────────────────────────────────────────────────
  const handleRestore = () => {
    setRestoreError('');
    if (!importData(restoreText)) {
      setRestoreError('Invalid backup — paste the full JSON produced by "Backup Data".');
      return;
    }
    setRestoreText('');
    setRestoreOpen(false);
  };

  // ── Google Sign-Out (keeps local data, clears Google session) ────────────────
  const handleSignOut = async () => {
    setShowSignOut(false);
    setAuthTypeState(null);
    await signOutGoogle(); // clears fitmate_google_user + fitmate_auth_type natively
    // Flush googlePhotoUrl + email removal SYNCHRONOUSLY to localStorage before
    // navigating — updateProfile debounces by 250ms so we bypass it here.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.profile) {
          delete data.profile.googlePhotoUrl;
          delete data.profile.email;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch { /* ignore */ }
    try { localStorage.removeItem('fitmate_onboarded_v1'); } catch { /* ignore */ }
    // Navigate directly — avoids reload→profile→redirect race condition
    window.location.href = '/onboarding';
  };

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    setShowReset(false);
    // Race cancelAllNotifications against a 1.5s timeout — getPending() can
    // hang indefinitely on Android when notification permission was never granted
    await Promise.race([
      cancelAllNotifications().catch(() => {}),
      new Promise<void>(r => setTimeout(r, 1500)),
    ]);
    // Sign out Google native session so the account picker is fresh next time
    if (authType === 'google') {
      try { await signOutGoogle(); } catch { /* ignore */ }
    }
    // Wipe every persisted flag
    try {
      localStorage.removeItem('fitmate_onboarded_v1');
      localStorage.removeItem('fitmate_auth_type');
      localStorage.removeItem('fitmate_notif_asked_v1');
      localStorage.removeItem('fitmate_google_user');
    } catch { /* ignore */ }
    resetStore();
    // replace() avoids pushing another entry onto the history stack
    // (the BottomSheet already pushed one via pushState that we didn't pop)
    window.location.replace('/onboarding');
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingBottom: 96 }}>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 12px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111B11' }}>Profile</h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={openEdit}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#D3EDD0', border: '1px solid #5AAD50',
            borderRadius: 20, padding: '8px 14px',
            fontSize: 13, fontWeight: 700, color: '#2E5E28',
            cursor: 'pointer', outline: 'none',
          }}
        >
          <Edit2 size={13} color="#2E5E28" />
          Edit
        </motion.button>
      </div>

      {/* ── Profile card ── */}
      <div className="card" style={{ margin: '0 16px 12px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

          {/* Tappable avatar — shows manual photo, Google photo, or default */}
          <motion.div
            whileTap={{ scale: 0.93 }}
            onClick={handleAvatarTap}
            style={{
              position: 'relative', width: 68, height: 68,
              borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {(profile.photoBase64 || profile.googlePhotoUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photoBase64 || profile.googlePhotoUrl}
                alt="Profile"
                referrerPolicy="no-referrer"
                style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid #5AAD50' }}
              />
            ) : (
              <div style={{
                width: 68, height: 68, borderRadius: '50%',
                background: '#D3EDD0', border: '2.5px solid #5AAD50',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={28} color="#2E5E28" strokeWidth={1.8} />
              </div>
            )}
            {/* Camera badge */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 22, height: 22, borderRadius: '50%',
              background: '#1B3320', border: '2px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Camera size={11} color="#fff" strokeWidth={2} />
            </div>
          </motion.div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111B11' }}>{profile.name}</h2>
            <p style={{ fontSize: 12, color: '#8FA08F', marginTop: 3 }}>
              {profile.age > 0 ? `${profile.age} yrs` : ''}
              {profile.age > 0 && profile.gender !== 'other' ? ' · ' : ''}
              {profile.gender !== 'other' ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : ''}
            </p>
            {/* Auth badge */}
            {authType === 'google' && profile.email ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                marginTop: 5, background: '#E8F3E4',
                border: '1px solid #5AAD5033', borderRadius: 20,
                padding: '3px 8px',
              }}>
                <ShieldCheck size={10} color="#5AAD50" strokeWidth={2.5} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#2E5E28', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.email}
                </span>
              </div>
            ) : authType === 'guest' ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                marginTop: 5, background: '#F4FAF1',
                border: '1px solid #D9EDD4', borderRadius: 20,
                padding: '3px 8px',
              }}>
                <User size={10} color="#8FA08F" strokeWidth={2} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#8FA08F' }}>Guest</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Body stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '0 16px 12px' }}>
        <BodyCard Icon={Ruler}    value={profile.heightCm > 0 ? `${profile.heightCm}` : '—'} unit="cm"                           label="Height" color="#4F9FDB" bg="#DCF0FC" />
        <BodyCard Icon={Scale}    value={profile.weightKg > 0 ? `${profile.weightKg}` : '—'} unit="kg"                           label="Weight" color="#3BB5A3" bg="#D1F0EB" />
        <BodyCard Icon={Activity} value={bmi.value > 0 ? `${bmi.value}` : '—'}               unit={bmi.value > 0 ? bmi.label : ''} label="BMI"    color={bmiColor} bg={bmi.value === 0 ? '#F4FAF1' : bmiColor + '22'} />
      </div>

      {/* ── BMI scale ── */}
      {bmi.value > 0 && (
        <div className="card" style={{ margin: '0 16px 12px', padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#8FA08F', textTransform: 'uppercase', letterSpacing: '0.07em' }}>BMI Scale</p>
            <span style={{ fontSize: 12, fontWeight: 700, color: bmiColor }}>{bmi.value} — {bmi.label}</span>
          </div>
          <div style={{ height: 8, borderRadius: 100, overflow: 'hidden', background: 'linear-gradient(to right, #4F9FDB 0%, #5AAD50 30%, #F5C842 60%, #E86B5A 100%)' }}>
            <div style={{
              position: 'relative', height: '100%',
              marginLeft: `${Math.min(Math.max(((bmi.value - 15) / 25) * 100, 0), 98)}%`,
              width: 3, background: '#1B3320', borderRadius: 2,
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            {[15, 18.5, 25, 30, 40].map(v => (
              <span key={v} style={{ fontSize: 9, color: '#8FA08F' }}>{v}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Goals row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px 12px' }}>
        {/* Water goal */}
        <div className="card" style={{ padding: '14px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#DCF0FC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Droplets size={14} color="#4F9FDB" strokeWidth={2} />
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#4A5D4A' }}>Water Goal</p>
          </div>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#4F9FDB', lineHeight: 1 }}>{profile.waterTarget.toFixed(1)}</p>
          <p style={{ fontSize: 11, color: '#8FA08F', marginTop: 2 }}>litres / day</p>
        </div>
        {/* Step goal */}
        <div className="card" style={{ padding: '14px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EDE0FC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Footprints size={14} color="#9B6FDB" strokeWidth={2} />
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#4A5D4A' }}>Step Goal</p>
          </div>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#9B6FDB', lineHeight: 1 }}>{(profile.stepGoal ?? 8000).toLocaleString()}</p>
          <p style={{ fontSize: 11, color: '#8FA08F', marginTop: 2 }}>steps / day</p>
        </div>
      </div>


      {/* ── Achievements row ── */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => { haptic('light'); router.push('/achievements'); }}
        className="card"
        style={{
          margin: '0 16px 12px', padding: '14px 16px', width: 'calc(100% - 32px)',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', outline: 'none', textAlign: 'left',
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: '#FEF5D1', border: '1px solid #F5C84233',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Trophy size={16} color="#F5C842" strokeWidth={2} />
        </div>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Achievements</span>
        {unlockedAchievements.length > 0 && (
          <div style={{
            background: '#D3EDD0', borderRadius: 10, padding: '3px 8px',
            fontSize: 11, fontWeight: 700, color: '#2E5E28',
          }}>
            {unlockedAchievements.length}
          </div>
        )}
        <ChevronRight size={16} color="var(--text-3)" />
      </motion.button>

      {/* ── Data section ── */}
      <div className="card" style={{ margin: '0 16px 12px', padding: '14px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          Data Management
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleExportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface-2)', border: '1.5px solid var(--border)',
              borderRadius: 12, padding: '11px 14px',
              cursor: 'pointer', outline: 'none', textAlign: 'left',
            }}
          >
            <Download size={15} color="var(--text-2)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Export CSV</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleBackup}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface-2)', border: '1.5px solid var(--border)',
              borderRadius: 12, padding: '11px 14px',
              cursor: 'pointer', outline: 'none', textAlign: 'left',
            }}
          >
            <Save size={15} color="var(--text-2)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Backup Data</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { haptic('light'); setRestoreOpen(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface-2)', border: '1.5px solid var(--border)',
              borderRadius: 12, padding: '11px 14px',
              cursor: 'pointer', outline: 'none', textAlign: 'left',
            }}
          >
            <Upload size={15} color="var(--text-2)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Restore Backup</span>
          </motion.button>
        </div>
      </div>

      {/* ── Account section ── */}
      {authType === 'google' && (
        <div className="card" style={{ margin: '0 16px 12px', padding: '14px 16px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Google Account
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {profile.googlePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.googlePhotoUrl} alt="Google" referrerPolicy="no-referrer"
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #5AAD5044', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#D3EDD0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={18} color="#2E5E28" />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name}</p>
              {profile.email && (
                <p style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.email}</p>
              )}
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { haptic('light'); setShowSignOut(true); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'var(--surface-2)', border: '1.5px solid var(--border)',
              borderRadius: 12, padding: '11px 14px',
              fontSize: 13, fontWeight: 700, color: 'var(--text-2)',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <LogOut size={14} color="var(--text-2)" />
            Sign Out of Google
          </motion.button>
        </div>
      )}

      {/* ── Danger zone ── */}
      <div style={{ padding: '0 16px' }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowReset(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: '#FDE8E5', border: '1.5px solid #E86B5A', borderRadius: 16,
            padding: 14, fontSize: 14, fontWeight: 700, color: '#E86B5A',
            cursor: 'pointer', outline: 'none',
          }}
        >
          <Trash2 size={15} color="#E86B5A" />
          Clear All Data
        </motion.button>
      </div>

      {/* ── Edit sheet ── */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile">
        <div style={{ paddingBottom: 8 }}>
          <FormField label="Name">
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value.slice(0, 50) }))}
              placeholder="Your name"
              autoComplete="name"
              maxLength={50}
            />
          </FormField>

          <FormField label="Fitness Goal">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {GOAL_OPTIONS.map(g => (
                <motion.button key={g} whileTap={{ scale: 0.97 }}
                  onClick={() => setForm(f => ({ ...f, goal: g }))}
                  style={{
                    padding: '10px 14px', borderRadius: 12, textAlign: 'left',
                    background: form.goal === g ? '#D3EDD0' : '#F4FAF1',
                    border: `1.5px solid ${form.goal === g ? '#5AAD50' : '#DFF0D8'}`,
                    fontSize: 13, fontWeight: 700,
                    color: form.goal === g ? '#2E5E28' : '#4A5D4A',
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  {g}
                </motion.button>
              ))}
            </div>
          </FormField>

          <FormField label="Age">
            <input
              type="number" min="1" max="120" step="1"
              value={form.age || ''}
              onChange={e => {
                const v = Math.min(120, Math.max(1, Number(e.target.value)));
                setForm(f => ({ ...f, age: v || Number(e.target.value) }));
              }}
              placeholder="25"
              autoComplete="off"
            />
          </FormField>

          <FormField label="Gender">
            <div style={{ display: 'flex', gap: 8 }}>
              {(['male', 'female', 'other'] as const).map(g => (
                <motion.button key={g} whileTap={{ scale: 0.92 }} onClick={() => setForm(f => ({ ...f, gender: g }))}
                  style={{ flex: 1, padding: '10px 4px', borderRadius: 12, background: form.gender === g ? '#D3EDD0' : '#F4FAF1', border: `1.5px solid ${form.gender === g ? '#5AAD50' : '#DFF0D8'}`, fontSize: 13, fontWeight: 700, color: form.gender === g ? '#2E5E28' : '#4A5D4A', cursor: 'pointer', outline: 'none', textTransform: 'capitalize' }}>
                  {g}
                </motion.button>
              ))}
            </div>
          </FormField>

          <FormField label="Height (cm)">
            <input type="number" min="50" max="300" step="1" value={form.heightCm || ''} onChange={e => setForm(f => ({ ...f, heightCm: Math.min(300, Math.max(0, Number(e.target.value))) }))} placeholder="175" />
          </FormField>

          <FormField label="Weight (kg)">
            <input type="number" min="20" max="500" step="0.1" value={form.weightKg || ''} onChange={e => setForm(f => ({ ...f, weightKg: Math.min(500, Math.max(0, Number(e.target.value))) }))} placeholder="75" />
          </FormField>

          <FormField label="Daily Water Goal">
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#F4FAF1', borderRadius: 14, border: '1.5px solid #DFF0D8', overflow: 'hidden' }}>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => setForm(f => ({ ...f, waterTarget: +Math.max(1.0, +(f.waterTarget ?? 4.0) - 0.5).toFixed(1) }))}
                style={{ width: 48, height: 48, background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 22, fontWeight: 300, color: '#4A5D4A', lineHeight: 1 }}>−</span>
              </motion.button>
              <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid #DFF0D8', borderRight: '1px solid #DFF0D8', padding: '10px 4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                  <span style={{ fontSize: 26, fontWeight: 900, color: '#4F9FDB' }}>{(form.waterTarget ?? 4.0).toFixed(1)}</span>
                  <span style={{ fontSize: 13, color: '#8FA08F', fontWeight: 600 }}>L</span>
                </div>
                <p style={{ fontSize: 11, color: '#3BB5A3', fontWeight: 600, marginTop: 1 }}>
                  {Math.round((form.waterTarget ?? 4.0) / 0.5)} segments · {((form.waterTarget ?? 4.0) * 1000).toFixed(0)} ml
                </p>
              </div>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => setForm(f => ({ ...f, waterTarget: +Math.min(6.0, +(f.waterTarget ?? 4.0) + 0.5).toFixed(1) }))}
                style={{ width: 48, height: 48, background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 22, fontWeight: 300, color: '#4A5D4A', lineHeight: 1 }}>+</span>
              </motion.button>
            </div>
            <p style={{ fontSize: 11, color: '#C8DEC4', marginTop: 5 }}>Each tap on dashboard = 0.5 L · range 1.0 – 6.0 L</p>
          </FormField>

          <FormField label="Daily Step Goal">
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#F4FAF1', borderRadius: 14, border: '1.5px solid #DFF0D8', overflow: 'hidden' }}>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => setForm(f => ({ ...f, stepGoal: Math.max(1000, (f.stepGoal ?? 8000) - 500) }))}
                style={{ width: 48, height: 48, background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 22, fontWeight: 300, color: '#4A5D4A', lineHeight: 1 }}>−</span>
              </motion.button>
              <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid #DFF0D8', borderRight: '1px solid #DFF0D8', padding: '10px 4px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                  <span style={{ fontSize: 26, fontWeight: 900, color: '#9B6FDB' }}>{((form.stepGoal ?? 8000) / 1000).toFixed(1)}</span>
                  <span style={{ fontSize: 13, color: '#8FA08F', fontWeight: 600 }}>k steps</span>
                </div>
                <p style={{ fontSize: 11, color: '#9B6FDB', fontWeight: 600, opacity: 0.7, marginTop: 1 }}>
                  {(form.stepGoal ?? 8000).toLocaleString()} steps / day
                </p>
              </div>
              <motion.button whileTap={{ scale: 0.88 }} onClick={() => setForm(f => ({ ...f, stepGoal: Math.min(50000, (f.stepGoal ?? 8000) + 500) }))}
                style={{ width: 48, height: 48, background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 22, fontWeight: 300, color: '#4A5D4A', lineHeight: 1 }}>+</span>
              </motion.button>
            </div>
            <p style={{ fontSize: 11, color: '#C8DEC4', marginTop: 5 }}>Steps counted by device sensor · range 1k – 50k</p>
          </FormField>

          <motion.button whileTap={{ scale: 0.97 }} onClick={save}
            style={{ width: '100%', background: '#1B3320', border: 'none', borderRadius: 16, padding: 16, marginTop: 8, fontSize: 15, fontWeight: 800, color: '#FFFFFF', cursor: 'pointer', outline: 'none' }}>
            Save Profile
          </motion.button>
        </div>
      </BottomSheet>

      {/* ── Restore confirm ── */}
      <BottomSheet open={restoreOpen} onClose={() => setRestoreOpen(false)} title="Restore Backup">
        <div style={{ paddingBottom: 8 }}>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.5 }}>
            Paste your backup JSON below. This will replace all current data.
          </p>
          <textarea
            value={restoreText}
            onChange={e => setRestoreText(e.target.value)}
            placeholder='{"template": [...], "logs": [...], ...}'
            style={{ height: 140, resize: 'none', marginBottom: 8, fontSize: 12 }}
          />
          {restoreError && (
            <p style={{ fontSize: 12, color: '#E86B5A', marginBottom: 10 }}>{restoreError}</p>
          )}
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleRestore}
            style={{ width: '100%', background: 'var(--primary)', border: 'none', borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', outline: 'none' }}>
            Import & Restore
          </motion.button>
        </div>
      </BottomSheet>

      {/* ── Sign-out confirm ── */}
      <BottomSheet open={showSignOut} onClose={() => setShowSignOut(false)} title="Sign Out?">
        <div style={{ paddingBottom: 8 }}>
          <p style={{ fontSize: 14, color: '#4A5D4A', marginBottom: 20, lineHeight: 1.5 }}>
            Your fitness data stays on this device. You'll be taken back to the Get Started screen to sign in again.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowSignOut(false)}
              style={{ flex: 1, background: '#F4FAF1', border: '1.5px solid #D9EDD4', borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 700, color: '#4A5D4A', cursor: 'pointer', outline: 'none' }}>
              Cancel
            </motion.button>
            <motion.button whileTap={{ scale: 0.96 }} onClick={handleSignOut}
              style={{ flex: 1, background: '#1B3320', border: 'none', borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', outline: 'none' }}>
              Sign Out
            </motion.button>
          </div>
        </div>
      </BottomSheet>

      {/* ── Reset confirm ── */}
      <BottomSheet open={showReset} onClose={() => setShowReset(false)} title="Clear All Data?">
        <div style={{ paddingBottom: 8 }}>
          <p style={{ fontSize: 14, color: '#4A5D4A', marginBottom: 20, lineHeight: 1.5 }}>
            This permanently deletes all logs, your weekly plan, profile data, and cancels all notifications. This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowReset(false)}
              style={{ flex: 1, background: '#F4FAF1', border: '1.5px solid #D9EDD4', borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 700, color: '#4A5D4A', cursor: 'pointer', outline: 'none' }}>
              Cancel
            </motion.button>
            <motion.button whileTap={{ scale: 0.96 }} onClick={handleReset}
              style={{ flex: 1, background: '#FDE8E5', border: '1.5px solid #E86B5A', borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 700, color: '#E86B5A', cursor: 'pointer', outline: 'none' }}>
              Clear Data
            </motion.button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
