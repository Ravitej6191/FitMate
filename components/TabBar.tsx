'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, TrendingUp, User } from 'lucide-react';
import { haptic } from '@/lib/utils';

const TABS = [
  { href: '/',         label: 'Today',    Icon: Home },
  { href: '/plan',     label: 'Plan',     Icon: CalendarDays },
  { href: '/progress', label: 'Progress', Icon: TrendingUp },
  { href: '/profile',  label: 'Profile',  Icon: User },
];

export function TabBar() {
  const pathname = usePathname();

  // next.config.ts has trailingSlash:true so usePathname() returns '/plan/', '/progress/' etc.
  // Strip the trailing slash before comparing so every tab matches correctly.
  // Keep '/' intact (root must not become empty string).
  const normalizedPath = pathname.replace(/\/$/, '') || '/';

  return (
    <div
      style={{
        // ── Centering ─────────────────────────────────────────────────────────
        // left:50% + translateX(-50%) is more reliable in Android WebView than
        // the left:0; right:0; margin:auto approach (which can misfire on
        // certain WebView versions due to fixed-element margin resolution).
        // No willChange here — that caused the background to disappear on Android
        // by forcing a GPU layer that rendered the background as transparent.
        position: 'fixed', bottom: 0,
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        zIndex: 100,

        // ── Background ────────────────────────────────────────────────────────
        // Solid opaque white ensures the bar is always visible regardless of
        // what the page content is doing behind it.
        backgroundColor: '#FFFFFF',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',

        borderTop: '1px solid #EBF5E8',
        boxShadow: '0 -2px 20px rgba(27,51,32,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div style={{ display: 'flex', padding: '6px 4px 8px' }}>
        {TABS.map(tab => {
          const active = normalizedPath === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              // ── WebkitTapHighlightColor fix ─────────────────────────────────
              // Without this, Android WebView shows a black semi-transparent
              // overlay on the Link when tapped — the "black highlighter" the
              // user reported. This only looked like it was "only on homepage"
              // because that tab was active and the dark pill (#1B3320) made
              // the highlight more obvious against the white bar.
              style={{
                flex: 1,
                textDecoration: 'none',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                display: 'block',
              }}
              onClick={() => haptic(active ? 'light' : 'medium')}
            >
              <motion.div
                whileTap={{ scale: 0.82 }}
                transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '5px 0',
                  WebkitTapHighlightColor: 'transparent',
                  outline: 'none',
                }}
              >
                {/* Icon — scale bounce into active, color transitions via CSS */}
                <motion.div
                  key={`${tab.href}-${active}`}
                  initial={active ? { scale: 0.7 } : false}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <tab.Icon
                    size={20}
                    color={active ? '#1B3320' : '#8FA08F'}
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                </motion.div>

                {/* Label */}
                <span style={{
                  fontSize: 10,
                  fontWeight: active ? 800 : 500,
                  color: active ? '#1B3320' : '#8FA08F',
                  letterSpacing: '0.01em',
                  transition: 'color 0.15s, font-weight 0.15s',
                }}>
                  {tab.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
