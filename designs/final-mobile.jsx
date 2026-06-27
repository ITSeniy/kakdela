// КакДела · ПОЛНОЕ мобильное приложение (Android, single-column).
// Самодостаточный файл: токены, хелперы, иконки и все экраны. Без импортов.
// Каждый экран — функция, принимающая объект токенов `t`.
// Цвета — только из палитры t. Mono-шрифт — для технических подписей.

const KD_FONT = '"Inter", -apple-system, system-ui, sans-serif';
const KD_MONO = '"JetBrains Mono", ui-monospace, monospace';
const KD_RADIUS = 6;

// ── Токены (light-тема) ─────────────────────────────────────────────
const KD_LIGHT = {
  name: 'light',
  bg: '#e8e0cc', bgDeep: '#ddd3bd', panel: '#f0e8d4', panelAlt: '#e2d8c0', panelHi: '#d4caaf',
  border: 'rgba(60, 50, 30, 0.12)',
  text: '#2a2418', textSoft: '#5e5440', textMute: '#8a7e64',
  accent: '#5d6f4c', accentDeep: '#43533a', accentSoft: '#b8c2a0',
  warm: '#c87a3a', warmDeep: '#a55e26', warmSoft: '#e8c9a0',
  online: '#5d6f4c', idle: '#d4a14a', dnd: '#c0432f', danger: '#c0432f',
  profileGradFrom: '#d68b6c', profileGradTo: '#a87b56',
};

// ── Анимации (одноразовая инъекция) ─────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('kd-mobile-css')) {
  const s = document.createElement('style');
  s.id = 'kd-mobile-css';
  s.textContent =
    '@keyframes kd-spin{to{transform:rotate(360deg)}}' +
    '@keyframes kd-pulse{0%,100%{opacity:.35}50%{opacity:1}}';
  document.head.appendChild(s);
}

// ── Аватары ─────────────────────────────────────────────────────────
function Avatar({ name, color, size = 36 }) {
  const initials = (name || '??').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600, fontFamily: 'inherit', flexShrink: 0, letterSpacing: '-0.02em',
    }}>{initials}</div>
  );
}

// ── Иконки ──────────────────────────────────────────────────────────
const SV = (p) => ({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...p });
const Icon = {
  Search: (p) => <svg {...SV(p)}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Plus: (p) => <svg {...SV(p)}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Back: (p) => <svg {...SV(p)}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Phone: (p) => <svg {...SV(p)}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Video: (p) => <svg {...SV(p)}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  Monitor: (p) => <svg {...SV(p)}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  Mic: (p) => <svg {...SV(p)}><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>,
  MicOff: (p) => <svg {...SV(p)}><line x1="3" y1="3" x2="21" y2="21"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><path d="M15 9.34V5a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2"/><path d="M19 10v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="22"/></svg>,
  Speaker: (p) => <svg {...SV(p)}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>,
  Settings: (p) => <svg {...SV(p)}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Lock: (p) => <svg {...SV(p)}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
  Check: (p) => <svg {...SV({ ...p, strokeWidth: 2.4 })}><polyline points="20 6 9 17 4 12"/></svg>,
  Smile: (p) => <svg {...SV(p)}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  Send: (p) => <svg {...SV(p)}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Bell: (p) => <svg {...SV(p)}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Moon: (p) => <svg {...SV(p)}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Shield: (p) => <svg {...SV(p)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
  ChevronRight: (p) => <svg {...SV(p)}><polyline points="9 18 15 12 9 6"/></svg>,
  More: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>,
  Alert: (p) => <svg {...SV(p)}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Edit: (p) => <svg {...SV(p)}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>,
  Users: (p) => <svg {...SV(p)}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
};

// ── Точка статуса ───────────────────────────────────────────────────
function StatusDot({ t, status, ring, size = 12 }) {
  const map = { online: t.online, idle: t.idle, dnd: t.dnd, offline: t.textMute };
  return (
    <div style={{
      position: 'absolute', bottom: -1, right: -1, width: size, height: size, borderRadius: size / 2,
      background: map[status] || t.textMute, border: `2.5px solid ${ring}`,
    }}/>
  );
}

// ── Телефонная рамка (Android ~393×852) ─────────────────────────────
function PhoneFrame({ t, children, time = '9:41', dark }) {
  const sbColor = dark ? '#f4ecdc' : t.text;
  const sbSoft = dark ? 'rgba(244,236,220,0.7)' : t.textSoft;
  return (
    <div style={{
      width: 393, height: 852, background: dark ? '#1a1610' : t.bg, color: t.text,
      fontFamily: KD_FONT, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', fontFamily: KD_MONO, fontSize: 12, fontWeight: 600, color: sbColor,
      }}>
        <span>{time}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: sbSoft }}>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
            <rect x="0" y="7" width="3" height="4" rx="0.5"/><rect x="4.3" y="4.5" width="3" height="6.5" rx="0.5"/>
            <rect x="8.6" y="2" width="3" height="9" rx="0.5"/><rect x="12.9" y="0" width="3" height="11" rx="0.5"/>
          </svg>
          <svg width="15" height="11" viewBox="0 0 15 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <path d="M1 3.5a9.5 9.5 0 0 1 13 0"/><path d="M3.5 6a6 6 0 0 1 8 0"/><circle cx="7.5" cy="9" r="0.9" fill="currentColor" stroke="none"/>
          </svg>
          <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <div style={{ width: 22, height: 11, border: `1.4px solid ${sbSoft}`, borderRadius: 3, padding: 1.5 }}>
              <div style={{ width: '72%', height: '100%', background: sbSoft, borderRadius: 1 }}/>
            </div>
            <div style={{ width: 1.6, height: 4, background: sbSoft, borderRadius: 1 }}/>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
      <div style={{ height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 134, height: 5, borderRadius: 3, background: dark ? 'rgba(244,236,220,0.4)' : t.textMute, opacity: dark ? 1 : 0.5 }}/>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// 11) MobileBottomNav
// ════════════════════════════════════════════════════════════════════
function MobileBottomNav({ t, active = 'chats' }) {
  const tabs = [
    { id: 'chats', label: 'чаты', icon: Icon.Smile },
    { id: 'calls', label: 'звонки', icon: Icon.Phone },
    { id: 'profile', label: 'профиль', icon: Icon.Users },
  ];
  return (
    <div style={{
      flexShrink: 0, display: 'flex', borderTop: `1px solid ${t.border}`, background: t.panelAlt,
      padding: '8px 0 4px',
    }}>
      {tabs.map((tab) => {
        const on = tab.id === active;
        const I = tab.icon;
        return (
          <div key={tab.id} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: on ? t.accent : t.textMute,
          }}>
            <I width={22} height={22}/>
            <span style={{ fontSize: 10, fontWeight: on ? 700 : 500 }}>{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Композер
// ════════════════════════════════════════════════════════════════════
function Composer({ t, secret }) {
  return (
    <div style={{ padding: '8px 12px 8px' }}>
      <div style={{
        background: t.panel, borderRadius: KD_RADIUS, padding: '8px 10px',
        display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${t.border}`,
      }}>
        <Icon.Plus width={20} height={20} style={{ color: t.textMute, flexShrink: 0 }}/>
        <span style={{ flex: 1, fontSize: 14, color: t.textMute }}>напиши…</span>
        <Icon.Smile width={20} height={20} style={{ color: t.textMute, flexShrink: 0 }}/>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: t.accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><Icon.Send width={17} height={17}/></div>
      </div>
      {secret && (
        <div style={{ fontSize: 9, color: t.textMute, marginTop: 6, textAlign: 'center', fontFamily: KD_MONO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Icon.Lock width={9} height={9} style={{ strokeWidth: 2.4 }}/> E2EE · device-bound
        </div>
      )}
    </div>
  );
}

function DayDivider({ t, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px' }}>
      <div style={{ flex: 1, height: 1, background: t.border }}/>
      <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: t.border }}/>
    </div>
  );
}

// Пузырь (общий: обычный/секретный, с реакцией и вложением)
function Bubble({ t, name, color, time, text, side = 'left', read, secret, reactions, attachment }) {
  const isMine = side === 'right';
  return (
    <div style={{ display: 'flex', gap: 9, padding: '4px 16px', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
      {!isMine ? <Avatar name={name} color={color} size={26}/> : <div style={{ width: 26 }}/>}
      <div style={{ maxWidth: '74%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
        <div style={{
          padding: '8px 12px', background: isMine ? t.accent : t.panel, color: isMine ? '#fff' : t.text,
          border: isMine ? 'none' : `1px solid ${t.border}`, borderRadius: KD_RADIUS, fontSize: 14, lineHeight: 1.45,
        }}>
          {text}
          {attachment && (
            <div style={{
              marginTop: 7, padding: 7, background: isMine ? 'rgba(255,255,255,0.18)' : t.panelAlt,
              borderRadius: 4, fontSize: 11, fontFamily: KD_MONO, display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <div style={{ width: 22, height: 22, borderRadius: 3, background: isMine ? 'rgba(255,255,255,0.25)' : t.panelHi, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: isMine ? '#fff' : t.textSoft }}>FIG</div>
              <span>{attachment}</span>
            </div>
          )}
        </div>
        <div style={{ fontSize: 10, color: t.textMute, marginTop: 3, fontFamily: KD_MONO, padding: '0 3px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {secret && <Icon.Lock width={9} height={9} style={{ color: t.textMute, strokeWidth: 2.4 }}/>}
          <span>{time}</span>
          {isMine && read && <span style={{ color: t.online }}>✓✓ прочитано</span>}
        </div>
        {reactions && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {reactions.map((r, i) => (
              <div key={i} style={{ background: t.panel, border: `1px solid ${t.border}`, padding: '2px 7px', borderRadius: 11, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{r.emoji}</span><span style={{ color: t.textSoft, fontFamily: KD_MONO, fontSize: 10 }}>{r.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// 1) MobileAuth — вход по инвайту
// ════════════════════════════════════════════════════════════════════
function MobileAuth({ t }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 28px', justifyContent: 'center' }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, marginBottom: 22,
          background: `linear-gradient(150deg, ${t.profileGradFrom}, ${t.profileGradTo})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 800,
        }}>КД</div>
        <div style={{ fontSize: 40, fontWeight: 800, color: t.text, letterSpacing: '-0.03em', lineHeight: 1 }}>как дела</div>
        <div style={{ fontSize: 15, color: t.textSoft, marginTop: 10 }}>уютный чат для своих. по приглашению.</div>
      </div>

      <div style={{ fontSize: 11, color: t.textMute, fontFamily: KD_MONO, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>инвайт-код</div>
      <div style={{
        background: t.panel, border: `1px solid ${t.border}`, borderRadius: KD_RADIUS, padding: '14px 14px',
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
      }}>
        <Icon.Lock width={17} height={17} style={{ color: t.textMute }}/>
        <span style={{ flex: 1, fontFamily: KD_MONO, fontSize: 16, color: t.textMute, letterSpacing: '0.04em' }}>KD-XXXX-XXXX</span>
      </div>

      <div style={{
        background: t.accent, color: '#fff', borderRadius: KD_RADIUS, padding: '15px', textAlign: 'center',
        fontSize: 15, fontWeight: 700, marginTop: 6,
      }}>войти</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: t.border }}/>
        <span style={{ fontSize: 11, color: t.textMute }}>или</span>
        <div style={{ flex: 1, height: 1, background: t.border }}/>
      </div>
      <div style={{ textAlign: 'center', fontSize: 14, color: t.textSoft }}>войти по <span style={{ color: t.accent, fontWeight: 600 }}>логину и паролю</span></div>
      <div style={{ textAlign: 'center', fontSize: 13, color: t.textMute, marginTop: 26 }}>нет приглашения? <span style={{ color: t.warm, fontWeight: 600 }}>попросить у друга</span></div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// 2) MobileChatList — главный экран
// ════════════════════════════════════════════════════════════════════
function MobileChatList({ t }) {
  const rows = [
    { n: 'Маша Тёплая', c: '#d68b6c', last: 'ок, давай по видео сверим', when: 'сейчас', unread: 2, status: 'online', secret: true },
    { n: 'Лев Морозов', c: '#7d9268', last: 'договорились ✊', when: '28м', unread: 0, status: 'online', secret: true },
    { n: 'Костя Дн', c: '#a87b56', last: 'посмотри pdf, как будет минута', when: '1ч', unread: 1, status: 'idle' },
    { n: 'Соня Н', c: '#c98870', last: 'спокойной ночи 🌙', when: 'вчера', unread: 0, status: 'dnd' },
    { n: 'Тима Р', c: '#8d6e4d', last: 'я зайду в 6', when: 'вчера', unread: 0, status: 'offline' },
    { n: 'Влад К', c: '#9c7f5e', last: 'видосик скинул', when: '3дн', unread: 0, status: 'offline' },
  ];
  return (
    <>
      <div style={{ padding: '8px 16px 12px', borderBottom: `1px solid ${t.border}`, background: t.panelAlt, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: t.text, flex: 1, letterSpacing: '-0.02em' }}>чаты</span>
        <Icon.Search width={22} height={22} style={{ color: t.textSoft }}/>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: t.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Plus width={20} height={20}/></div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {rows.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 16px', borderBottom: `1px solid ${t.border}`, opacity: d.status === 'offline' && !d.unread ? 0.78 : 1 }}>
            <div style={{ position: 'relative' }}>
              {d.group
                ? <div style={{ width: 46, height: 46, borderRadius: 13, background: d.c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>#</div>
                : <Avatar name={d.n} color={d.c} size={46}/>}
              {!d.group && <StatusDot t={t} status={d.status} ring={t.bg}/>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: d.unread ? 700 : 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.n}</span>
                {d.secret && <span style={{ fontSize: 12 }} role="img" aria-label="секретный">🔒</span>}
                <span style={{ flex: 1 }}/>
                <span style={{ fontSize: 11, color: d.unread ? t.warm : t.textMute, fontFamily: KD_MONO, flexShrink: 0, fontWeight: d.unread ? 700 : 400 }}>{d.when}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <span style={{ fontSize: 13, color: d.unread ? t.text : t.textSoft, fontWeight: d.unread ? 600 : 400, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.last}</span>
                {d.unread > 0 && <span style={{ background: t.warm, color: '#fff', fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, fontFamily: KD_MONO, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{d.unread}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <MobileBottomNav t={t} active="chats"/>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Шапка чата (back + avatar + presence + действия)
// ════════════════════════════════════════════════════════════════════
function ChatHeader({ t, name, color, status, presence, secret, verified }) {
  return (
    <div style={{ padding: '8px 12px 10px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${t.border}`, background: t.panelAlt }}>
      <Icon.Back width={22} height={22} style={{ color: t.textSoft, flexShrink: 0 }}/>
      <div style={{ position: 'relative' }}>
        <Avatar name={name} color={color} size={38}/>
        <StatusDot t={t} status={status} ring={t.panelAlt}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{name}</span>
          {verified && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontFamily: KD_MONO, fontWeight: 700, color: t.online, background: 'rgba(93,111,76,0.14)', padding: '1px 6px', borderRadius: 4 }}><Icon.Check width={9} height={9} style={{ strokeWidth: 3.2 }}/>проверено</span>}
        </div>
        {secret
          ? <div style={{ fontSize: 10, color: t.accent, fontFamily: KD_MONO, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}><span role="img" aria-label="замок">🔒</span> секретный · только на этом устройстве</div>
          : <div style={{ fontSize: 11, color: t.online, fontFamily: KD_MONO, marginTop: 1 }}>{presence}</div>}
      </div>
      {!secret && <Icon.Phone width={19} height={19} style={{ color: t.textSoft, flexShrink: 0 }}/>}
      {!secret && <Icon.Video width={20} height={20} style={{ color: t.textSoft, flexShrink: 0 }}/>}
      <Icon.More width={20} height={20} style={{ color: t.textMute, flexShrink: 0 }}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// 3) MobileDM — обычный личный чат
// ════════════════════════════════════════════════════════════════════
function MobileDM({ t }) {
  return (
    <>
      <ChatHeader t={t} name="Маша Тёплая" color="#d68b6c" status="online" presence="● печатает…"/>
      <div style={{ flex: 1, overflow: 'hidden', padding: '4px 0', display: 'flex', flexDirection: 'column' }}>
        <DayDivider t={t} label="сегодня"/>
        <Bubble t={t} name="Маша Тёплая" color="#d68b6c" time="11:02" text="привет! смотрела твой mockup — очень зашло ✨" reactions={[{ emoji: '☕', count: 1 }]}/>
        <Bubble t={t} side="right" time="11:04" read text="о, спасибо! я могу завтра показать обновлённое"/>
        <Bubble t={t} name="Маша Тёплая" color="#d68b6c" time="11:05" text="кстати, скинула в #дизайн новый файл — глянь" attachment="profile-redesign-v3.fig"/>
        <Bubble t={t} side="right" time="11:07" read text="увидела, класс. сейчас гляну детальнее"/>
        <Bubble t={t} name="Маша Тёплая" color="#d68b6c" time="11:08" text="давай в 11 созвон, я там скрин покажу"/>
      </div>
      <Composer t={t}/>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// 4) MobileSecretChat — секретный чат
// ════════════════════════════════════════════════════════════════════
function MobileSecretChat({ t }) {
  return (
    <>
      <ChatHeader t={t} name="Маша Тёплая" color="#d68b6c" status="online" secret verified/>
      <div style={{ margin: '12px 16px 4px', padding: '12px 14px', background: t.panelAlt, borderRadius: KD_RADIUS, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'flex-start', gap: 11 }}>
        <Icon.Lock width={16} height={16} style={{ color: t.accent, flexShrink: 0, marginTop: 1 }}/>
        <div style={{ fontSize: 12, color: t.textSoft, lineHeight: 1.5 }}>сообщения защищены <b style={{ color: t.accentDeep }}>сквозным шифрованием</b>. история хранится только на этом устройстве.</div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', paddingBottom: 4, display: 'flex', flexDirection: 'column' }}>
        <DayDivider t={t} label="сегодня"/>
        <Bubble t={t} secret name="Маша Тёплая" color="#d68b6c" time="11:02" text="давай тут обсудим — здесь спокойнее"/>
        <Bubble t={t} secret side="right" time="11:03" read text="да, я только тут про это и буду писать"/>
        <Bubble t={t} secret name="Маша Тёплая" color="#d68b6c" time="11:05" text="и оно не уйдёт ни на какой сервер 🙂"/>
        <Bubble t={t} secret side="right" time="11:07" read text="вижу замочек у каждого. сверим ключи?"/>
        <Bubble t={t} secret name="Маша Тёплая" color="#d68b6c" time="11:08" text="давай по видео, покажу свой код"/>
      </div>
      <Composer t={t} secret/>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// 5) MobileKeyVerify — сверка ключей + состояния сессии
// ════════════════════════════════════════════════════════════════════
function MobileKeyVerify({ t }) {
  const groups = ['38271', '04859', '11620', '73948', '50127', '66301', '29485', '71093', '48820', '15673', '90244', '38816'];
  return (
    <>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${t.border}`, background: t.panelAlt }}>
        <Icon.Back width={22} height={22} style={{ color: t.textSoft }}/>
        <span style={{ fontSize: 15, fontWeight: 700, color: t.text }}>сверка ключей</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <Avatar name="Маша Тёплая" color="#d68b6c" size={44}/>
          <div style={{ fontSize: 12, color: t.textSoft, lineHeight: 1.45 }}>сравните этот код с <b style={{ color: t.text }}>Машей</b> лично или по видеосвязи.</div>
        </div>
        <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: KD_RADIUS, padding: '14px 14px' }}>
          <div style={{ fontSize: 9, fontFamily: KD_MONO, color: t.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.Lock width={10} height={10} style={{ strokeWidth: 2.4 }}/> код безопасности · 60 цифр
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', rowGap: 9, columnGap: 6, justifyItems: 'center' }}>
            {groups.map((g, i) => <span key={i} style={{ fontFamily: KD_MONO, fontSize: 16, fontWeight: 600, color: t.text, letterSpacing: '0.05em' }}>{g}</span>)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1, background: t.accent, color: '#fff', borderRadius: KD_RADIUS, padding: '11px', textAlign: 'center', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}><Icon.Shield width={15} height={15}/> отметить проверенным</div>
          <div style={{ fontSize: 11, fontFamily: KD_MONO, color: t.online, display: 'flex', alignItems: 'center', gap: 5, padding: '0 4px' }}><Icon.Check width={13} height={13} style={{ strokeWidth: 3 }}/> Лев<br/>проверен</div>
        </div>

        <div style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '18px 0 8px' }}>— состояния сессии</div>

        {/* a) установка */}
        <div style={{ background: t.panelAlt, border: `1px solid ${t.border}`, borderRadius: KD_RADIUS, padding: '13px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: `2.5px solid ${t.panelHi}`, borderTopColor: t.accent, animation: 'kd-spin 0.9s linear infinite' }}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>устанавливаем защищённое соединение…</div>
            <div style={{ fontSize: 10, color: t.accent, marginTop: 2, fontFamily: KD_MONO }}>обмен ключами · x3dh</div>
          </div>
        </div>

        {/* b) предупреждение */}
        <div style={{ background: 'rgba(192,67,47,0.08)', border: `1px solid ${t.danger}`, borderRadius: KD_RADIUS, padding: '13px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Icon.Alert width={18} height={18} style={{ color: t.danger, flexShrink: 0, marginTop: 1 }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.danger }}>ключ безопасности Кости изменился</div>
              <div style={{ fontSize: 11, color: t.textSoft, marginTop: 3, lineHeight: 1.45 }}>проверьте код заново, прежде чем продолжать.</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 11 }}>
            <div style={{ background: t.danger, color: '#fff', borderRadius: KD_RADIUS, padding: '8px 15px', fontSize: 12, fontWeight: 700 }}>проверить</div>
            <div style={{ fontSize: 10, color: t.danger, fontFamily: KD_MONO, display: 'flex', alignItems: 'center', gap: 5 }}><Icon.Lock width={10} height={10} style={{ strokeWidth: 2.4 }}/> отправка заблокирована</div>
          </div>
        </div>

        {/* c) device-bound */}
        <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: KD_RADIUS, padding: '15px', display: 'flex', gap: 12 }}>
          <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: KD_RADIUS, background: 'rgba(200,122,58,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Lock width={18} height={18} style={{ color: t.warm }}/></div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>это устройство — ваш единственный ключ</div>
            <div style={{ fontSize: 12, color: t.textSoft, marginTop: 5, lineHeight: 1.5 }}>потеряете телефон — секретная переписка исчезнет. восстановить её нельзя.</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// 6) Звонки
// ════════════════════════════════════════════════════════════════════
function CallControls({ t, hangupOnly }) {
  const Btn = ({ icon, danger, active }) => (
    <div style={{
      width: 56, height: 56, borderRadius: '50%',
      background: danger ? t.danger : (active ? '#fff' : 'rgba(255,255,255,0.16)'),
      color: danger ? '#fff' : (active ? t.text : '#fff'),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{icon}</div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '4px 0 8px' }}>
      <Btn icon={<Icon.Mic width={22} height={22}/>} active/>
      <Btn icon={<Icon.Speaker width={22} height={22}/>}/>
      <Btn icon={<Icon.Video width={22} height={22}/>}/>
      <Btn icon={<Icon.Phone width={22} height={22} style={{ transform: 'rotate(135deg)' }}/>} danger/>
    </div>
  );
}

function MobileCallAudio({ t }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: `linear-gradient(170deg, ${t.profileGradFrom}, ${t.profileGradTo})`, color: '#fff', padding: '40px 24px 24px', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40 }}>
        <div style={{ boxShadow: '0 0 0 8px rgba(255,255,255,0.14)', borderRadius: '50%' }}><Avatar name="Маша Тёплая" color="rgba(255,255,255,0.25)" size={120}/></div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 24 }}>Маша Тёплая</div>
        <div style={{ fontSize: 14, opacity: 0.85, marginTop: 6 }}>идёт звонок</div>
        <div style={{ fontFamily: KD_MONO, fontSize: 16, marginTop: 4, letterSpacing: '0.06em' }}>02:14</div>
      </div>
      <CallControls t={t}/>
    </div>
  );
}

function MobileCallVideo({ t }) {
  return (
    <div style={{ flex: 1, position: 'relative', background: `repeating-linear-gradient(135deg, ${t.profileGradTo}, ${t.profileGradTo} 14px, ${t.profileGradFrom} 14px, ${t.profileGradFrom} 28px)`, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: KD_MONO, fontSize: 12, color: 'rgba(255,255,255,0.75)', background: 'rgba(20,15,8,0.35)', padding: '4px 10px', borderRadius: 4 }}>видео собеседника</span>
      </div>
      {/* оверлей имя + таймер */}
      <div style={{ position: 'relative', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: 'rgba(20,15,8,0.45)', borderRadius: KD_RADIUS, padding: '6px 12px', color: '#fff' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Маша Тёплая</div>
          <div style={{ fontFamily: KD_MONO, fontSize: 11, opacity: 0.85 }}>02:14 · 1080p</div>
        </div>
      </div>
      {/* PiP */}
      <div style={{ position: 'absolute', top: 16, right: 16, width: 92, height: 130, borderRadius: KD_RADIUS, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.5)', background: `repeating-linear-gradient(135deg, ${t.accentDeep}, ${t.accentDeep} 8px, ${t.accent} 8px, ${t.accent} 16px)`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6 }}>
        <span style={{ fontFamily: KD_MONO, fontSize: 9, color: 'rgba(255,255,255,0.85)' }}>вы</span>
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ position: 'relative', background: 'rgba(20,15,8,0.32)', paddingBottom: 6 }}><CallControls t={t}/></div>
    </div>
  );
}

function IncomingCallCard({ t }) {
  return (
    <div style={{ width: 360, background: t.panel, borderRadius: 18, border: `1px solid ${t.border}`, boxShadow: '0 8px 30px rgba(40,30,15,0.16)', padding: '20px 22px', fontFamily: KD_FONT, display: 'flex', alignItems: 'center', gap: 16 }}>
      <Avatar name="Лев Морозов" color="#7d9268" size={52}/>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Лев Морозов</div>
        <div style={{ fontSize: 12, color: t.textSoft, fontFamily: KD_MONO, marginTop: 2 }}>звонит…</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: t.danger, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Phone width={20} height={20} style={{ transform: 'rotate(135deg)' }}/></div>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: t.online, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Phone width={20} height={20}/></div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Профиль — общая шапка с градиентом
// ════════════════════════════════════════════════════════════════════
function ProfileHead({ t, name, about, self }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ height: 124, background: `linear-gradient(150deg, ${t.profileGradFrom}, ${t.profileGradTo})` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px' }}>
          <Icon.Back width={22} height={22} style={{ color: 'rgba(255,255,255,0.92)' }}/>
          {self
            ? <Icon.Settings width={21} height={21} style={{ color: 'rgba(255,255,255,0.92)' }}/>
            : <Icon.More width={22} height={22} style={{ color: 'rgba(255,255,255,0.92)' }}/>}
        </div>
      </div>
      <div style={{ padding: '0 20px', marginTop: -36 }}>
        <div style={{ boxShadow: `0 0 0 4px ${t.bg}`, borderRadius: '50%', width: 'fit-content' }}>
          <Avatar name={name} color={t.profileGradTo} size={76}/>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: t.text, marginTop: 10, letterSpacing: '-0.02em' }}>{name}</div>
        <div style={{ fontSize: 13, color: t.textSoft, marginTop: 4 }}>{about}</div>
        <div style={{ fontSize: 11, color: t.textMute, fontFamily: KD_MONO, marginTop: 6 }}>МСК · 11:24 · в сети</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {[['хозяйка', t.warm], ['дизайн', t.accent], ['бук-клуб', t.profileGradFrom]].map(([r, c], i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: KD_MONO, color: t.textSoft, background: t.panel, border: `1px solid ${t.border}`, padding: '3px 9px', borderRadius: 12 }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: c }}/>{r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// 7) MobileProfileOther
function MobileProfileOther({ t }) {
  const Btn = ({ icon, label, primary }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', background: primary ? t.accent : t.panel, color: primary ? '#fff' : t.text, border: primary ? 'none' : `1px solid ${t.border}`, borderRadius: KD_RADIUS }}>
      {icon}<span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
    </div>
  );
  return (
    <>
      <ProfileHead t={t} name="Маша Тёплая" about="дизайнер · любит какао и тихие вечера"/>
      <div style={{ padding: '20px 20px 0', display: 'flex', gap: 10 }}>
        <Btn icon={<Icon.Send width={19} height={19}/>} label="написать"/>
        <Btn icon={<Icon.Lock width={19} height={19}/>} label="секретный" primary/>
        <Btn icon={<Icon.Phone width={19} height={19}/>} label="позвонить"/>
      </div>
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>— вы оба в</div>
        <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: KD_RADIUS, overflow: 'hidden' }}>
          {[['Друзья и кофе', '23 чел'], ['Бук-клуб', '11 чел']].map(([r, c], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderTop: i ? `1px solid ${t.border}` : 'none' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: i ? t.accent : t.warm, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>#</div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: t.text }}>{r}</span>
              <span style={{ fontSize: 11, color: t.textMute, fontFamily: KD_MONO }}>{c}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: t.textMute, fontFamily: KD_MONO, marginTop: 14 }}>знакомы с мая 2024</div>
      </div>
    </>
  );
}

// 8) MobileProfileSelf
function MobileProfileSelf({ t }) {
  return (
    <>
      <ProfileHead t={t} name="аня к" about="делаю интерфейсы. на связи почти всегда" self/>
      <div style={{ padding: '20px 20px 0', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', background: t.accent, color: '#fff', borderRadius: KD_RADIUS, fontSize: 14, fontWeight: 700 }}><Icon.Edit width={17} height={17}/> редактировать профиль</div>
        <div style={{ width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.panel, border: `1px solid ${t.border}`, borderRadius: KD_RADIUS }}><Icon.Settings width={20} height={20} style={{ color: t.textSoft }}/></div>
      </div>
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: KD_RADIUS, overflow: 'hidden' }}>
          {[[<Icon.Lock width={18} height={18}/>, 'мои ключи и safety numbers'], [<Icon.Bell width={18} height={18}/>, 'уведомления'], [<Icon.Moon width={18} height={18}/>, 'тема оформления']].map(([ic, label], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderTop: i ? `1px solid ${t.border}` : 'none' }}>
              <span style={{ color: t.textSoft }}>{ic}</span>
              <span style={{ flex: 1, fontSize: 14, color: t.text }}>{label}</span>
              <Icon.ChevronRight width={17} height={17} style={{ color: t.textMute }}/>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// 9) MobileSettings
// ════════════════════════════════════════════════════════════════════
function Toggle({ t, on }) {
  return (
    <div style={{ width: 40, height: 23, borderRadius: 12, background: on ? t.accent : t.panelHi, display: 'flex', alignItems: 'center', padding: 2, justifyContent: on ? 'flex-end' : 'flex-start' }}>
      <div style={{ width: 19, height: 19, borderRadius: '50%', background: '#fff' }}/>
    </div>
  );
}
function MobileSettings({ t }) {
  const Sect = ({ title, children }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 4px 7px' }}>{title}</div>
      <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: KD_RADIUS, overflow: 'hidden' }}>{children}</div>
    </div>
  );
  const Row = ({ icon, label, right, danger, first }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: first ? 'none' : `1px solid ${t.border}` }}>
      <span style={{ color: danger ? t.danger : t.textSoft }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 14, color: danger ? t.danger : t.text, fontWeight: danger ? 600 : 400 }}>{label}</span>
      {right}
    </div>
  );
  return (
    <>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${t.border}`, background: t.panelAlt }}>
        <Icon.Back width={22} height={22} style={{ color: t.textSoft }}/>
        <span style={{ fontSize: 17, fontWeight: 700, color: t.text }}>настройки</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <Sect title="— аккаунт">
          <Row first icon={<Icon.Users width={18} height={18}/>} label="профиль" right={<Icon.ChevronRight width={17} height={17} style={{ color: t.textMute }}/>}/>
          <Row icon={<Icon.Moon width={18} height={18}/>} label="тёмная тема" right={<Toggle t={t} on={false}/>}/>
        </Sect>
        <Sect title="— уведомления">
          <Row first icon={<Icon.Bell width={18} height={18}/>} label="звук сообщений" right={<Toggle t={t} on/>}/>
          <Row icon={<Icon.Phone width={18} height={18}/>} label="звонки" right={<Toggle t={t} on/>}/>
          <Row icon={<Icon.Speaker width={18} height={18}/>} label="голос и звук" right={<Icon.ChevronRight width={17} height={17} style={{ color: t.textMute }}/>}/>
        </Sect>
        <Sect title="— безопасность">
          <Row first icon={<Icon.Lock width={18} height={18}/>} label="управление ключами" right={<Icon.ChevronRight width={17} height={17} style={{ color: t.textMute }}/>}/>
          <Row icon={<Icon.Shield width={18} height={18}/>} label="мои safety numbers" right={<Icon.ChevronRight width={17} height={17} style={{ color: t.textMute }}/>}/>
          <Row icon={<Icon.Alert width={18} height={18}/>} label="сбросить устройство" danger/>
        </Sect>
        <Sect title="— о приложении">
          <Row first icon={<Icon.Smile width={18} height={18}/>} label="о КакДела" right={<span style={{ fontSize: 11, color: t.textMute, fontFamily: KD_MONO }}>v2.4.0</span>}/>
        </Sect>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// 10) MobileNewChat — старт переписки
// ════════════════════════════════════════════════════════════════════
function MobileNewChat({ t }) {
  const people = [
    { n: 'Маша Тёплая', c: '#d68b6c', p: '● в сети', status: 'online' },
    { n: 'Лев Морозов', c: '#7d9268', p: '● в сети', status: 'online' },
    { n: 'Костя Дн', c: '#a87b56', p: 'отошёл', status: 'idle' },
    { n: 'Соня Н', c: '#c98870', p: 'не беспокоить', status: 'dnd' },
    { n: 'Тима Р', c: '#8d6e4d', p: 'был вчера', status: 'offline' },
  ];
  return (
    <>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${t.border}`, background: t.panelAlt }}>
        <Icon.Back width={22} height={22} style={{ color: t.textSoft }}/>
        <span style={{ fontSize: 17, fontWeight: 700, color: t.text }}>новая переписка</span>
      </div>
      <div style={{ padding: '12px 14px 6px' }}>
        <div style={{ background: t.panelAlt, borderRadius: KD_RADIUS, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${t.border}` }}>
          <Icon.Search width={15} height={15} style={{ color: t.textMute }}/>
          <span style={{ fontSize: 14, color: t.textMute }}>искать среди своих…</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {people.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 16px', borderBottom: `1px solid ${t.border}` }}>
            <div style={{ position: 'relative' }}>
              <Avatar name={d.n} color={d.c} size={44}/>
              <StatusDot t={t} status={d.status} ring={t.bg}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{d.n}</div>
              <div style={{ fontSize: 11, color: d.status === 'online' ? t.online : t.textMute, fontFamily: KD_MONO, marginTop: 1 }}>{d.p}</div>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <div style={{ padding: '7px 11px', borderRadius: KD_RADIUS, border: `1px solid ${t.border}`, fontSize: 11, fontWeight: 600, color: t.textSoft }}>обычный</div>
              <div style={{ padding: '7px 10px', borderRadius: KD_RADIUS, background: t.accent, color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Icon.Lock width={12} height={12}/> секретный</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// 12) Пустые состояния (маленькие карточки)
// ════════════════════════════════════════════════════════════════════
function EmptyChats({ t }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 40px', textAlign: 'center', gap: 14 }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: t.panel, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.warm }}><Icon.Smile width={30} height={30}/></div>
      <div style={{ fontSize: 17, fontWeight: 700, color: t.text }}>тут пока тихо</div>
      <div style={{ fontSize: 13, color: t.textSoft, lineHeight: 1.5 }}>напиши первому из своих — все, кого ты знаешь, уже здесь.</div>
      <div style={{ marginTop: 4, background: t.accent, color: '#fff', borderRadius: KD_RADIUS, padding: '11px 20px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><Icon.Plus width={17} height={17}/> новый чат</div>
    </div>
  );
}
function EmptySecret({ t }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 40px', textAlign: 'center', gap: 14 }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(93,111,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accent }}><Icon.Lock width={30} height={30}/></div>
      <div style={{ fontSize: 17, fontWeight: 700, color: t.text }}>секретный чат пуст</div>
      <div style={{ fontSize: 13, color: t.textSoft, lineHeight: 1.5 }}>здесь всё зашифровано и живёт только на этом устройстве. напиши — и сверьте ключи.</div>
      <div style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO, display: 'flex', alignItems: 'center', gap: 5 }}><Icon.Lock width={10} height={10} style={{ strokeWidth: 2.4 }}/> E2EE · device-bound</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// FinalMobile — галерея всех экранов
// ════════════════════════════════════════════════════════════════════
function FinalMobile({ t = KD_LIGHT }) {
  const screens = [
    ['01 · вход по инвайту', MobileAuth],
    ['02 · список чатов', MobileChatList],
    ['03 · личный чат', MobileDM],
    ['04 · секретный чат', MobileSecretChat],
    ['05 · сверка ключей + состояния', MobileKeyVerify],
    ['06 · звонок · аудио', MobileCallAudio],
    ['07 · звонок · видео', MobileCallVideo],
    ['08 · профиль · другой', MobileProfileOther],
    ['09 · профиль · свой', MobileProfileSelf],
    ['10 · настройки', MobileSettings],
    ['11 · новая переписка', MobileNewChat],
    ['12 · пусто · чаты', EmptyChats],
    ['13 · пусто · секретный', EmptySecret],
  ];
  return (
    <div style={{ minHeight: '100vh', background: '#f0eee9', fontFamily: KD_FONT, padding: '48px 56px 80px' }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: t.text, letterSpacing: '-0.02em' }}>КакДела · мобильное приложение</div>
        <div style={{ fontSize: 15, color: t.textSoft, marginTop: 6 }}>уютный self-hosted мессенджер для своих · 1:1 общение + секретные чаты (E2EE, device-bound) · Android 393×852</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 44, marginTop: 36 }}>
        {screens.map(([label, S], i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, fontFamily: KD_MONO, color: t.textMute, letterSpacing: '0.03em' }}>{label}</div>
            <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 6px rgba(40,30,15,0.10), 0 14px 40px rgba(40,30,15,0.10)', border: `1px solid ${t.border}` }}>
              <PhoneFrame t={t}><S t={t}/></PhoneFrame>
            </div>
          </div>
        ))}
        {/* входящий звонок — отдельная карточка */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'flex-start' }}>
          <div style={{ fontSize: 12, fontFamily: KD_MONO, color: t.textMute, letterSpacing: '0.03em' }}>14 · входящий звонок</div>
          <IncomingCallCard t={t}/>
        </div>
      </div>
    </div>
  );
}

// ── Экспорт ─────────────────────────────────────────────────────────
window.KD_FONT = KD_FONT;
window.KD_MONO = KD_MONO;
window.KD_RADIUS = KD_RADIUS;
window.KD_LIGHT = KD_LIGHT;
window.Avatar = Avatar;
window.Icon = Icon;
window.PhoneFrame = PhoneFrame;
window.FinalMobile = FinalMobile;

