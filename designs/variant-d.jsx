// Вариант D — «Шерсть»
// Компактная плотность, овсяный фон, мшистый зелёный акцент.
// Текстура шерсти намекается через тонкую сеть точек/штрихов.
// Раскладка: рельсы серверов сужены, чат-центричный, без отдельных карточек.

const D_THEME = {
  bg: '#e8e0cc',
  bgDark: '#ddd3bd',
  panel: '#f0e8d4',
  panelAlt: '#e2d8c0',
  panelHi: '#d4caaf',
  border: 'rgba(60, 50, 30, 0.12)',
  text: '#2a2418',
  textSoft: '#5e5440',
  textMute: '#8a7e64',
  accent: '#5d6f4c',
  accentDeep: '#43533a',
  accentSoft: '#b8c2a0',
  warm: '#c87a3a',
  online: '#5d6f4c',
  font: '"Inter", -apple-system, system-ui, sans-serif',
  radius: 8,
};

const D_TEXTURE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">' +
  '<circle cx="2" cy="2" r="0.5" fill="rgba(60,50,30,0.18)"/>' +
  '<circle cx="14" cy="10" r="0.5" fill="rgba(60,50,30,0.12)"/>' +
  '<circle cx="6" cy="18" r="0.5" fill="rgba(60,50,30,0.15)"/>' +
  '<circle cx="20" cy="20" r="0.5" fill="rgba(60,50,30,0.1)"/>' +
  '</svg>'
);

function D_ServerRail() {
  const t = D_THEME;
  return (
    <div style={{
      width: 56, background: t.bgDark, display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '10px 0', gap: 6,
      borderRight: `1px solid ${t.border}`,
      backgroundImage: `url(${D_TEXTURE})`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: t.radius, background: t.accent,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 13, letterSpacing: '-0.04em',
      }}>кд</div>
      <div style={{ width: 28, height: 1, background: t.border, margin: '3px 0' }}/>
      {[
        { l: 'Д', c: t.accent, active: true, badge: 14 },
        { l: 'Б', c: t.warm, badge: 3 },
        { l: 'ПК', c: '#8a6e4d' },
        { l: 'С', c: '#7a6850' },
        { l: 'Х', c: '#6e6856' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'relative' }}>
          {s.active && <div style={{
            position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)',
            width: 3, height: 24, borderRadius: 2, background: t.accent,
          }}/>}
          <div style={{
            width: 36, height: 36, borderRadius: t.radius, background: s.c,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            boxShadow: s.active ? `0 0 0 1.5px ${t.bgDark}, 0 0 0 3px ${t.accent}` : undefined,
          }}>{s.l}</div>
          {s.badge && <div style={{
            position: 'absolute', top: -3, right: -3, background: t.warm, color: '#fff',
            fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 6,
            border: `1.5px solid ${t.bgDark}`,
          }}>{s.badge}</div>}
        </div>
      ))}
      <div style={{
        width: 36, height: 36, borderRadius: t.radius, border: `1.5px dashed ${t.textMute}`,
        color: t.textMute, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Icon.Plus width={14} height={14}/></div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Icon.Inbox width={16} height={16} style={{ color: t.textSoft }}/>
        <Icon.Search width={16} height={16} style={{ color: t.textSoft }}/>
        <Icon.Settings width={16} height={16} style={{ color: t.textSoft }}/>
      </div>
    </div>
  );
}

function D_ChannelList() {
  const t = D_THEME;
  const cats = [
    { name: 'добро пожаловать', items: [
      { name: 'привет' }, { name: 'правила' }, { name: 'предложения' },
    ]},
    { name: 'общение', items: [
      { name: 'болталка', unread: 12, active: true },
      { name: 'как-дела', mention: 2 },
      { name: 'кухня' }, { name: 'настроение' }, { name: 'мемы' }, { name: 'фото-дня' },
    ]},
    { name: 'дело', items: [
      { name: 'проекты' }, { name: 'код' }, { name: 'дизайн', unread: 4 },
    ]},
    { name: 'голосовые', voice: true, items: [
      { name: 'у камина', users: ['Лв', 'Мш', 'Кс', 'Сн'], live: true },
      { name: 'тихая' },
      { name: 'совм. экран' },
    ]},
  ];
  return (
    <div style={{
      width: 216, background: t.panel, display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${t.border}`,
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: `1px solid ${t.border}`,
        background: t.panelAlt,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Друзья и кофе</div>
          <div style={{ fontSize: 10, color: t.textSoft, marginTop: 1 }}>
            <span style={{ color: t.online, fontWeight: 600 }}>● 14</span> онлайн / 23 всего
          </div>
        </div>
        <div style={{ fontSize: 9, color: t.textMute, fontFamily: 'ui-monospace, monospace' }}>↕</div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: '6px 4px' }}>
        {cats.map(cat => (
          <div key={cat.name} style={{ marginBottom: 6 }}>
            <div style={{
              padding: '3px 10px', fontSize: 10, fontWeight: 600,
              color: t.textMute, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ letterSpacing: '0.04em' }}>— {cat.name}</span>
              <Icon.Plus width={10} height={10}/>
            </div>
            {cat.items.map(it => (
              <div key={it.name}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px',
                  borderRadius: 4, fontSize: 12, cursor: 'pointer',
                  color: it.active ? t.text : t.textSoft,
                  background: it.active ? t.panelHi : 'transparent',
                  fontWeight: it.active ? 600 : 500,
                  borderLeft: it.active ? `2px solid ${t.accent}` : '2px solid transparent',
                  paddingLeft: it.active ? 6 : 8,
                  margin: '0 4px 1px',
                }}>
                  {cat.voice ? <Icon.Speaker width={11} height={11}/> : <Icon.Hash width={11} height={11}/>}
                  <span style={{ flex: 1 }}>{it.name}</span>
                  {it.live && <span style={{
                    fontSize: 8, fontWeight: 700, padding: '1px 5px', background: t.accent,
                    color: '#fff', borderRadius: 3, letterSpacing: '0.05em',
                  }}>LIVE</span>}
                  {it.unread && <span style={{ fontSize: 10, fontWeight: 700, color: t.text }}>{it.unread}</span>}
                  {it.mention && <span style={{
                    background: t.warm, color: '#fff', fontSize: 9, fontWeight: 700,
                    padding: '0 5px', borderRadius: 8,
                  }}>{it.mention}</span>}
                </div>
                {it.users && (
                  <div style={{ paddingLeft: 22, marginBottom: 2, display: 'flex', gap: 4, alignItems: 'center' }}>
                    {it.users.map((u, i) => (
                      <div key={u} style={{
                        fontSize: 9, padding: '1px 6px', background: t.panelAlt,
                        border: `1px solid ${t.border}`, borderRadius: 8,
                        color: t.textSoft, fontWeight: 600,
                      }}>{u}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: t.panelAlt, borderTop: `1px solid ${t.border}`,
        fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
      }}>
        <Avatar name="Аня К" color={t.accent} size={28}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text }}>аня <span style={{ color: t.textMute, fontWeight: 400 }}>#1284</span></div>
          <div style={{ fontSize: 9, color: t.online }}>● варит кофе</div>
        </div>
        <Icon.Mic width={13} height={13} style={{ color: t.textSoft }}/>
        <Icon.Headphones width={13} height={13} style={{ color: t.textSoft }}/>
      </div>
    </div>
  );
}

function D_Message({ name, color, time, text, role, reactions, replyTo, attachment, compact }) {
  const t = D_THEME;
  if (compact) {
    return (
      <div style={{ display: 'flex', gap: 8, padding: '2px 16px', alignItems: 'baseline' }}>
        <span style={{ fontSize: 10, color: t.textMute, fontFamily: 'ui-monospace, monospace', width: 36, flexShrink: 0 }}>{time}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: role === 'mod' ? t.warm : color, flexShrink: 0 }}>{name}</span>
        <span style={{ fontSize: 13, color: t.text, lineHeight: 1.4 }}>{text}</span>
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
            <b style={{ color: t.textSoft }}>↳ {replyTo.name}</b>
            <span style={{ opacity: 0.8 }}>{replyTo.text}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{name}</span>
          {role && <span style={{
            fontSize: 8, padding: '1px 4px', background: t.accentSoft, color: t.accentDeep,
            borderRadius: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{role}</span>}
          <span style={{ fontSize: 10, color: t.textMute, fontFamily: 'ui-monospace, monospace' }}>{time}</span>
        </div>
        <div style={{ fontSize: 13, color: t.text, marginTop: 1, lineHeight: 1.5 }}>{text}</div>
        {attachment && (
          <div style={{
            marginTop: 6, padding: 8, background: t.panelAlt,
            borderRadius: 6, border: `1px solid ${t.border}`,
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: t.textSoft,
            fontFamily: 'ui-monospace, monospace', maxWidth: 320,
          }}>
            <div style={{ width: 28, height: 28, background: t.accent, borderRadius: 4, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>JPG</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: t.text, fontWeight: 600 }}>{attachment.name}</div>
              <div>{attachment.size}</div>
            </div>
          </div>
        )}
        {reactions && (
          <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
            {reactions.map((r, i) => (
              <div key={i} style={{
                background: t.panelAlt, border: `1px solid ${t.border}`,
                padding: '1px 6px', borderRadius: 4, fontSize: 11, color: t.text,
                display: 'flex', alignItems: 'center', gap: 3,
              }}><span>{r.emoji}</span><span style={{ color: t.textSoft, fontFamily: 'ui-monospace, monospace', fontSize: 10 }}>{r.count}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function D_ChatPanel() {
  const t = D_THEME;
  return (
    <div style={{ flex: 1, background: t.bg, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{
        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${t.border}`, background: t.panelAlt,
      }}>
        <Icon.Hash width={14} height={14} style={{ color: t.textSoft }}/>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>болталка</div>
        <div style={{ width: 1, height: 14, background: t.border }}/>
        <div style={{ fontSize: 11, color: t.textSoft }}>как ты сегодня? расскажи в двух словах</div>
        <div style={{ flex: 1 }}/>
        <div style={{ fontSize: 10, color: t.textMute, fontFamily: 'ui-monospace, monospace' }}>2 087 сообщ.</div>
        <div style={{ display: 'flex', gap: 10, color: t.textMute }}>
          <Icon.Pin width={14} height={14}/>
          <Icon.Inbox width={14} height={14}/>
          <Icon.Search width={14} height={14}/>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: '8px 0' }}>
        <div style={{ padding: '0 16px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 1, background: t.border }}/>
          <span style={{ fontSize: 9, color: t.textMute, fontFamily: 'ui-monospace, monospace' }}>21.05.2026 · вт</span>
          <div style={{ flex: 1, height: 1, background: t.border }}/>
        </div>
        <D_Message name="Лев Морозов" color="#7d9268" time="09:14" text="доброе утро, котики 🌅 кто как спал?" role="хозяин" reactions={[{emoji:'🌅',count:3}]}/>
        <D_Message name="Маша Тёплая" color="#d68b6c" time="09:17" text="плохо, кот будил каждые два часа. но настроение бодрое — иду пить какао" reactions={[{emoji:'🐈',count:4},{emoji:'💜',count:2}]}/>
        <D_Message compact name="Маша Тёплая" color="#d68b6c" time="09:17" text="а у вас как утро?"/>
        <D_Message name="Костя Дн" color="#a87b56" time="09:22" text="ребят, нашёл рецепт идеального пуровера. вечером покажу на стриме" replyTo={{ name: 'Лев', text: 'кто умеет варить кофе?' }} attachment={{ name: 'pour-over-recipe.jpg', size: '1.2 MB · 1620×1080' }}/>
        <D_Message name="аня" color={t.accent} time="09:28" text="я ещё сплю наполовину, но уже думаю про обед. кто на созвон в 11?" role="хозяин" reactions={[{emoji:'✋',count:3},{emoji:'☕',count:5}]}/>
        <D_Message compact name="Соня Н" color="#c98870" time="09:30" text="я буду! только сначала допишу одно письмо"/>
        <D_Message compact name="Тима Р" color="#8d6e4d" time="09:31" text="+1"/>
        <D_Message compact name="Влад К" color="#9c7f5e" time="09:33" text="меня не ждите, я на встрече до 12"/>
      </div>
      <div style={{ padding: '8px 16px 14px' }}>
        <div style={{
          background: t.panel, borderRadius: t.radius, padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${t.border}`,
        }}>
          <Icon.Plus width={15} height={15} style={{ color: t.textMute }}/>
          <div style={{ flex: 1, fontSize: 12, color: t.textMute }}>сообщение в #болталка…</div>
          <div style={{ display: 'flex', gap: 8, color: t.textMute }}>
            <span style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace' }}>md</span>
            <Icon.Smile width={15} height={15}/>
          </div>
          <div style={{
            padding: '4px 10px', background: t.accent, color: '#fff',
            borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: 'ui-monospace, monospace',
          }}>send ⏎</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 5, paddingLeft: 4 }}>
          <span style={{ fontSize: 10, color: t.textMute }}><b style={{ color: t.accent }}>Маша</b>, <b style={{ color: t.accent }}>Костя</b> печатают…</span>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 10, color: t.textMute, fontFamily: 'ui-monospace, monospace' }}>**жирный**  _курсив_  `код`</span>
        </div>
      </div>
    </div>
  );
}

function D_MemberList() {
  const t = D_THEME;
  const groups = [
    { title: 'хозяева', count: 2, members: [
      { n: 'аня', s: 'варит кофе', c: t.accent, role: 'хоз' },
      { n: 'Лев', s: 'в #болталке', c: '#7d9268', role: 'хоз' },
    ]},
    { title: 'свои', count: 4, members: [
      { n: 'Маша', s: 'пьёт какао', c: '#d68b6c', role: 'свой' },
      { n: 'Костя', s: 'на стриме', c: '#a87b56', role: 'свой' },
      { n: 'Соня', s: 'не беспокоить', c: '#c98870', dnd: true, role: 'свой' },
      { n: 'Юля', s: 'отошла', c: '#b88c4e', idle: true, role: 'свой' },
    ]},
    { title: 'друзья', count: 5, members: [
      { n: 'Тима', s: '', c: '#8d6e4d' },
      { n: 'Влад', s: 'Hades', c: '#9c7f5e' },
      { n: 'Гриша', s: '', c: '#6e6856' },
    ]},
    { title: 'не в сети', count: 14, members: [
      { n: 'Ира', off: true, c: '#a89684' },
      { n: 'Гена', off: true, c: '#a89684' },
      { n: 'Лёша', off: true, c: '#a89684' },
    ]},
  ];
  return (
    <div style={{
      width: 220, background: t.panel, borderLeft: `1px solid ${t.border}`,
      padding: '10px 6px', overflow: 'hidden',
    }}>
      <div style={{ padding: '4px 10px 8px', borderBottom: `1px solid ${t.border}`, marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: t.textMute, fontFamily: 'ui-monospace, monospace' }}>14 / 23</div>
      </div>
      {groups.map(g => (
        <div key={g.title} style={{ marginBottom: 8 }}>
          <div style={{
            padding: '3px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
            color: t.textMute, textTransform: 'uppercase',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>— {g.title}</span><span style={{ color: t.textMute }}>{g.count}</span>
          </div>
          {g.members.map(m => (
            <div key={m.n} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '3px 8px',
              borderRadius: 4, cursor: 'pointer',
              opacity: m.off ? 0.55 : 1,
            }}>
              <div style={{ position: 'relative' }}>
                <Avatar name={m.n} color={m.c} size={24}/>
                <div style={{
                  position: 'absolute', bottom: -2, right: -2, width: 9, height: 9, borderRadius: 5,
                  background: m.off ? t.textMute : m.idle ? '#d4a14a' : m.dnd ? '#c0432f' : t.online,
                  border: `2px solid ${t.panel}`,
                }}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {m.n}
                  {m.role && <span style={{ fontSize: 8, padding: '0 3px', background: t.accentSoft, color: t.accentDeep, borderRadius: 2, fontWeight: 700 }}>{m.role}</span>}
                </div>
                {m.s && <div style={{ fontSize: 10, color: t.textSoft }}>{m.s}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function VariantD_Chat() {
  return (
    <div style={{ width: '100%', height: '100%', background: D_THEME.bg, color: D_THEME.text, fontFamily: D_THEME.font, display: 'flex', overflow: 'hidden' }}>
      <D_ServerRail/><D_ChannelList/><D_ChatPanel/><D_MemberList/>
    </div>
  );
}

// === Voice/Screenshare for D ===
function D_StageTile({ name, color, kind, label, isShare, speaking, muted, big }) {
  const t = D_THEME;
  return (
    <div style={{
      position: 'relative', borderRadius: t.radius, overflow: 'hidden',
      background: '#1f1c14',
      boxShadow: speaking ? `0 0 0 2px ${t.accent}` : `0 2px 8px rgba(0,0,0,0.15)`,
      border: speaking ? 'none' : `1px solid ${t.border}`,
    }}>
      {isShare ? (
        <SharePlaceholder kind={kind} label={label} bg="#1a1810" fg="#e8e0cc" stripe="#100e09"/>
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(160deg, ${color}, ${color}99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Avatar name={name} color={color} size={big ? 56 : 40} ring="rgba(255,255,255,0.3)" ringColor="rgba(255,255,255,0.15)"/>
        </div>
      )}
      <div style={{
        position: 'absolute', left: 6, bottom: 6, display: 'flex', alignItems: 'center', gap: 4,
        background: 'rgba(10, 8, 4, 0.8)', padding: '2px 6px', borderRadius: 3,
        fontFamily: 'ui-monospace, monospace',
      }}>
        {muted && <Icon.MicOff width={9} height={9} style={{ color: '#e87060' }}/>}
        <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{name}</span>
        {isShare && <span style={{ fontSize: 9, color: t.accentSoft, fontWeight: 700 }}>· SHARE</span>}
      </div>
      {isShare && (
        <div style={{
          position: 'absolute', right: 6, top: 6, fontSize: 9, color: '#fff',
          background: 'rgba(10,8,4,0.8)', padding: '2px 6px', borderRadius: 3,
          fontFamily: 'ui-monospace, monospace',
        }}>1080p · 30fps</div>
      )}
    </div>
  );
}

function VariantD_Voice() {
  const t = D_THEME;
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg, color: t.text, fontFamily: t.font, display: 'flex', overflow: 'hidden' }}>
      <D_ServerRail/>
      <D_ChannelList/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: `1px solid ${t.border}`, background: t.panelAlt,
        }}>
          <Icon.Speaker width={14} height={14} style={{ color: t.accent }}/>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>у камина</div>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 5px', background: t.accent, color: '#fff',
            borderRadius: 3, letterSpacing: '0.05em',
          }}>LIVE</span>
          <div style={{ fontSize: 11, color: t.textSoft, fontFamily: 'ui-monospace, monospace' }}>00:32:14</div>
          <div style={{ fontSize: 11, color: t.textSoft }}>· 5 человек · 2 экрана</div>
          <div style={{ flex: 1 }}/>
          <div style={{ display: 'flex', gap: 2, padding: 2, background: t.panel, borderRadius: 4, border: `1px solid ${t.border}` }}>
            {['моз.', 'фок.', 'сет.'].map((m, i) => (
              <div key={m} style={{
                padding: '3px 8px', fontSize: 10, fontWeight: 600, borderRadius: 3,
                background: i === 0 ? t.panelHi : 'transparent',
                color: i === 0 ? t.text : t.textSoft, cursor: 'pointer',
                fontFamily: 'ui-monospace, monospace',
              }}>{m}</div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: t.online, fontFamily: 'ui-monospace, monospace' }}>● 38ms / 24kbps</div>
        </div>
        {/* stage */}
        <div style={{ flex: 1, padding: 12, display: 'flex', gap: 10, minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
            <div style={{ flex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, minHeight: 0 }}>
              <D_StageTile name="Костя · код" color="#a87b56" isShare kind="code" label="ssh prod-1.kakdela"/>
              <D_StageTile name="Маша · Figma" color="#d68b6c" isShare kind="design" label="Profile redesign v3"/>
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, minHeight: 0 }}>
              <D_StageTile name="Лев" color="#7d9268" speaking/>
              <D_StageTile name="Костя" color="#a87b56"/>
              <D_StageTile name="Маша" color="#d68b6c"/>
              <D_StageTile name="Соня" color="#c98870" muted/>
              <D_StageTile name="аня" color={t.accent}/>
            </div>
          </div>
          {/* call chat sidebar inside main area */}
          <div style={{ width: 240, background: t.panel, borderRadius: t.radius, border: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon.Hash width={12} height={12} style={{ color: t.textSoft }}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.text }}>чат у камина</span>
              <div style={{ flex: 1 }}/>
              <span style={{ fontSize: 9, color: t.textMute, fontFamily: 'ui-monospace, monospace' }}>only call</span>
            </div>
            <div style={{ flex: 1, padding: '8px 0', overflow: 'hidden' }}>
              <D_Message compact name="Костя" color="#a87b56" time="11:04" text="смотрите, баг был в роутере"/>
              <D_Message compact name="Лев" color="#7d9268" time="11:05" text="ага, видно. локально воспроизводится?"/>
              <D_Message compact name="Костя" color="#a87b56" time="11:05" text="да, сейчас покажу"/>
              <div style={{ padding: '4px 16px', fontSize: 10, color: t.textMute, fontFamily: 'ui-monospace, monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon.Monitor width={10} height={10} style={{ color: t.accent }}/>
                <span>Маша начала демонстрацию</span>
              </div>
              <D_Message compact name="Маша" color="#d68b6c" time="11:08" text="гляньте редизайн профиля"/>
              <D_Message compact name="аня" color={t.accent} time="11:09" text="о, нравится! акцент чуть теплее можно?"/>
              <D_Message compact name="Лев" color="#7d9268" time="11:10" text="и сделай межстрочный больше"/>
              <D_Message compact name="Маша" color="#d68b6c" time="11:12" text="ок, минуту"/>
              <D_Message compact name="Соня" color="#c98870" time="11:14" text="можно я тоже поделюсь?"/>
              <D_Message compact name="аня" color={t.accent} time="11:14" text="давай"/>
            </div>
            <div style={{ padding: 10, borderTop: `1px solid ${t.border}` }}>
              <div style={{
                background: t.panelAlt, borderRadius: 4, padding: '6px 10px',
                fontSize: 11, color: t.textMute, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ flex: 1 }}>сообщение в звонок…</span>
                <span style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace' }}>⏎</span>
              </div>
            </div>
          </div>
        </div>
        {/* controls */}
        <div style={{
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6,
          borderTop: `1px solid ${t.border}`, background: t.panelAlt,
        }}>
          <DCtrl icon={<Icon.Mic width={13} height={13}/>} label="микро" active hot/>
          <DCtrl icon={<Icon.Headphones width={13} height={13}/>} label="звук" active/>
          <DCtrl icon={<Icon.Video width={13} height={13}/>} label="видео"/>
          <DCtrl icon={<Icon.Monitor width={13} height={13}/>} label="демо" warn/>
          <DCtrl icon={<Icon.Hand width={13} height={13}/>} label="рука"/>
          <DCtrl icon={<Icon.Sparkle width={11} height={11}/>} label="реакции"/>
          <DCtrl icon={<Icon.Settings width={13} height={13}/>} label="настр."/>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 10, color: t.textMute, fontFamily: 'ui-monospace, monospace', marginRight: 8 }}>
            CPU 12% · 234 mb · opus@48k
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            background: '#a93525', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            <Icon.PhoneOff width={12} height={12}/>
            выйти
          </div>
        </div>
      </div>
    </div>
  );
}

function DCtrl({ icon, label, active, warn, hot }) {
  const t = D_THEME;
  const bg = warn ? t.warm : hot ? t.accent : active ? t.panelHi : 'transparent';
  const color = warn || hot ? '#fff' : t.text;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
      background: bg, color, borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer',
      border: !warn && !hot && !active ? `1px solid ${t.border}` : '1px solid transparent',
    }}>{icon}{label}</div>
  );
}

window.VariantD_Chat = VariantD_Chat;
window.VariantD_Voice = VariantD_Voice;
