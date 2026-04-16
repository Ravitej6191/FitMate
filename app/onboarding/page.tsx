'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { haptic } from '@/lib/utils';
import { GOAL_OPTIONS } from '@/lib/constants';
import { signInWithGoogle, setAuthType as persistAuthType } from '@/lib/auth';
import { User, Target, Droplets, Footprints, UtensilsCrossed, ChevronRight } from 'lucide-react';

function DumbbellFill({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
      <rect x="1"  y="7"   width="4" height="10" rx="1.5" fill={color} />
      <rect x="5"  y="9.5" width="2" height="5"  rx="1"   fill={color} />
      <rect x="7"  y="11"  width="10" height="2" rx="1"   fill={color} />
      <rect x="17" y="9.5" width="2" height="5"  rx="1"   fill={color} />
      <rect x="19" y="7"   width="4" height="10" rx="1.5" fill={color} />
    </svg>
  );
}

export default function OnboardingPage() {
  const updateProfile = useStore(s => s.updateProfile);
  const router = useRouter();

  // 0=welcome  1=goal  2=about  3=targets
  const [step, setStep] = useState(0);
  const [dir,  setDir]  = useState(1);

  // Auth state
  const [authType, setAuthType]   = useState<'google' | 'guest' | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError,   setGoogleError]   = useState<string | null>(null);

  // Form fields
  const [name,        setName]        = useState('');
  const [goal,        setGoal]        = useState(GOAL_OPTIONS[0]);
  const [age,         setAge]         = useState('');
  const [gender,      setGender]      = useState<'male'|'female'|'other'>('male');
  const [heightCm,    setHeightCm]    = useState('');
  const [weightKg,    setWeightKg]    = useState('');
  const [waterTarget, setWaterTarget] = useState(3.0);
  const [stepGoal,    setStepGoal]    = useState(8000);
  const [calories,    setCalories]    = useState(2000);
  const [protein,     setProtein]     = useState(150);
  const [carbs,       setCarbs]       = useState(250);
  const [fat,         setFat]         = useState(65);

  // Validation errors
  const [aboutErrors, setAboutErrors] = useState<Record<string, string>>({});

  const go = (next: number) => { setDir(next > step ? 1 : -1); setStep(next); };

  // Validate About You before advancing
  const validateAbout = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    const ageN = Number(age);
    if (!age || isNaN(ageN) || ageN < 1 || ageN > 120) errs.age = 'Enter a valid age (1–120)';
    const hN = Number(heightCm);
    if (!heightCm || isNaN(hN) || hN < 50 || hN > 300) errs.height = 'Enter a valid height (50–300 cm)';
    const wN = Number(weightKg);
    if (!weightKg || isNaN(wN) || wN < 20 || wN > 500) errs.weight = 'Enter a valid weight (20–500 kg)';
    setAboutErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setGoogleError(null);
    haptic('light');
    const res = await signInWithGoogle();
    setGoogleLoading(false);

    if (!res) {
      // Running in browser — silently ignore (button shouldn't even be active)
      return;
    }
    if (res.error) {
      if (res.error === 'cancelled') return; // user dismissed picker — no message needed
      if (res.error === 'sha1_missing') {
        setGoogleError('SHA-1 fingerprint not registered in Firebase. See setup guide.');
      } else {
        setGoogleError('Google Sign-In failed. Make sure google-services.json is in android/app/ and you\'ve run npx cap sync android.');
      }
      haptic('error');
      return;
    }
    // Success
    const { user } = res;
    setAuthType('google');
    setName(user.name.slice(0, 50));
    updateProfile({
      name:           user.name.slice(0, 50),
      email:          user.email,
      googlePhotoUrl: user.photoUrl ?? undefined,
    });
    go(1);
  };

  const finish = () => {
    haptic('success');
    updateProfile({
      name:        name.trim() || 'Athlete',
      goal,
      age:         Math.min(120, Math.max(1, Number(age) || 25)),
      gender,
      heightCm:    Math.min(300, Math.max(50,  Number(heightCm)  || 175)),
      weightKg:    Math.min(500, Math.max(20,  Number(weightKg)  || 75)),
      waterTarget: +Math.min(6.0, Math.max(1.0, waterTarget)).toFixed(1),
      stepGoal:    Math.min(50000, Math.max(1000, stepGoal)),
      macroTargets: {
        calories: Math.max(500, Math.min(10000, calories)),
        protein:  Math.max(10,  Math.min(1000,  protein)),
        carbs:    Math.max(10,  Math.min(2000,  carbs)),
        fat:      Math.max(5,   Math.min(500,   fat)),
      },
    });
    // Persist auth type to localStorage
    // (Google was already persisted inside signInWithGoogle(), but calling
    // persistAuthType again is safe — it's idempotent)
    if (authType) persistAuthType(authType);
    try { localStorage.setItem('fitmate_onboarded_v1', '1'); } catch { /* ignore */ }
    router.replace('/');
  };

  const slideVariants = {
    enter:  (d: number) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit:   (d: number) => ({ opacity: 0, x: d > 0 ? -40 : 40 }),
  };

  // ── shared styles ──────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1.5px solid #E8F3E4',
    borderRadius: 16,
    padding: '14px 16px',
    marginBottom: 12,
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 0 env(safe-area-inset-bottom, 16px)',
      WebkitTapHighlightColor: 'transparent',
    }}>

      {/* Progress dots (steps 1–3) */}
      {step > 0 && (
        <div style={{ display: 'flex', gap: 6, paddingTop: 52, paddingBottom: 8 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              width: i === step ? 22 : 7, height: 7, borderRadius: 4,
              background: i <= step ? '#1B3320' : '#D9EDD4',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
      )}

      <div style={{ flex: 1, width: '100%', maxWidth: 480, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence custom={dir} mode="wait">

          {/* ── Step 0: Welcome + Auth ── */}
          {step === 0 && (
            <motion.div key="s0" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease: [0.34, 1.05, 0.64, 1] }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px 24px' }}>

              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
                style={{
                  width: 100, height: 100, borderRadius: 32,
                  background: '#1B3320',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(27,51,32,0.35)',
                  marginBottom: 28,
                }}
              >
                <DumbbellFill size={50} color="#D3EDD0" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                style={{ fontSize: 34, fontWeight: 900, color: '#111B11', marginBottom: 10, textAlign: 'center' }}
              >
                Welcome to FitMate
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                style={{ fontSize: 15, color: '#4A5D4A', textAlign: 'center', lineHeight: 1.6, marginBottom: 40, maxWidth: 280 }}
              >
                Your daily fitness companion. Set up your profile in a few quick steps.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {/* Google Sign-In */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    background: '#FFFFFF', border: '1.5px solid #D9EDD4',
                    borderRadius: 16, padding: '15px 20px',
                    fontSize: 15, fontWeight: 700, color: '#111B11',
                    cursor: 'pointer', outline: 'none',
                    boxShadow: '0 2px 12px rgba(27,51,32,0.08)',
                    opacity: googleLoading ? 0.7 : 1,
                  }}
                >
                  {/* Google G logo */}
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  {googleLoading ? 'Signing in…' : 'Continue with Google'}
                </motion.button>

                {/* Google error message */}
                {googleError && (
                  <div style={{
                    background: '#FDE8E5', border: '1px solid #E86B5A44',
                    borderRadius: 12, padding: '10px 14px',
                    fontSize: 12, color: '#C0392B', fontWeight: 600, lineHeight: 1.5,
                    textAlign: 'center',
                  }}>
                    {googleError}
                  </div>
                )}

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 1, background: '#E8F3E4' }} />
                  <span style={{ fontSize: 12, color: '#8FA08F', fontWeight: 600 }}>or</span>
                  <div style={{ flex: 1, height: 1, background: '#E8F3E4' }} />
                </div>

                {/* Guest */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { haptic('medium'); setAuthType('guest'); go(1); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: '#1B3320', border: 'none',
                    borderRadius: 16, padding: '15px 20px',
                    fontSize: 15, fontWeight: 700, color: '#fff',
                    cursor: 'pointer', outline: 'none',
                    boxShadow: '0 4px 20px rgba(27,51,32,0.25)',
                  }}
                >
                  <User size={18} color="#D3EDD0" strokeWidth={2} />
                  Continue as Guest
                </motion.button>

                <p style={{ fontSize: 11, color: '#8FA08F', textAlign: 'center', lineHeight: 1.5, marginTop: 4 }}>
                  Guest data is saved locally on this device only.
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ── Step 1: Goal ── */}
          {step === 1 && (
            <motion.div key="s1" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px 24px' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Target size={20} color="#1B3320" strokeWidth={2} />
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111B11' }}>What's your goal?</h2>
              </div>
              <p style={{ fontSize: 14, color: '#8FA08F', marginBottom: 24, lineHeight: 1.5 }}>
                We'll personalise your dashboard around your objective.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {GOAL_OPTIONS.map(g => (
                  <motion.button key={g} whileTap={{ scale: 0.97 }}
                    onClick={() => { haptic('light'); setGoal(g); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 16,
                      background: goal === g ? '#D3EDD0' : '#FFFFFF',
                      border: `2px solid ${goal === g ? '#5AAD50' : '#E8F3E4'}`,
                      cursor: 'pointer', outline: 'none', textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: `2px solid ${goal === g ? '#5AAD50' : '#C8DEC4'}`,
                      background: goal === g ? '#5AAD50' : 'transparent',
                      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {goal === g && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: goal === g ? '#1B3320' : '#4A5D4A' }}>{g}</span>
                  </motion.button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => go(0)}
                  style={{ flex: 1, background: '#F4FAF1', border: '1.5px solid #E8F3E4', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 700, color: '#4A5D4A', cursor: 'pointer', outline: 'none' }}>
                  Back
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => { haptic('light'); go(2); }}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1B3320', border: 'none', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 800, color: '#fff', cursor: 'pointer', outline: 'none' }}>
                  Next <ChevronRight size={16} color="#fff" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: About You ── */}
          {step === 2 && (
            <motion.div key="s2" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px 24px', overflowY: 'auto' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <User size={20} color="#1B3320" strokeWidth={2} />
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111B11' }}>About you</h2>
              </div>
              <p style={{ fontSize: 14, color: '#8FA08F', marginBottom: 20, lineHeight: 1.5 }}>
                All fields are required for personalised tracking.
              </p>

              {/* Name */}
              <Label>Name *</Label>
              <input value={name} onChange={e => setName(e.target.value.slice(0, 50))} placeholder="Your name"
                autoComplete="name" style={inputStyle(!!aboutErrors.name)} />
              {aboutErrors.name && <ErrMsg msg={aboutErrors.name} />}

              {/* Gender */}
              <Label>Gender</Label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {(['male','female','other'] as const).map(g => (
                  <motion.button key={g} whileTap={{ scale: 0.92 }} onClick={() => setGender(g)}
                    style={{
                      flex: 1, padding: '11px 4px', borderRadius: 12,
                      background: gender === g ? '#D3EDD0' : '#F4FAF1',
                      border: `1.5px solid ${gender === g ? '#5AAD50' : '#E8F3E4'}`,
                      fontSize: 13, fontWeight: 700,
                      color: gender === g ? '#1B3320' : '#4A5D4A',
                      cursor: 'pointer', outline: 'none', textTransform: 'capitalize',
                    }}>{g}</motion.button>
                ))}
              </div>

              {/* Age */}
              <Label>Age *</Label>
              <input type="number" min="1" max="120" value={age} onChange={e => setAge(e.target.value)}
                placeholder="25" style={inputStyle(!!aboutErrors.age)} />
              {aboutErrors.age && <ErrMsg msg={aboutErrors.age} />}

              {/* Height */}
              <Label>Height (cm) *</Label>
              <input type="number" min="50" max="300" value={heightCm} onChange={e => setHeightCm(e.target.value)}
                placeholder="175" style={inputStyle(!!aboutErrors.height)} />
              {aboutErrors.height && <ErrMsg msg={aboutErrors.height} />}

              {/* Weight */}
              <Label>Weight (kg) *</Label>
              <input type="number" min="20" max="500" step="0.1" value={weightKg} onChange={e => setWeightKg(e.target.value)}
                placeholder="75" style={{ ...inputStyle(!!aboutErrors.weight), marginBottom: 0 }} />
              {aboutErrors.weight && <ErrMsg msg={aboutErrors.weight} />}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => go(1)}
                  style={{ flex: 1, background: '#F4FAF1', border: '1.5px solid #E8F3E4', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 700, color: '#4A5D4A', cursor: 'pointer', outline: 'none' }}>
                  Back
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => { if (validateAbout()) { haptic('light'); go(3); } else haptic('error'); }}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1B3320', border: 'none', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 800, color: '#fff', cursor: 'pointer', outline: 'none' }}>
                  Next <ChevronRight size={16} color="#fff" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Daily Targets ── */}
          {step === 3 && (
            <motion.div key="s3" custom={dir} variants={slideVariants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px 24px', overflowY: 'auto' }}>

              <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111B11', marginBottom: 6 }}>Daily targets</h2>
              <p style={{ fontSize: 14, color: '#8FA08F', marginBottom: 20, lineHeight: 1.5 }}>
                Set your goals. You can always change these later.
              </p>

              {/* Water */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Droplets size={16} color="#4F9FDB" strokeWidth={2} />
                  <Label inline>Water Goal</Label>
                </div>
                <Stepper
                  value={`${waterTarget.toFixed(1)} L`}
                  color="#4F9FDB"
                  onDec={() => setWaterTarget(t => +Math.max(1.0, t - 0.5).toFixed(1))}
                  onInc={() => setWaterTarget(t => +Math.min(6.0, t + 0.5).toFixed(1))}
                />
              </div>

              {/* Steps */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Footprints size={16} color="#9B6FDB" strokeWidth={2} />
                  <Label inline>Step Goal</Label>
                </div>
                <Stepper
                  value={`${(stepGoal/1000).toFixed(1)}k steps`}
                  color="#9B6FDB"
                  onDec={() => setStepGoal(s => Math.max(1000, s - 500))}
                  onInc={() => setStepGoal(s => Math.min(50000, s + 500))}
                />
              </div>

              {/* Nutrition */}
              <div style={{ ...cardStyle, marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <UtensilsCrossed size={16} color="#F5813E" strokeWidth={2} />
                  <Label inline>Daily Nutrition Targets</Label>
                </div>
                <NutritionRow label="Calories" unit="kcal" value={calories} color="#F5813E"
                  min={500} max={10000} step={50}
                  onChange={setCalories} />
                <NutritionRow label="Protein" unit="g" value={protein} color="#5AAD50"
                  min={10} max={500} step={5}
                  onChange={setProtein} />
                <NutritionRow label="Carbs" unit="g" value={carbs} color="#F5C842"
                  min={10} max={1000} step={5}
                  onChange={setCarbs} />
                <NutritionRow label="Fat" unit="g" value={fat} color="#4F9FDB"
                  min={5} max={300} step={5}
                  onChange={setFat} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => go(2)}
                  style={{ flex: 1, background: '#F4FAF1', border: '1.5px solid #E8F3E4', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 700, color: '#4A5D4A', cursor: 'pointer', outline: 'none' }}>
                  Back
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={finish}
                  style={{ flex: 2, background: '#1B3320', border: 'none', borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 800, color: '#fff', cursor: 'pointer', outline: 'none', boxShadow: '0 4px 20px rgba(27,51,32,0.25)' }}>
                  Let's Go! 🎉
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Label({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: '#8FA08F',
      textTransform: 'uppercase', letterSpacing: '0.07em',
      marginBottom: inline ? 0 : 8,
    }}>
      {children}
    </p>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return (
    <p style={{ fontSize: 11, color: '#E86B5A', marginTop: -10, marginBottom: 12, fontWeight: 600 }}>
      {msg}
    </p>
  );
}

function inputStyle(hasError?: boolean): React.CSSProperties {
  return {
    width: '100%',
    background: '#FFFFFF',
    border: `1.5px solid ${hasError ? '#E86B5A' : '#E8F3E4'}`,
    borderRadius: 14,
    padding: '13px 16px',
    fontSize: 15,
    fontWeight: 600,
    color: '#111B11',
    outline: 'none',
    marginBottom: 14,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };
}

function Stepper({ value, color, onDec, onInc }: { value: string; color: string; onDec: () => void; onInc: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: '#F4FAF1', borderRadius: 12, border: '1.5px solid #E8F3E4', overflow: 'hidden' }}>
      <button onClick={onDec}
        style={{ width: 48, height: 44, background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', fontSize: 22, fontWeight: 300, color: '#4A5D4A', touchAction: 'manipulation' }}>−</button>
      <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid #E8F3E4', borderRight: '1px solid #E8F3E4', padding: '8px 4px' }}>
        <span style={{ fontSize: 20, fontWeight: 900, color }}>{value}</span>
      </div>
      <button onClick={onInc}
        style={{ width: 48, height: 44, background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', fontSize: 22, fontWeight: 300, color: '#4A5D4A', touchAction: 'manipulation' }}>+</button>
    </div>
  );
}

function NutritionRow({ label, unit, value, color, min, max, step, onChange }: {
  label: string; unit: string; value: number; color: string;
  min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#4A5D4A' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => onChange(Math.max(min, value - step))}
          style={{ width: 30, height: 30, borderRadius: 8, background: '#F4FAF1', border: '1px solid #E8F3E4', cursor: 'pointer', outline: 'none', fontSize: 16, color: '#4A5D4A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, touchAction: 'manipulation' }}>−</button>
        <div style={{ width: 72, textAlign: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 900, color }}>{value}</span>
          <span style={{ fontSize: 10, color: '#8FA08F', marginLeft: 3 }}>{unit}</span>
        </div>
        <button onClick={() => onChange(Math.min(max, value + step))}
          style={{ width: 30, height: 30, borderRadius: 8, background: '#F4FAF1', border: '1px solid #E8F3E4', cursor: 'pointer', outline: 'none', fontSize: 16, color: '#4A5D4A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, touchAction: 'manipulation' }}>+</button>
      </div>
    </div>
  );
}
