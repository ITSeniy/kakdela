// Общие компоненты и иконки для всех вариантов «Как дела?»

const Icon = {
  Hash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
      <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
    </svg>
  ),
  Speaker: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  ),
  Mic: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/>
    </svg>
  ),
  MicOff: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="3" y1="3" x2="21" y2="21"/>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
      <path d="M15 9.34V5a3 3 0 0 0-5.94-.6"/>
      <path d="M17 16.95A7 7 0 0 1 5 12v-2"/><path d="M19 10v2a7 7 0 0 1-.11 1.23"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  ),
  Headphones: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
    </svg>
  ),
  Settings: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Send: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Smile: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  ),
  Pin: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="12" y1="17" x2="12" y2="22"/>
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/>
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Inbox: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  ),
  Monitor: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  PhoneOff: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
      <line x1="23" y1="1" x2="1" y2="23"/>
    </svg>
  ),
  Video: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  Hand: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
      <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
      <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
    </svg>
  ),
  Sparkle: (p) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6z"/>
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/>
    </svg>
  ),
};

// Аватары-плейсхолдеры: цветные кружки с инициалами
function Avatar({ name, color, size = 36, ring, ringColor }) {
  const initials = (name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600, fontFamily: 'inherit',
      flexShrink: 0, position: 'relative',
      boxShadow: ring ? `0 0 0 2px ${ringColor || '#fff'}, 0 0 0 4px ${ring}` : undefined,
      letterSpacing: '-0.02em',
    }}>{initials}</div>
  );
}

// Серверный значок (квадратный с инициалом)
function ServerIcon({ label, color, active, size = 44, radius = 14, ringColor }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {active && <div style={{
        position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)',
        width: 4, height: size * 0.6, borderRadius: 2, background: ringColor || '#fff',
      }}/>}
      <div style={{
        width: size, height: size, borderRadius: radius,
        background: color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 700,
        boxShadow: active ? `0 0 0 2px ${ringColor || '#fff'}` : undefined,
        cursor: 'pointer',
      }}>{label}</div>
    </div>
  );
}

// Полоса демонстрации экрана (placeholder контента)
function SharePlaceholder({ kind, label, bg, fg, stripe }) {
  // kind: 'code' | 'design' | 'doc' | 'browser' | 'game'
  const lines = {
    code: [
      ['$', '  npm run dev'],
      ['→', '  ready in 312ms'],
      ['', ''],
      ['function', ' onMessage(payload) {'],
      ['  const', ' user = await db.users.find(payload.id)'],
      ['  return', ' send({ ...user, status: \'ok\' })'],
      ['}', ''],
    ],
    design: null,
    doc: null,
    browser: null,
    game: null,
  };
  return (
    <div style={{
      position: 'absolute', inset: 0, background: bg,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* «оконные» кнопки */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px',
        background: stripe, borderBottom: `1px solid ${fg}15`,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: '#e87060' }}/>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: '#e8b860' }}/>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: '#80c068' }}/>
        <span style={{ marginLeft: 8, fontSize: 10, color: fg, opacity: 0.6, fontFamily: 'ui-monospace, monospace' }}>{label}</span>
      </div>
      {kind === 'code' && (
        <div style={{ padding: '12px 14px', fontFamily: 'ui-monospace, "JetBrains Mono", monospace', fontSize: 11, color: fg, lineHeight: 1.7 }}>
          {lines.code.map((ln, i) => (
            <div key={i}><span style={{ color: '#c96442', marginRight: 6 }}>{ln[0]}</span><span style={{ opacity: 0.85 }}>{ln[1]}</span></div>
          ))}
        </div>
      )}
      {kind === 'design' && (
        <div style={{ flex: 1, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} style={{ aspectRatio: '1', background: `${fg}10`, borderRadius: 8, border: `1px solid ${fg}15` }}/>
          ))}
        </div>
      )}
      {kind === 'doc' && (
        <div style={{ padding: '14px 18px', color: fg }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Q2 retrospective</div>
          {[100,86,92,70,82,60,90].map((w, i) => (
            <div key={i} style={{ height: 6, background: `${fg}18`, borderRadius: 3, marginBottom: 6, width: `${w}%` }}/>
          ))}
        </div>
      )}
      {kind === 'browser' && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ height: 22, background: `${fg}10`, borderRadius: 6 }}/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, flex: 1 }}>
            <div style={{ background: `${fg}10`, borderRadius: 6 }}/>
            <div style={{ background: `${fg}15`, borderRadius: 6 }}/>
          </div>
        </div>
      )}
      {kind === 'game' && (
        <div style={{ flex: 1, background: `linear-gradient(160deg, ${fg}15, ${fg}05)`, position: 'relative' }}>
          <div style={{ position: 'absolute', top: '40%', left: '30%', width: 24, height: 24, borderRadius: '50%', background: '#c96442' }}/>
          <div style={{ position: 'absolute', top: '60%', left: '60%', width: 18, height: 18, borderRadius: '50%', background: '#e8a05c' }}/>
          <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 10, color: fg, opacity: 0.6, fontFamily: 'ui-monospace, monospace' }}>FPS: 144</div>
        </div>
      )}
    </div>
  );
}

// Палитра аватаров (мягкие тёплые цвета)
const AVATAR_COLORS = ['#c96442', '#d68b6c', '#a87b56', '#7d9268', '#b88c4e', '#8d6e4d', '#c98870', '#9c7f5e'];
function pickColor(i) { return AVATAR_COLORS[i % AVATAR_COLORS.length]; }

window.Icon = Icon;
window.Avatar = Avatar;
window.ServerIcon = ServerIcon;
window.SharePlaceholder = SharePlaceholder;
window.pickColor = pickColor;
window.AVATAR_COLORS = AVATAR_COLORS;
