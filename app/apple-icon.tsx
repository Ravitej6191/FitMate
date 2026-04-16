import { ImageResponse } from 'next/og';

export const dynamic     = 'force-static';
export const size        = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * Same fill-based dumbbell shape used in SplashScreen, icon.tsx, and icon.svg.
 * All icon surfaces share one visual identity.
 */
function DumbbellFill({ sz, color }: { sz: number; color: string }) {
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24">
      <rect x="1"  y="7"   width="4" height="10" rx="1.5" fill={color} />
      <rect x="5"  y="9.5" width="2" height="5"  rx="1"   fill={color} />
      <rect x="7"  y="11"  width="10" height="2" rx="1"   fill={color} />
      <rect x="17" y="9.5" width="2" height="5"  rx="1"   fill={color} />
      <rect x="19" y="7"   width="4" height="10" rx="1.5" fill={color} />
    </svg>
  );
}

/**
 * 180×180 Apple Touch Icon.
 * Background and logo mark are pixel-for-pixel identical to the splash screen
 * so the icon looks exactly like a frozen frame of the splash.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180, height: 180,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(160deg, #0B1A0B 0%, #0E200F 100%)',
        }}
      >
        {/* Logo mark — scaled-up version of the splash logo box */}
        <div
          style={{
            width: 116, height: 116,
            borderRadius: 32,
            background: 'linear-gradient(135deg, #D3EDD0 0%, #B8E0B4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 48px rgba(90,173,80,0.45), 0 12px 32px rgba(0,0,0,0.5)',
          }}
        >
          <DumbbellFill sz={68} color="#1B3320" />
        </div>
      </div>
    ),
    { ...size },
  );
}
