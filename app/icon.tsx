import { ImageResponse } from 'next/og';

export const dynamic     = 'force-static';
export const size        = { width: 32, height: 32 };
export const contentType = 'image/png';

/**
 * Same fill-based dumbbell shape used in SplashScreen, apple-icon, and icon.svg.
 * Consistent visual identity across all surfaces.
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

/** 32×32 browser favicon — dark bg + light green logo box + dark dumbbell */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #0B1A0B 0%, #1B3320 100%)',
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 22, height: 22, borderRadius: 5,
            background: 'linear-gradient(135deg, #D3EDD0 0%, #B8E0B4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <DumbbellFill sz={14} color="#1B3320" />
        </div>
      </div>
    ),
    { ...size },
  );
}
