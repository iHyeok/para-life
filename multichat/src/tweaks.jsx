// Tweaks panel — shown when host activates edit mode

const { useState: useStateT, useEffect: useEffectT } = React;

const ACCENT_OPTIONS = [
  { name: '머스터드', value: '#E9B949' },
  { name: '세이지',   value: '#9CB380' },
  { name: '코랄',     value: '#E28F6F' },
  { name: '블루',     value: '#7FA7C9' },
  { name: '라벤더',   value: '#B59FCF' },
  { name: '그라파이트', value: '#4A4A4A' },
];

function hexToAccentInk(hex) {
  // Make bubble text always readable — dark ink for all light accents except graphite
  if (hex.toLowerCase() === '#4a4a4a') return '#f5f0e4';
  return '#2a220e';
}

function TweaksPanel({ tweaks, setTweak }) {
  return (
    <div style={{
      position: 'fixed', right: 18, bottom: 18, zIndex: 9999,
      width: 260,
      background: 'var(--panel)',
      border: '1px solid var(--line-2)',
      borderRadius: 14,
      padding: 14,
      boxShadow: '0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
      fontFamily: 'inherit',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>Tweaks</div>
        <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace' }}>LIVE</span>
      </div>

      {/* Accent */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace' }}>Accent</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
          {ACCENT_OPTIONS.map(o => (
            <button key={o.value}
              onClick={() => setTweak('accent', o.value)}
              title={o.name}
              style={{
                height: 28, borderRadius: 8,
                background: o.value,
                border: tweaks.accent === o.value ? '2px solid var(--ink)' : '1px solid var(--line-2)',
                cursor: 'pointer', padding: 0,
              }} />
          ))}
        </div>
      </div>

      {/* Density */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace' }}>Density</div>
        <div style={{ display: 'flex', border: '1px solid var(--line-2)', borderRadius: 8, overflow: 'hidden' }}>
          {['compact','cozy'].map(d => (
            <button key={d}
              onClick={() => setTweak('density', d)}
              style={{
                flex: 1, padding: '7px 0', fontSize: 12,
                background: tweaks.density === d ? 'var(--ink)' : 'var(--panel)',
                color: tweaks.density === d ? 'var(--panel)' : 'var(--ink-2)',
                border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 500,
                textTransform: 'capitalize',
              }}>{d}</button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div style={{ display: 'grid', gap: 8 }}>
        <ToggleRow label="다크 모드" value={tweaks.dark} onChange={v => setTweak('dark', v)} />
        <ToggleRow label="타임스탬프 표시" value={tweaks.showTimestamps} onChange={v => setTweak('showTimestamps', v)} />
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 12.5, color: 'var(--ink-2)' }}>
      <span>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 34, height: 20, borderRadius: 10,
        background: value ? 'var(--accent)' : 'var(--line-2)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background .15s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: value ? 16 : 2,
          width: 16, height: 16, borderRadius: '50%',
          background: 'white',
          transition: 'left .15s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}/>
      </button>
    </label>
  );
}

window.TweaksPanel = TweaksPanel;
window.hexToAccentInk = hexToAccentInk;
