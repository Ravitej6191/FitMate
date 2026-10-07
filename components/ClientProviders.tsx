'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TabBar } from './TabBar';
import { SplashScreen } from './SplashScreen';
import { useStore, flushPersist } from '@/lib/store';
import { usePathname, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import {
  requestNotificationPermission,
  scheduleAllNotifications,
} from '@/lib/notifications';
import { WidgetPlugin } from '@/lib/widget';
import { trySilentGoogleRestore } from '@/lib/auth';
import type { ChecklistKey } from '@/lib/constants';

const DAILY_NOTIF_PREFS = {
  enabled:        true,
  morningEnabled: true,  morningHour: 7,  morningMinute: 0,
  waterEnabled:   true,  waterHour:   14, waterMinute:   0,
  eveningEnabled: true,  eveningHour: 20, eveningMinute: 0,
} as const;

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const initStore = useStore(s => s.initStore);
  const pathname  = usePathname();
  const logs      = useStore(s => s.logs);
  const profile2  = useStore(s => s.profile);
  const router    = useRouter();

  const [ready,         setReady]         = useState(false);
  const [mounted,       setMounted]       = useState(false);
  const [showExitToast, setShowExitToast] = useState(false);

  const exitPressedRef = useRef(false);
  const exitTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedPath = pathname.replace(/\/$/, '') || '/';
  const isOnboarding   = normalizedPath === '/onboarding';

  const handleSplashDone = useCallback(() => setReady(true), []);

  useIsomorphicLayoutEffect(() => {
    setMounted(true);
    initStore();
  }, [initStore]);

  // ── Onboarding redirect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    if (isOnboarding) return; // already there — don't loop
    try {
      const done = !!localStorage.getItem('fitmate_onboarded_v1');
      if (!done) router.replace('/onboarding');
    } catch { /* ignore */ }
  }, [mounted, isOnboarding, router]);

  // ── Flush pending saves when the app is backgrounded / closed ──────────────
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushPersist(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushPersist);
    const sub = Capacitor.isNativePlatform()
      ? App.addListener('pause', flushPersist)
      : null;
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushPersist);
      sub?.then(h => h.remove()).catch(() => {});
    };
  }, []);

  // ── Silent Google session restore ──────────────────────────────────────────
  useEffect(() => {
    trySilentGoogleRestore().catch(() => {});
  }, []);

  // ── Notification init ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const ASKED_KEY = 'fitmate_notif_asked_v1';
    const hasAsked  = (() => { try { return !!localStorage.getItem(ASKED_KEY); } catch { return false; } })();

    async function initNotifications() {
      if (!hasAsked) {
        try { localStorage.setItem(ASKED_KEY, '1'); } catch { /* ignore */ }
        await requestNotificationPermission();
      }
      await scheduleAllNotifications(DAILY_NOTIF_PREFS).catch(() => {});
    }

    initNotifications().catch(() => {});
  }, []);

  // ── Widget update ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
    const todayLog = logs.find(l => l.date === todayStr);
    if (!todayLog) return;

    const planned = Object.values(todayLog.planned).filter(Boolean).length;
    const done = (Object.keys(todayLog.completed) as ChecklistKey[]).filter(k => todayLog.completed[k] && todayLog.planned[k]).length;
    const completionPct = planned > 0 ? Math.round((done / planned) * 100) : 0;

    WidgetPlugin.update({
      steps: todayLog.stepCount,
      stepsGoal: profile2.stepGoal ?? 8000,
      completionPct,
      workoutName: todayLog.workoutName,
    }).catch(() => {});
  }, [logs, profile2.stepGoal]);

  // ── Android back button — with exit warning ─────────────────────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Tab-level routes: back button should exit (with warning), not navigate
    const TAB_ROUTES = ['/', '/plan', '/progress', '/profile'];

    const listenerPromise = App.addListener('backButton', ({ canGoBack }) => {
      const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
      const isTabRoute = TAB_ROUTES.includes(currentPath);

      if (canGoBack && !isTabRoute) {
        // Sub-page (nutrition, exercises, steps, goals, achievements, onboarding)
        window.history.back();
      } else {
        // On a main tab — prompt to exit
        if (exitPressedRef.current) {
          App.exitApp();
        } else {
          exitPressedRef.current = true;
          setShowExitToast(true);
          if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
          exitTimerRef.current = setTimeout(() => {
            exitPressedRef.current = false;
            setShowExitToast(false);
          }, 2000);
        }
      }
    });

    return () => {
      listenerPromise.then(h => h.remove()).catch(() => {});
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  return (
    <>
      {/* Dark overlay — flash-free launch */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: '#0B1A0B',
          pointerEvents: ready ? 'none' : 'all',
          opacity: ready ? 0 : 1,
          transition: ready ? 'opacity 0.25s ease-out' : 'none',
        }}
      />

      {mounted && <SplashScreen onDone={handleSplashDone} />}

      <main key={pathname} style={{ minHeight: '100dvh' }}>
        {children}
      </main>

      {/* TabBar hidden on onboarding */}
      {!isOnboarding && <TabBar />}

      {/* Exit warning toast */}
      {showExitToast && (
        <div style={{
          position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10000,
          background: 'rgba(27,51,32,0.95)', border: '1px solid #5AAD5044',
          color: '#D3EDD0', padding: '11px 22px', borderRadius: 28,
          fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
          boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(8px)',
        }}>
          Press back again to exit
        </div>
      )}
    </>
  );
}
