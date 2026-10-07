'use client';

export function BodyCard({ Icon, value, unit, label, color, bg }: {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  value: string; unit: string; label: string; color: string; bg: string;
}) {
  return (
    <div style={{ background: bg, borderRadius: 18, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, border: `1px solid ${color}33` }}>
      <Icon size={18} color={color} strokeWidth={1.8} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
        {unit && <p style={{ fontSize: 10, color, fontWeight: 600, opacity: 0.7 }}>{unit}</p>}
      </div>
      <p style={{ fontSize: 10, color: '#8FA08F', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
    </div>
  );
}

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#8FA08F', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        {label}
      </p>
      {children}
    </div>
  );
}
