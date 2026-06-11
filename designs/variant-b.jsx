// Вариант B — «Камин»
// Глубокий тёплый dark mode (тёмно-коричневый + охра). Топ-бар с серверами горизонтально вверху.
// Скругления умеренные, контраст выше, более «вечерний» уютный.

const B_THEME = {
  bg: '#1f1812',
  panel: '#2a201a',
  panelAlt: '#33271f',
  panelHi: '#3d2f24',
  border: 'rgba(232, 195, 140, 0.08)',
  text: '#f4ebde',
  textSoft: '#c9b89a',
  textMute: '#8a7660',
  accent: '#e8a05c',
  accentDeep: '#c87a3a',
  online: '#a8c068',
  idle: '#e8c060',
  font: '"Inter", -apple-system, system-ui, sans-serif',
  radius: 12,
};

function B_TopBar() {
  const t = B_THEME;
  return (
    <div style={{
      height: 56, background: t.bg, display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 8, borderBottom: `1px solid ${t.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 18, borderRight: `1px solid ${t.border}`, marginRight: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, background: t.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: t.bg, fontWeight: 800, fontSize: 14, letterSpacing: '-0.04em',
        }}>КД</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, lineHeight: 1 }}>Как дела?</div>
          <div style={{ fontSize: 10, color: t.textMute, marginTop: 2 }}>v 1.4 · open beta</div>
        </div>
      </div>
      {[
        { l: 'Д', name: 'Друзья и кофе', active: true, color: t.accent },
        { l: 'Б', name: 'Бук-клуб', color: '#7d9268' },
        { l: 'ПК', name: 'Полночный код', color: '#a87b56' },
        { l: 'С', name: 'Соседи', color: '#b88c4e' },
        { l: 'Х', name: 'Хор', color: '#9c7f5e' },
      ].map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
          borderRadius: 10, cursor: 'pointer',
          background: s.active ? t.panelAlt : 'transparent',
          border: s.active ? `1px solid ${t.accent}40` : '1px solid transparent',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, background: s.color,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>{s.l}</div>
          <span style={{ fontSize: 12, color: s.active ? t.text : t.textSoft, fontWeight: s.active ? 600 : 500 }}>{s.name}</span>
        </div>
      ))}
      <div style={{
        width: 30, height: 30, borderRadius: 9, border: `1.5px dashed ${t.textMute}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMute,
      }}><Icon.Plus width={14} height={14}/></div>
      <div style={{ flex: 1 }}/>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
        background: t.panelAlt, borderRadius: 10, width: 220,
      }}>
        <Icon.Search width={13} height={13} style={{ color: t.textMute }}/>
        <span style={{ fontSize: 12, color: t.textMute }}>искать везде…</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 5px', background: t.panelHi, color: t.textMute, borderRadius: 4 }}>⌘K</span>
      </div>
      <Icon.Inbox width={16} height={16} style={{ color: t.textSoft, marginLeft: 8 }}/>
      <div style={{ position: 'relative' }}>
        <Avatar name="Аня К" color={t.accentDeep} size={32}/>
        <div style={{
          position: 'absolute', bottom: -2, right: -2, width: 11, height: 11,
          borderRadius: 6, background: t.online, border: `2px solid ${t.bg}`,
        }}/>
      </div>
    </div>
  );
}

function B_ChannelList() {
  const t = B_THEME;
  const cats = [
    { name: 'добро пожаловать', collapsed: false, items: [
      { name: 'привет' }, { name: 'правила' },
    ]},
    { name: 'общение', items: [
      { name: 'болталка', unread: 12, active: true },
      { name: 'как-дела', mention: 2 },
      { name: 'кухня' }, { name: 'настроение' }, { name: 'мемы-и-картинки' },
    ]},
    { name: 'тематические', items: [
      { name: 'книги' }, { name: 'игры' }, { name: 'код' },
    ]},
    { name: 'голосовые', voice: true, items: [
      { name: 'у камина', active: false, users: ['Лев', 'Маша', 'Костя', 'Соня'] },
      { name: 'тихая комната' },
      { name: 'совместный экран' },
    ]},
  ];
  return (
    <div style={{
      width: 240, background: t.panel, display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${t.border}`,
    }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 11, color: t.textMute, fontWeight: 600 }}>сервер</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          Друзья и кофе
          <Icon.Sparkle width={12} height={12} style={{ color: t.accent }}/>
        </div>
        <div style={{ fontSize: 10, color: t.textMute, marginTop: 2 }}>14 онлайн · уютно</div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: '10px 6px' }}>
        {cats.map(cat => (
          <div key={cat.name} style={{ marginBottom: 10 }}>
            <div style={{
              padding: '4px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              color: t.textMute, textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 8 }}>▼</span>{cat.name}
            </div>
            {cat.items.map(it => (
              <div key={it.name}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
                  borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  color: it.active ? t.text : t.textSoft, fontWeight: it.active ? 600 : 500,
                  background: it.active ? t.panelHi : 'transparent',
                  borderLeft: it.active ? `3px solid ${t.accent}` : '3px solid transparent',
                  paddingLeft: it.active ? 7 : 10,
                }}>
                  {cat.voice ? <Icon.Speaker width={13} height={13}/> : <Icon.Hash width={13} height={13}/>}
                  <span style={{ flex: 1 }}>{it.name}</span>
                  {it.unread && <span style={{ fontSize: 10, fontWeight: 700, color: t.accent }}>{it.unread}</span>}
                  {it.mention && <span style={{
                    background: t.accentDeep, color: '#fff', fontSize: 10, fontWeight: 700,
                    padding: '1px 6px', borderRadius: 8,
                  }}>{it.mention}</span>}
                </div>
                {it.users && (
                  <div style={{ paddingLeft: 30, marginTop: 3, marginBottom: 4, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {it.users.map((u, i) => (
                      <div key={u} title={u} style={{ position: 'relative' }}>
                        <Avatar name={u} color={pickColor(i+2)} size={20}/>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        background: t.panelAlt, borderTop: `1px solid ${t.border}`,
      }}>
        <Avatar name="Аня К" color={t.accentDeep} size={30}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>аня</div>
          <div style={{ fontSize: 10, color: t.online }}>дома · #1284</div>
        </div>
        <Icon.MicOff width={14} height={14} style={{ color: '#e87060' }}/>
        <Icon.Headphones width={14} height={14} style={{ color: t.textSoft }}/>
      </div>
    </div>
  );
}

function B_Message({ name, color, time, text, role, reactions }) {
  const t = B_THEME;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 24px 6px 24px', alignItems: 'flex-start' }}>
      <Avatar name={name} color={color} size={34}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: role === 'mod' ? t.accent : t.text }}>{name}</span>
          {role === 'mod' && <span style={{
            fontSize: 9, padding: '1px 5px', background: `${t.accent}25`, color: t.accent,
            borderRadius: 4, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>хозяин</span>}
          <span style={{ fontSize: 11, color: t.textMute }}>{time}</span>
        </div>
        <div style={{ fontSize: 14, color: t.text, marginTop: 2, lineHeight: 1.5 }}>{text}</div>
        {reactions && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {reactions.map((r, i) => (
              <div key={i} style={{
                background: t.panelHi, border: `1px solid ${t.border}`,
                padding: '2px 8px', borderRadius: 10, fontSize: 12, color: t.text,
                display: 'flex', alignItems: 'center', gap: 4,
              }}><span>{r.emoji}</span><span style={{ color: t.textSoft, fontSize: 11 }}>{r.count}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function B_ChatPanel() {
  const t = B_THEME;
  return (
    <div style={{ flex: 1, background: t.bg, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${t.border}`,
      }}>
        <Icon.Hash width={18} height={18} style={{ color: t.accent }}/>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>болталка</div>
        <div style={{ width: 1, height: 16, background: t.border, margin: '0 4px' }}/>
        <div style={{ fontSize: 13, color: t.textSoft }}>наш домашний разговор у огня</div>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', gap: 14, color: t.textMute }}>
          <Icon.Pin width={16} height={16}/>
          <Icon.Inbox width={16} height={16}/>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: '14px 0' }}>
        <div style={{ padding: '0 24px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ height: 1, flex: 1, background: t.border }}/>
          <span style={{ fontSize: 10, color: t.textMute, letterSpacing: '0.06em', textTransform: 'uppercase' }}>сегодня · вторник</span>
          <div style={{ height: 1, flex: 1, background: t.border }}/>
        </div>
        <B_Message name="Лев Морозов" color="#7d9268" time="20:14" text="хорошо вечером со всеми. поставил чай" role="mod" reactions={[{emoji:'🫖',count:3}]}/>
        <B_Message name="Костя Дн" color="#a87b56" time="20:18" text="у меня глинтвейн варится. кто за созвон через 10 минут?" reactions={[{emoji:'🍷',count:5},{emoji:'🔥',count:2}]}/>
        <B_Message name="Маша Тёплая" color="#d68b6c" time="20:21" text="я с ноутом, могу даже редизайн показать. но обещайте быть нежными ☺️"/>
        <B_Message name="Аня Котова" color={t.accentDeep} time="20:23" text="буду через минуту. варю кофе на потом" role="mod"/>
        <B_Message name="Соня Н" color="#c98870" time="20:26" text="а у меня кот лёг на клавиатуру. ggggggggggg"/>
        <div style={{
          margin: '10px 24px', padding: '10px 14px', background: t.panelAlt,
          borderRadius: t.radius, border: `1px solid ${t.accent}30`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Icon.Speaker width={16} height={16} style={{ color: t.accent }}/>
          <div style={{ flex: 1, fontSize: 13, color: t.text }}>звонок в <b>у камина</b> — 4 человека</div>
          <div style={{
            padding: '5px 12px', background: t.accent, color: t.bg, borderRadius: 8,
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>присоединиться</div>
        </div>
      </div>
      <div style={{ padding: '12px 24px 18px' }}>
        <div style={{
          background: t.panelAlt, borderRadius: t.radius, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${t.border}`,
        }}>
          <Icon.Plus width={18} height={18} style={{ color: t.textMute }}/>
          <div style={{ flex: 1, fontSize: 13, color: t.textMute }}>напиши что-нибудь хорошее в #болталка…</div>
          <Icon.Smile width={18} height={18} style={{ color: t.textMute }}/>
          <Icon.Send width={18} height={18} style={{ color: t.accent }}/>
        </div>
      </div>
    </div>
  );
}

function B_MemberList() {
  const t = B_THEME;
  const groups = [
    { title: 'у огня сейчас', subtitle: '4 человека в голосовом', members: [
      { name: 'Лев Морозов', status: 'на связи', online: 'voice', color: '#7d9268', mic: true },
      { name: 'Маша Тёплая', status: 'демонстрирует', online: 'voice', color: '#d68b6c', share: true },
      { name: 'Костя Дн', status: 'на связи', online: 'voice', color: '#a87b56', mic: true },
      { name: 'Соня Н', status: 'микрофон выкл.', online: 'voice', color: '#c98870', muted: true },
    ]},
    { title: 'онлайн', members: [
      { name: 'Юля С', status: 'отошла', online: 'idle', color: '#b88c4e' },
      { name: 'Тима Р', status: '', online: 'online', color: '#8d6e4d' },
      { name: 'Влад К', status: 'играет в Hades', online: 'online', color: '#9c7f5e' },
    ]},
  ];
  const dot = { online: t.online, idle: t.idle, voice: t.accent, dnd: '#e87060' };
  return (
    <div style={{
      width: 260, background: t.panel, borderLeft: `1px solid ${t.border}`,
      padding: '14px 10px', overflow: 'hidden',
    }}>
      {groups.map(g => (
        <div key={g.title} style={{ marginBottom: 14 }}>
          <div style={{ padding: '4px 10px 6px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: t.accent, textTransform: 'uppercase' }}>{g.title}</div>
            {g.subtitle && <div style={{ fontSize: 10, color: t.textMute, marginTop: 2 }}>{g.subtitle}</div>}
          </div>
          {g.members.map(m => (
            <div key={m.name} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
              borderRadius: 8, cursor: 'pointer',
              background: m.online === 'voice' ? t.panelAlt : 'transparent',
              border: m.online === 'voice' ? `1px solid ${t.accent}25` : '1px solid transparent',
              marginBottom: 2,
            }}>
              <div style={{ position: 'relative' }}>
                <Avatar name={m.name} color={m.color} size={28}/>
                <div style={{
                  position: 'absolute', bottom: -2, right: -2, width: 10, height: 10,
                  borderRadius: 5, background: dot[m.online], border: `2px solid ${t.panel}`,
                }}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{m.name}</div>
                {m.status && <div style={{ fontSize: 10, color: t.textSoft }}>{m.status}</div>}
              </div>
              {m.mic && <Icon.Mic width={11} height={11} style={{ color: t.online }}/>}
              {m.muted && <Icon.MicOff width={11} height={11} style={{ color: '#e87060' }}/>}
              {m.share && <Icon.Monitor width={11} height={11} style={{ color: t.accent }}/>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function VariantB_Chat() {
  return (
    <div style={{ width: '100%', height: '100%', background: B_THEME.bg, color: B_THEME.text, fontFamily: B_THEME.font, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <B_TopBar/>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <B_ChannelList/>
        <B_ChatPanel/>
        <B_MemberList/>
      </div>
    </div>
  );
}

// === Voice/Screenshare ===
function B_StageTile({ name, color, kind, label, isShare, speaking, muted }) {
  const t = B_THEME;
  return (
    <div style={{
      position: 'relative', borderRadius: t.radius, overflow: 'hidden',
      background: t.panelAlt,
      boxShadow: speaking ? `0 0 0 2px ${t.accent}, 0 8px 24px ${t.accent}25` : `0 4px 16px rgba(0,0,0,0.3)`,
    }}>
      {isShare ? (
        <SharePlaceholder kind={kind} label={label} bg="#15110d" fg="#f4ebde" stripe="#0d0a08"/>
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, ${color}cc, ${color}88)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Avatar name={name} color={color} size={56} ring="#fff8" ringColor="#fff4"/>
        </div>
      )}
      <div style={{
        position: 'absolute', left: 8, bottom: 8, display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(15, 11, 8, 0.75)', padding: '3px 8px', borderRadius: 8,
      }}>
        {muted && <Icon.MicOff width={10} height={10} style={{ color: '#e87060' }}/>}
        <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{name}</span>
        {isShare && <span style={{ fontSize: 9, color: t.accent, fontWeight: 700 }}>· LIVE</span>}
      </div>
    </div>
  );
}

function VariantB_Voice() {
  const t = B_THEME;
  return (
    <div style={{ width: '100%', height: '100%', background: t.bg, color: t.text, fontFamily: t.font, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <B_TopBar/>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <B_ChannelList/>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: t.bg }}>
          <div style={{
            padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: `1px solid ${t.border}`,
          }}>
            <Icon.Speaker width={18} height={18} style={{ color: t.accent }}/>
            <div style={{ fontSize: 15, fontWeight: 700 }}>у камина</div>
            <div style={{
              padding: '3px 10px', background: `${t.accent}20`, color: t.accent, border: `1px solid ${t.accent}40`,
              borderRadius: 8, fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: t.accent }}/>
              4 на связи
            </div>
            <div style={{ fontSize: 12, color: t.textSoft }}>00:32:14 · 2 демонстрации</div>
            <div style={{ flex: 1 }}/>
            <div style={{ display: 'flex', gap: 4, padding: 3, background: t.panel, borderRadius: 8, border: `1px solid ${t.border}` }}>
              {['мозаика', 'фокус', 'сетка'].map((m, i) => (
                <div key={m} style={{
                  padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6,
                  background: i === 0 ? t.panelHi : 'transparent',
                  color: i === 0 ? t.text : t.textSoft, cursor: 'pointer',
                }}>{m}</div>
              ))}
            </div>
          </div>
          {/* Mosaic stage */}
          <div style={{ flex: 1, padding: '16px 20px', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* shares — 2 columns */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minHeight: 0 }}>
              <B_StageTile name="Костя · код" color="#a87b56" isShare kind="code" label="terminal · ssh prod-1.kakdela"/>
              <B_StageTile name="Маша · Figma" color="#d68b6c" isShare kind="design" label="Profile redesign v3.fig"/>
            </div>
            {/* participants row */}
            <div style={{ display: 'flex', gap: 10, height: 130 }}>
              <div style={{ flex: 1, position: 'relative' }}><B_StageTile name="Лев" color="#7d9268" speaking/></div>
              <div style={{ flex: 1, position: 'relative' }}><B_StageTile name="Костя" color="#a87b56"/></div>
              <div style={{ flex: 1, position: 'relative' }}><B_StageTile name="Маша" color="#d68b6c"/></div>
              <div style={{ flex: 1, position: 'relative' }}><B_StageTile name="Соня" color="#c98870" muted/></div>
            </div>
          </div>
          {/* controls */}
          <div style={{
            padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
            borderTop: `1px solid ${t.border}`, background: t.panel,
          }}>
            <div style={{ fontSize: 11, color: t.textMute }}>
              <span style={{ color: t.online }}>●</span> сеть отличная · 24 кбит/с · 38 мс
            </div>
            <div style={{ flex: 1 }}/>
            <BCtrl icon={<Icon.Mic width={15} height={15}/>} active/>
            <BCtrl icon={<Icon.Headphones width={15} height={15}/>} active/>
            <BCtrl icon={<Icon.Video width={15} height={15}/>}/>
            <BCtrl icon={<Icon.Monitor width={15} height={15}/>} hot/>
            <BCtrl icon={<Icon.Hand width={15} height={15}/>}/>
            <BCtrl icon={<Icon.Settings width={15} height={15}/>}/>
            <div style={{ width: 1, height: 24, background: t.border, margin: '0 4px' }}/>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              background: '#a93525', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <Icon.PhoneOff width={14} height={14}/>
              положить трубку
            </div>
            <div style={{ flex: 1 }}/>
            <div style={{ fontSize: 11, color: t.textMute }}>демонстрирую <b style={{ color: t.accent }}>экран целиком</b></div>
          </div>
        </div>
        <B_MemberList/>
      </div>
    </div>
  );
}

function BCtrl({ icon, active, hot }) {
  const t = B_THEME;
  const bg = hot ? t.accent : active ? t.panelHi : 'transparent';
  const color = hot ? t.bg : t.text;
  return (
    <div style={{
      width: 38, height: 38, borderRadius: 10, background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      border: active && !hot ? `1px solid ${t.border}` : '1px solid transparent',
    }}>{icon}</div>
  );
}

window.VariantB_Chat = VariantB_Chat;
window.VariantB_Voice = VariantB_Voice;
