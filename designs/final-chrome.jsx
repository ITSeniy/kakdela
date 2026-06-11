// КакДела · финальный дизайн
// База: компактная плотность + моноширинные акценты + палитра D
// Характер: дружелюбные подписи и приветствия из A
// Поддержка светлой и тёмной темы через токены

const KD_LIGHT = {
  name: 'light',
  bg: '#e8e0cc',
  bgDeep: '#ddd3bd',
  panel: '#f0e8d4',
  panelAlt: '#e2d8c0',
  panelHi: '#d4caaf',
  panelSoft: '#ece3ce',
  border: 'rgba(60, 50, 30, 0.12)',
  borderSoft: 'rgba(60, 50, 30, 0.06)',
  text: '#2a2418',
  textSoft: '#5e5440',
  textMute: '#8a7e64',
  accent: '#5d6f4c',
  accentDeep: '#43533a',
  accentSoft: '#b8c2a0',
  accentBg: 'rgba(93, 111, 76, 0.12)',
  warm: '#c87a3a',
  warmDeep: '#a55e26',
  warmSoft: '#e8c9a0',
  warmBg: 'rgba(200, 122, 58, 0.12)',
  online: '#5d6f4c',
  idle: '#d4a14a',
  dnd: '#c0432f',
  danger: '#c0432f',
  stage: '#1a1610',
  stageText: '#e8ddc4',
};

const KD_DARK = {
  name: 'dark',
  bg: '#1a1610',
  bgDeep: '#13100c',
  panel: '#221d15',
  panelAlt: '#2a241b',
  panelHi: '#332b21',
  panelSoft: '#2d271e',
  border: 'rgba(232, 195, 140, 0.10)',
  borderSoft: 'rgba(232, 195, 140, 0.05)',
  text: '#e8ddc4',
  textSoft: '#b8a98a',
  textMute: '#7d6e54',
  accent: '#9bb083',
  accentDeep: '#7a9162',
  accentSoft: '#3d4a32',
  accentBg: 'rgba(155, 176, 131, 0.14)',
  warm: '#e8a05c',
  warmDeep: '#c87a3a',
  warmSoft: '#5a4128',
  warmBg: 'rgba(232, 160, 92, 0.12)',
  online: '#9bb083',
  idle: '#e0b860',
  dnd: '#e07060',
  danger: '#c87060',
  stage: '#0d0a07',
  stageText: '#e8ddc4',
};

const KD_FONT = '"Inter", -apple-system, system-ui, sans-serif';
const KD_MONO = '"JetBrains Mono", ui-monospace, monospace';
const KD_RADIUS = 6;

// ─── Серверная рельса ──────────────────────────────────────────────────────
function KD_ServerRail({ t, current = 'Д' }) {
  const servers = [
    { l: 'Д', c: t.accent, name: 'Друзья и кофе', badge: 14 },
    { l: 'Б', c: t.warm, name: 'Бук-клуб', badge: 3 },
    { l: 'ПК', c: '#8a6e4d', name: 'Полночный код' },
    { l: 'С', c: '#7a6850', name: 'Соседи' },
    { l: 'Х', c: '#6e6856', name: 'Хор' },
  ];
  return (
    <div style={{
      width: 56, background: t.bgDeep, display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '10px 0', gap: 6,
      borderRight: `1px solid ${t.border}`,
    }}>
      <div title="КакДела" style={{
        width: 36, height: 36, borderRadius: KD_RADIUS, background: t.warm,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 13, letterSpacing: '-0.04em',
      }}>кд</div>
      <div style={{ width: 28, height: 1, background: t.border, margin: '3px 0' }}/>
      {servers.map((s, i) => {
        const active = s.l === current;
        return (
          <div key={i} style={{ position: 'relative' }}>
            {active && <div style={{
              position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)',
              width: 3, height: 26, borderRadius: 2, background: t.accent,
            }}/>}
            <div style={{
              width: 36, height: 36, borderRadius: KD_RADIUS, background: s.c,
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              boxShadow: active ? `0 0 0 1.5px ${t.bgDeep}, 0 0 0 3px ${t.accent}` : undefined,
            }}>{s.l}</div>
            {s.badge && <div style={{
              position: 'absolute', top: -3, right: -3, background: t.warm, color: '#fff',
              fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 6,
              border: `1.5px solid ${t.bgDeep}`, fontFamily: KD_MONO,
            }}>{s.badge}</div>}
          </div>
        );
      })}
      <div style={{
        width: 36, height: 36, borderRadius: KD_RADIUS, border: `1.5px dashed ${t.textMute}`,
        color: t.textMute, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      }}><Icon.Plus width={14} height={14}/></div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
        <Icon.Inbox width={15} height={15} style={{ color: t.textSoft, cursor: 'pointer' }}/>
        <Icon.Search width={15} height={15} style={{ color: t.textSoft, cursor: 'pointer' }}/>
        <Icon.Settings width={15} height={15} style={{ color: t.textSoft, cursor: 'pointer' }}/>
      </div>
    </div>
  );
}

// ─── Список каналов ─────────────────────────────────────────────────────────
function KD_ChannelList({ t, active = 'болталка', voiceLive = true, width = 216 }) {
  const cats = [
    { name: 'добро пожаловать', items: [
      { name: 'привет' }, { name: 'правила' }, { name: 'предложения' },
    ]},
    { name: 'общение', items: [
      { name: 'болталка', unread: 12 },
      { name: 'как-дела', mention: 2 },
      { name: 'кухня' }, { name: 'настроение' }, { name: 'мемы' }, { name: 'фото-дня' },
    ]},
    { name: 'дело', items: [
      { name: 'проекты' }, { name: 'код' }, { name: 'дизайн', unread: 4 },
    ]},
    { name: 'голосовые', voice: true, items: [
      { name: 'у камина', live: voiceLive, users: [
        { n: 'Лев', c: '#7d9268' },
        { n: 'Маша', c: '#d68b6c', share: true },
        { n: 'Костя', c: '#a87b56' },
        { n: 'Соня', c: '#c98870', muted: true },
      ]},
      { name: 'тихая' },
      { name: 'совм. экран' },
    ]},
  ];
  return (
    <div style={{
      width, background: t.panel, display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${t.border}`, flexShrink: 0,
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: `1px solid ${t.border}`, background: t.panelAlt,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Друзья и кофе</div>
          <div style={{ fontSize: 10, color: t.textSoft, marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: t.online }}/>
            <span style={{ color: t.online, fontWeight: 600, fontFamily: KD_MONO }}>14</span>
            <span>онлайн / 23 всего</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: t.textMute, fontFamily: KD_MONO, cursor: 'pointer' }}>⌄</div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: '6px 4px' }}>
        {cats.map(cat => (
          <div key={cat.name} style={{ marginBottom: 6 }}>
            <div style={{
              padding: '3px 10px', fontSize: 10, fontWeight: 600,
              color: t.textMute, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ letterSpacing: '0.04em', fontFamily: KD_MONO }}>— {cat.name}</span>
              <Icon.Plus width={10} height={10}/>
            </div>
            {cat.items.map(it => {
              const isActive = it.name === active;
              return (
                <div key={it.name}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px',
                    borderRadius: 4, fontSize: 12, cursor: 'pointer',
                    color: isActive ? t.text : t.textSoft,
                    background: isActive ? t.panelHi : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                    borderLeft: isActive ? `2px solid ${t.accent}` : '2px solid transparent',
                    paddingLeft: isActive ? 6 : 8,
                    margin: '0 4px 1px',
                  }}>
                    {cat.voice ? <Icon.Speaker width={11} height={11}/> : <Icon.Hash width={11} height={11}/>}
                    <span style={{ flex: 1 }}>{it.name}</span>
                    {it.live && <span style={{
                      fontSize: 8, fontWeight: 700, padding: '1px 5px', background: t.accent,
                      color: '#fff', borderRadius: 3, letterSpacing: '0.05em', fontFamily: KD_MONO,
                    }}>LIVE</span>}
                    {it.unread && <span style={{ fontSize: 10, fontWeight: 700, color: t.text, fontFamily: KD_MONO }}>{it.unread}</span>}
                    {it.mention && <span style={{
                      background: t.warm, color: '#fff', fontSize: 9, fontWeight: 700,
                      padding: '0 5px', borderRadius: 8, fontFamily: KD_MONO,
                    }}>{it.mention}</span>}
                  </div>
                  {it.users && (
                    <div style={{ marginLeft: 4, marginBottom: 4, marginTop: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {it.users.map((u, i) => (
                        <div key={u.n} style={{
                          display: 'flex', alignItems: 'center', gap: 7,
                          padding: '3px 8px 3px 18px',
                          borderRadius: 4, cursor: 'pointer',
                          position: 'relative',
                        }}>
                          {/* линия-ниточка */}
                          <span style={{
                            position: 'absolute', left: 10, top: 0, bottom: i === it.users.length - 1 ? '50%' : 0,
                            width: 1, background: t.border,
                          }}/>
                          <span style={{
                            position: 'absolute', left: 10, top: '50%', width: 6, height: 1,
                            background: t.border,
                          }}/>
                          <Avatar name={u.n} color={u.c} size={18}/>
                          <span style={{ flex: 1, fontSize: 12, color: t.text, fontWeight: 500 }}>{u.n}</span>
                          {u.share && <Icon.Monitor width={10} height={10} style={{ color: t.warm }}/>}
                          {u.muted && <Icon.MicOff width={10} height={10} style={{ color: t.dnd }}/>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <KD_UserBar t={t}/>
    </div>
  );
}

function KD_UserBar({ t, muted = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
      background: t.panelAlt, borderTop: `1px solid ${t.border}`,
    }}>
      <Avatar name="Аня К" color={t.warm} size={28}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text, fontFamily: KD_MONO }}>
          аня <span style={{ color: t.textMute, fontWeight: 400 }}>#1284</span>
        </div>
        <div style={{ fontSize: 9, color: t.online, fontFamily: KD_MONO }}>● варит кофе</div>
      </div>
      {muted
        ? <Icon.MicOff width={13} height={13} style={{ color: t.dnd, cursor: 'pointer' }}/>
        : <Icon.Mic width={13} height={13} style={{ color: t.textSoft, cursor: 'pointer' }}/>}
      <Icon.Headphones width={13} height={13} style={{ color: t.textSoft, cursor: 'pointer' }}/>
    </div>
  );
}

// ─── Список участников ────────────────────────────────────────────────────
function KD_MemberList({ t, width = 220, highlightVoice = false }) {
  const groups = [
    { title: 'хозяева', count: 2, members: [
      { n: 'аня', s: 'варит кофе', c: t.warm, role: 'хоз' },
      { n: 'Лев Морозов', s: 'в #болталке', c: '#7d9268', role: 'хоз' },
    ]},
    { title: highlightVoice ? 'у камина · 4' : 'свои', count: 4, members: [
      { n: 'Маша Тёплая', s: highlightVoice ? 'демонстрирует' : 'пьёт какао', c: '#d68b6c', share: highlightVoice, voice: highlightVoice },
      { n: 'Костя Дн', s: highlightVoice ? 'на связи' : 'на стриме', c: '#a87b56', voice: highlightVoice, mic: highlightVoice },
      { n: 'Соня Н', s: highlightVoice ? 'микрофон выкл.' : 'не беспокоить', c: '#c98870', muted: highlightVoice, voice: highlightVoice, dnd: !highlightVoice },
      { n: 'Юля С', s: 'отошла', c: '#b88c4e', idle: true },
    ]},
    { title: 'друзья', count: 5, members: [
      { n: 'Тима Р', s: '', c: '#8d6e4d' },
      { n: 'Влад К', s: 'играет в Hades', c: '#9c7f5e' },
      { n: 'Гриша П', s: '', c: '#6e6856' },
    ]},
    { title: 'не в сети', count: 14, members: [
      { n: 'Ира П', off: true, c: '#a89684' },
      { n: 'Гена Х', off: true, c: '#a89684' },
      { n: 'Лёша М', off: true, c: '#a89684' },
    ]},
  ];
  return (
    <div style={{
      width, background: t.panel, borderLeft: `1px solid ${t.border}`,
      padding: '10px 6px', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{
        padding: '4px 10px 8px', borderBottom: `1px solid ${t.border}`, marginBottom: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 11, color: t.textMute, fontFamily: KD_MONO }}>14 / 23 онлайн</div>
        <Icon.Search width={11} height={11} style={{ color: t.textMute, cursor: 'pointer' }}/>
      </div>
      {groups.map(g => (
        <div key={g.title} style={{ marginBottom: 8 }}>
          <div style={{
            padding: '3px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
            color: g.title.includes('камина') ? t.accent : t.textMute, textTransform: 'uppercase',
            display: 'flex', justifyContent: 'space-between', fontFamily: KD_MONO,
          }}>
            <span>— {g.title}</span><span>{g.count}</span>
          </div>
          {g.members.map(m => (
            <div key={m.n} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
              borderRadius: 4, cursor: 'pointer',
              opacity: m.off ? 0.55 : 1,
              background: m.voice ? t.accentBg : 'transparent',
            }}>
              <div style={{ position: 'relative' }}>
                <Avatar name={m.n} color={m.c} size={24}/>
                <div style={{
                  position: 'absolute', bottom: -2, right: -2, width: 9, height: 9, borderRadius: 5,
                  background: m.off ? t.textMute : m.idle ? t.idle : m.dnd ? t.dnd : t.online,
                  border: `2px solid ${m.voice ? t.panel : t.panel}`,
                }}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {m.n}
                  {m.role && <span style={{ fontSize: 8, padding: '0 3px', background: t.accentSoft, color: t.name === 'dark' ? t.accent : t.accentDeep, borderRadius: 2, fontWeight: 700, fontFamily: KD_MONO }}>{m.role}</span>}
                </div>
                {m.s && <div style={{ fontSize: 10, color: t.textSoft }}>{m.s}</div>}
              </div>
              {m.mic && <Icon.Mic width={10} height={10} style={{ color: t.online }}/>}
              {m.muted && <Icon.MicOff width={10} height={10} style={{ color: t.dnd }}/>}
              {m.share && <Icon.Monitor width={10} height={10} style={{ color: t.warm }}/>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Сообщения ───────────────────────────────────────────────────────────
function KD_Message({ t, name, color, time, text, role, reactions, replyTo, attachment, compact, edited }) {
  if (compact) {
    return (
      <div style={{
        display: 'flex', gap: 8, padding: '2px 16px 2px 16px', alignItems: 'baseline',
        transition: 'background .1s',
      }}
        className="kd-msg-compact">
        <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO, width: 36, flexShrink: 0, textAlign: 'right' }}>{time}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>{name}</span>
        <span style={{ fontSize: 13, color: t.text, lineHeight: 1.4 }}>{text}{edited && <span style={{ fontSize: 9, color: t.textMute, marginLeft: 4, fontFamily: KD_MONO }}>(изм.)</span>}</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 10, padding: '4px 16px', alignItems: 'flex-start' }}>
      <Avatar name={name} color={color} size={32}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        {replyTo && (
          <div style={{ fontSize: 10, color: t.textMute, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
            <span style={{ width: 10, height: 6, borderTopLeftRadius: 3, borderTop: `1px solid ${t.textMute}`, borderLeft: `1px solid ${t.textMute}` }}/>
            <b style={{ color: t.textSoft, fontFamily: KD_MONO }}>↳ {replyTo.name}</b>
            <span style={{ opacity: 0.8 }}>{replyTo.text}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{name}</span>
          {role && <span style={{
            fontSize: 8, padding: '1px 4px', background: t.accentSoft,
            color: t.name === 'dark' ? t.accent : t.accentDeep,
            borderRadius: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: KD_MONO,
          }}>{role}</span>}
          <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>{time}</span>
        </div>
        <div style={{ fontSize: 13, color: t.text, marginTop: 1, lineHeight: 1.5 }}>
          {text}
          {edited && <span style={{ fontSize: 9, color: t.textMute, marginLeft: 4, fontFamily: KD_MONO }}>(изм.)</span>}
        </div>
        {attachment && (
          <div style={{
            marginTop: 6, padding: 8, background: t.panelAlt,
            borderRadius: KD_RADIUS, border: `1px solid ${t.border}`,
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: t.textSoft,
            fontFamily: KD_MONO, maxWidth: 340,
          }}>
            <div style={{
              width: 32, height: 32, background: t.warm, borderRadius: 4, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
            }}>{attachment.ext || 'JPG'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: t.text, fontWeight: 600, fontFamily: KD_FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{attachment.name}</div>
              <div>{attachment.size}</div>
            </div>
          </div>
        )}
        {reactions && (
          <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
            {reactions.map((r, i) => (
              <div key={i} style={{
                background: t.panelAlt, border: `1px solid ${t.border}`,
                padding: '1px 6px', borderRadius: 4, fontSize: 11, color: t.text,
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <span>{r.emoji}</span>
                <span style={{ color: t.textSoft, fontFamily: KD_MONO, fontSize: 10 }}>{r.count}</span>
              </div>
            ))}
            <div style={{
              padding: '1px 6px', borderRadius: 4, fontSize: 11, color: t.textMute,
              border: `1px dashed ${t.border}`, cursor: 'pointer',
            }}>+</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Шапка канала ────────────────────────────────────────────────────────
function KD_ChannelHeader({ t, icon, name, topic, right, stats }) {
  return (
    <div style={{
      padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: `1px solid ${t.border}`, background: t.panelAlt, flexShrink: 0,
    }}>
      {icon}
      <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{name}</div>
      {topic && <>
        <div style={{ width: 1, height: 14, background: t.border }}/>
        <div style={{ fontSize: 11, color: t.textSoft }}>{topic}</div>
      </>}
      <div style={{ flex: 1 }}/>
      {stats && <div style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>{stats}</div>}
      <div style={{ display: 'flex', gap: 10, color: t.textMute }}>
        {right || <>
          <Icon.Pin width={14} height={14} style={{ cursor: 'pointer' }}/>
          <Icon.Inbox width={14} height={14} style={{ cursor: 'pointer' }}/>
          <Icon.Search width={14} height={14} style={{ cursor: 'pointer' }}/>
        </>}
      </div>
    </div>
  );
}

// ─── Поле ввода ─────────────────────────────────────────────────────────
function KD_Composer({ t, placeholder = 'сообщение в #болталка…', typing = 'Маша, Костя печатают…' }) {
  return (
    <div style={{ padding: '8px 16px 14px', flexShrink: 0 }}>
      <div style={{
        background: t.panel, borderRadius: KD_RADIUS, padding: '8px 12px',
        display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${t.border}`,
      }}>
        <Icon.Plus width={15} height={15} style={{ color: t.textMute }}/>
        <div style={{ flex: 1, fontSize: 12, color: t.textMute }}>{placeholder}</div>
        <div style={{ display: 'flex', gap: 8, color: t.textMute, alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontFamily: KD_MONO, opacity: 0.7 }}>md</span>
          <Icon.Smile width={15} height={15}/>
        </div>
        <div style={{
          padding: '4px 10px', background: t.accent, color: '#fff',
          borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: KD_MONO, cursor: 'pointer',
        }}>send ⏎</div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 5, paddingLeft: 4 }}>
        <span style={{ fontSize: 10, color: t.textMute }}>{typing && <>
          {typing.split(',').map((n, i) => (
            <React.Fragment key={i}>{i > 0 ? ', ' : ''}<b style={{ color: t.accent }}>{n.trim().split(' ')[0]}</b></React.Fragment>
          ))} печатают…
        </>}</span>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>**жирный**  _курсив_  `код`</span>
      </div>
    </div>
  );
}

// ─── Разделитель даты ────────────────────────────────────────────────────
function KD_DayDivider({ t, label }) {
  return (
    <div style={{ padding: '4px 16px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 1, background: t.border }}/>
      <span style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: t.border }}/>
    </div>
  );
}

window.KD_LIGHT = KD_LIGHT;
window.KD_DARK = KD_DARK;
window.KD_FONT = KD_FONT;
window.KD_MONO = KD_MONO;
window.KD_RADIUS = KD_RADIUS;
window.KD_ServerRail = KD_ServerRail;
window.KD_ChannelList = KD_ChannelList;
window.KD_UserBar = KD_UserBar;
window.KD_MemberList = KD_MemberList;
window.KD_Message = KD_Message;
window.KD_ChannelHeader = KD_ChannelHeader;
window.KD_Composer = KD_Composer;
window.KD_DayDivider = KD_DayDivider;
