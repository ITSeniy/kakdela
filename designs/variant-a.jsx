// Вариант A — «Кухня»
// Тёплый крем + терракота. Классическая 3-панельная раскладка, мягкие тени, скругления.

const A_THEME = {
  bg: '#f4ebde',
  panel: '#faf5ec',
  panelAlt: '#f0e5d2',
  border: 'rgba(74, 50, 30, 0.08)',
  text: '#3a2f24',
  textSoft: '#7a6a5a',
  textMute: '#a89684',
  accent: '#c96442',
  accentSoft: '#e8a98c',
  online: '#7d9268',
  idle: '#d4a14a',
  font: '"Inter", -apple-system, system-ui, sans-serif',
  radius: 16,
  shadow: '0 1px 0 rgba(74,50,30,0.04), 0 8px 24px rgba(74,50,30,0.06)',
};

function A_ServerRail({ theme = A_THEME }) {
  return (
    <div style={{
      width: 76, background: theme.bg, display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '14px 0', gap: 12, borderRight: `1px solid ${theme.border}`,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14, background: theme.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#faf5ec', fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em',
        boxShadow: '0 4px 12px rgba(201, 100, 66, 0.3)',
      }}>КД</div>
      <div style={{ width: 32, height: 2, background: theme.border, borderRadius: 1 }}/>
      <ServerIcon label="Д" color="#a87b56" active ringColor={theme.accent} radius={14}/>
      <ServerIcon label="Б" color="#7d9268" radius={14}/>
      <ServerIcon label="ПК" color="#8d6e4d" radius={14}/>
      <ServerIcon label="С" color="#b88c4e" radius={14}/>
      <div style={{
        width: 44, height: 44, borderRadius: 14, border: `1.5px dashed ${theme.textMute}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textMute,
        cursor: 'pointer',
      }}><Icon.Plus width={18} height={18}/></div>
    </div>
  );
}

function A_ChannelList({ theme = A_THEME }) {
  const cats = [
    { name: 'добро пожаловать', items: [
      { type: 'text', name: 'привет', active: false },
      { type: 'text', name: 'правила', active: false },
    ]},
    { name: 'общение', items: [
      { type: 'text', name: 'болталка', unread: 12, active: true },
      { type: 'text', name: 'как-дела', mention: 2 },
      { type: 'text', name: 'кухня' },
      { type: 'text', name: 'настроение' },
    ]},
    { name: 'голосовые', items: [
      { type: 'voice', name: 'у камина', users: ['Аня', 'Лев', 'Маша'] },
      { type: 'voice', name: 'тихая комната' },
      { type: 'voice', name: 'совместный экран' },
    ]},
  ];
  return (
    <div style={{
      width: 256, background: theme.panel, display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${theme.border}`,
    }}>
      <div style={{
        padding: '16px 18px', borderBottom: `1px solid ${theme.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, letterSpacing: '-0.01em' }}>Друзья и кофе</div>
          <div style={{ fontSize: 11, color: theme.textSoft, marginTop: 2 }}>14 онлайн · 23 всего</div>
        </div>
        <Icon.Settings width={16} height={16} style={{ color: theme.textMute }}/>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: '12px 8px' }}>
        {cats.map(cat => (
          <div key={cat.name} style={{ marginBottom: 12 }}>
            <div style={{
              padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              color: theme.textMute, textTransform: 'uppercase',
            }}>{cat.name}</div>
            {cat.items.map(item => (
              <div key={item.name}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                  borderRadius: 10, fontSize: 13, color: item.active ? theme.text : theme.textSoft,
                  background: item.active ? '#f0e5d2' : 'transparent', fontWeight: item.active ? 600 : 500,
                  cursor: 'pointer', marginBottom: 1,
                }}>
                  {item.type === 'text' ? <Icon.Hash width={14} height={14}/> : <Icon.Speaker width={14} height={14}/>}
                  <span style={{ flex: 1 }}>{item.name}</span>
                  {item.unread && <span style={{
                    background: theme.accent, color: '#fff', fontSize: 10, fontWeight: 700,
                    padding: '1px 6px', borderRadius: 8,
                  }}>{item.unread}</span>}
                  {item.mention && <span style={{
                    background: '#e87060', color: '#fff', fontSize: 10, fontWeight: 700,
                    padding: '1px 6px', borderRadius: 8,
                  }}>@{item.mention}</span>}
                </div>
                {item.users && (
                  <div style={{ paddingLeft: 32, marginTop: 2, marginBottom: 4 }}>
                    {item.users.map((u, i) => (
                      <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', fontSize: 12, color: theme.textSoft }}>
                        <Avatar name={u} color={pickColor(i+1)} size={18}/>
                        <span>{u}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* user panel */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        background: theme.panelAlt, borderTop: `1px solid ${theme.border}`,
      }}>
        <Avatar name="Аня К" color="#c96442" size={34}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>Аня Котова</div>
          <div style={{ fontSize: 11, color: theme.online, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: theme.online }}/>
            варит кофе
          </div>
        </div>
        <Icon.Mic width={16} height={16} style={{ color: theme.textMute }}/>
        <Icon.Headphones width={16} height={16} style={{ color: theme.textMute }}/>
        <Icon.Settings width={16} height={16} style={{ color: theme.textMute }}/>
      </div>
    </div>
  );
}

function A_Message({ name, color, time, text, theme = A_THEME, reactions, attachment, replyTo }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 22px', alignItems: 'flex-start' }}>
      <Avatar name={name} color={color} size={36}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        {replyTo && (
          <div style={{ fontSize: 11, color: theme.textMute, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 8, borderTopLeftRadius: 4, borderTop: `1.5px solid ${theme.textMute}`, borderLeft: `1.5px solid ${theme.textMute}` }}/>
            в ответ {replyTo.name}: <span style={{ opacity: 0.7 }}>{replyTo.text}</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{name}</span>
          <span style={{ fontSize: 11, color: theme.textMute }}>{time}</span>
        </div>
        <div style={{ fontSize: 14, color: theme.text, marginTop: 2, lineHeight: 1.5 }}>{text}</div>
        {attachment && (
          <div style={{
            marginTop: 8, width: 280, height: 140, borderRadius: 12,
            background: `linear-gradient(135deg, ${theme.accentSoft}55, ${theme.accent}33)`,
            border: `1px solid ${theme.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.textSoft, fontSize: 12, fontFamily: 'ui-monospace, monospace',
          }}>{attachment}</div>
        )}
        {reactions && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {reactions.map((r, i) => (
              <div key={i} style={{
                background: theme.panelAlt, border: `1px solid ${theme.border}`,
                padding: '2px 8px', borderRadius: 12, fontSize: 12, color: theme.text,
                display: 'flex', alignItems: 'center', gap: 4,
              }}><span>{r.emoji}</span><span style={{ color: theme.textSoft, fontSize: 11 }}>{r.count}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function A_ChatPanel({ theme = A_THEME }) {
  return (
    <div style={{ flex: 1, background: theme.panel, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{
        padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${theme.border}`, background: theme.panel,
      }}>
        <Icon.Hash width={18} height={18} style={{ color: theme.textSoft }}/>
        <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>болталка</div>
        <div style={{ width: 1, height: 16, background: theme.border, margin: '0 4px' }}/>
        <div style={{ fontSize: 13, color: theme.textSoft }}>как ты сегодня? расскажи в двух словах</div>
        <div style={{ flex: 1 }}/>
        <Icon.Pin width={16} height={16} style={{ color: theme.textMute }}/>
        <Icon.Inbox width={16} height={16} style={{ color: theme.textMute }}/>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
          background: theme.panelAlt, borderRadius: 10,
        }}>
          <Icon.Search width={13} height={13} style={{ color: theme.textMute }}/>
          <span style={{ fontSize: 12, color: theme.textMute }}>искать</span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: '8px 0' }}>
        {/* greeting banner */}
        <div style={{
          margin: '0 22px 14px', padding: '14px 18px',
          background: `linear-gradient(135deg, ${theme.accentSoft}30, ${theme.accent}15)`,
          borderRadius: 14, border: `1px solid ${theme.accentSoft}40`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 28 }}>☕</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>Привет, Аня! Как ты сегодня?</div>
            <div style={{ fontSize: 12, color: theme.textSoft, marginTop: 2 }}>3 человека ждут ответа · в канал зашло 14 новых сообщений</div>
          </div>
        </div>
        <div style={{ padding: '4px 22px', fontSize: 11, color: theme.textMute, textAlign: 'center', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: theme.border }}/>
          <span>сегодня · 09:14</span>
          <div style={{ flex: 1, height: 1, background: theme.border }}/>
        </div>
        <A_Message name="Лев Морозов" color="#7d9268" time="09:14" text="доброе утро, котики 🌅 кто как спал?" theme={theme}/>
        <A_Message name="Маша Тёплая" color="#d68b6c" time="09:17" text="плохо, кот будил каждые два часа. но настроение бодрое — иду пить какао" theme={theme} reactions={[{emoji: '🐈', count: 4}, {emoji: '💜', count: 2}]}/>
        <A_Message name="Костя Дн" color="#a87b56" time="09:22" text="ребят, нашёл рецепт, как варить идеальный пуровер. вечером покажу на стриме" theme={theme} attachment="фото · pour-over.jpg" replyTo={{ name: 'Лев', text: 'кто-нибудь умеет варить хороший кофе?' }}/>
        <A_Message name="Аня Котова" color="#c96442" time="09:28" text="я ещё сплю наполовину, но уже думаю про обед. кто на созвон в 11?" theme={theme} reactions={[{emoji: '✋', count: 3}, {emoji: '☕', count: 5}]}/>
      </div>
      <div style={{ padding: '10px 22px 18px' }}>
        <div style={{
          background: theme.panelAlt, borderRadius: 14, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${theme.border}`,
        }}>
          <Icon.Plus width={18} height={18} style={{ color: theme.textMute }}/>
          <div style={{ flex: 1, fontSize: 13, color: theme.textMute }}>написать в #болталка…</div>
          <Icon.Smile width={18} height={18} style={{ color: theme.textMute }}/>
          <div style={{
            width: 32, height: 32, borderRadius: 10, background: theme.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}><Icon.Send width={14} height={14}/></div>
        </div>
        <div style={{ fontSize: 11, color: theme.textMute, marginTop: 6, paddingLeft: 8 }}>
          <span style={{ color: theme.accent, fontWeight: 600 }}>Маша</span> печатает…
        </div>
      </div>
    </div>
  );
}

function A_MemberList({ theme = A_THEME }) {
  const groups = [
    { title: 'хозяева · 2', members: [
      { name: 'Аня Котова', status: 'варит кофе', online: 'online', color: '#c96442' },
      { name: 'Лев Морозов', status: 'в #болталке', online: 'online', color: '#7d9268' },
    ]},
    { title: 'онлайн · 6', members: [
      { name: 'Маша Тёплая', status: 'пьёт какао', online: 'online', color: '#d68b6c' },
      { name: 'Костя Дн', status: 'на стриме ☕', online: 'online', color: '#a87b56' },
      { name: 'Юля С', status: 'отошла', online: 'idle', color: '#b88c4e' },
      { name: 'Тима Р', status: '', online: 'online', color: '#8d6e4d' },
      { name: 'Влад К', status: '', online: 'online', color: '#9c7f5e' },
      { name: 'Соня Н', status: 'не беспокоить', online: 'dnd', color: '#c98870' },
    ]},
    { title: 'не в сети · 14', members: [
      { name: 'Ира П', online: 'offline', color: '#a89684' },
      { name: 'Гена Х', online: 'offline', color: '#a89684' },
    ]},
  ];
  const dot = { online: theme.online, idle: theme.idle, dnd: theme.accent, offline: theme.textMute };
  return (
    <div style={{
      width: 256, background: theme.panel, borderLeft: `1px solid ${theme.border}`,
      padding: '14px 6px', overflow: 'hidden',
    }}>
      {groups.map(g => (
        <div key={g.title} style={{ marginBottom: 12 }}>
          <div style={{
            padding: '6px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            color: theme.textMute, textTransform: 'uppercase',
          }}>{g.title}</div>
          {g.members.map((m, i) => (
            <div key={m.name} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
              borderRadius: 10, cursor: 'pointer',
              opacity: m.online === 'offline' ? 0.5 : 1,
            }}>
              <div style={{ position: 'relative' }}>
                <Avatar name={m.name} color={m.color} size={30}/>
                <div style={{
                  position: 'absolute', bottom: -2, right: -2, width: 11, height: 11,
                  borderRadius: 6, background: dot[m.online], border: `2px solid ${theme.panel}`,
                }}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{m.name}</div>
                {m.status && <div style={{ fontSize: 11, color: theme.textSoft, marginTop: 1 }}>{m.status}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function VariantA_Chat() {
  return (
    <div style={{ width: '100%', height: '100%', background: A_THEME.bg, color: A_THEME.text, fontFamily: A_THEME.font, display: 'flex', overflow: 'hidden' }}>
      <A_ServerRail/><A_ChannelList/><A_ChatPanel/><A_MemberList/>
    </div>
  );
}

// === Голосовой канал с демонстрацией экрана ===
function A_StageTile({ name, color, kind, label, isShare, theme = A_THEME, speaking, muted }) {
  return (
    <div style={{
      position: 'relative', borderRadius: 16, overflow: 'hidden',
      background: theme.panelAlt, border: `2px solid ${speaking ? theme.accent : 'transparent'}`,
      boxShadow: theme.shadow,
    }}>
      {isShare ? (
        <SharePlaceholder kind={kind} label={label} bg="#23201c" fg="#f4ebde" stripe="#1a1814"/>
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, ${color}88, ${color}cc)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Avatar name={name} color={color} size={64} ring="#fff8" ringColor="#fff4"/>
        </div>
      )}
      <div style={{
        position: 'absolute', left: 10, bottom: 10, display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(20, 16, 12, 0.65)', padding: '4px 10px', borderRadius: 10,
        backdropFilter: 'blur(8px)',
      }}>
        {muted && <Icon.MicOff width={11} height={11} style={{ color: '#e87060' }}/>}
        <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{name}</span>
        {isShare && <span style={{ fontSize: 10, color: theme.accentSoft, fontWeight: 700, letterSpacing: '0.05em' }}>· ШЕРИНГ</span>}
      </div>
      {speaking && (
        <div style={{
          position: 'absolute', top: 10, right: 10, width: 22, height: 22,
          borderRadius: 11, background: theme.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon.Mic width={11} height={11} style={{ color: '#fff' }}/></div>
      )}
    </div>
  );
}

function A_VoiceChat({ theme = A_THEME }) {
  // sidebar live chat
  return (
    <div style={{
      width: 280, background: theme.panel, borderLeft: `1px solid ${theme.border}`,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon.Hash width={14} height={14} style={{ color: theme.textSoft }}/>чат звонка
        </div>
        <div style={{ fontSize: 11, color: theme.textSoft, marginTop: 2 }}>видно только участникам</div>
      </div>
      <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.text, marginBottom: 2 }}>Костя <span style={{ fontWeight: 400, color: theme.textMute, fontSize: 10 }}>· 11:04</span></div>
          <div style={{ fontSize: 12, color: theme.textSoft, lineHeight: 1.5 }}>смотрите сюда — баг был в роутере</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.text, marginBottom: 2 }}>Лев <span style={{ fontWeight: 400, color: theme.textMute, fontSize: 10 }}>· 11:05</span></div>
          <div style={{ fontSize: 12, color: theme.textSoft, lineHeight: 1.5 }}>ага, видно. а локально воспроизводится?</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.text, marginBottom: 2 }}>Костя <span style={{ fontWeight: 400, color: theme.textMute, fontSize: 10 }}>· 11:05</span></div>
          <div style={{ fontSize: 12, color: theme.textSoft, lineHeight: 1.5 }}>да, сейчас покажу. секунду</div>
        </div>
        <div style={{
          padding: '8px 10px', background: theme.panelAlt, borderRadius: 10, fontSize: 11, color: theme.textSoft,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon.Monitor width={12} height={12} style={{ color: theme.accent }}/>
          <span><b style={{ color: theme.text }}>Маша</b> начала демонстрацию <b style={{ color: theme.text }}>Figma</b></span>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.text, marginBottom: 2 }}>Маша <span style={{ fontWeight: 400, color: theme.textMute, fontSize: 10 }}>· 11:08</span></div>
          <div style={{ fontSize: 12, color: theme.textSoft, lineHeight: 1.5 }}>ребят, заодно гляньте редизайн профиля</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.text, marginBottom: 2 }}>Аня <span style={{ fontWeight: 400, color: theme.textMute, fontSize: 10 }}>· 11:09</span></div>
          <div style={{ fontSize: 12, color: theme.textSoft, lineHeight: 1.5 }}>о, мне нравится! только акцент чуть теплее можно?</div>
        </div>
      </div>
      <div style={{ padding: '10px 14px' }}>
        <div style={{
          background: theme.panelAlt, borderRadius: 10, padding: '8px 12px',
          fontSize: 12, color: theme.textMute, border: `1px solid ${theme.border}`,
        }}>сообщение в звонок…</div>
      </div>
    </div>
  );
}

function VariantA_Voice() {
  const theme = A_THEME;
  return (
    <div style={{ width: '100%', height: '100%', background: theme.bg, color: theme.text, fontFamily: theme.font, display: 'flex', overflow: 'hidden' }}>
      <A_ServerRail/>
      <A_ChannelList/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: `1px solid ${theme.border}`,
        }}>
          <Icon.Speaker width={18} height={18} style={{ color: theme.online }}/>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>у камина</div>
          <div style={{
            padding: '3px 10px', background: '#7d9268', color: '#fff',
            borderRadius: 8, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: '#fff' }}/>
            на связи · 5 чел.
          </div>
          <div style={{ fontSize: 12, color: theme.textSoft }}>32 минуты · сеть отличная</div>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 12, color: theme.textSoft }}>2 демонстрации</div>
        </div>
        <div style={{ flex: 1, padding: 20, display: 'flex', gap: 16, minHeight: 0 }}>
          {/* mosaic of shares */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12, minHeight: 0 }}>
            <div style={{ gridColumn: '1 / 3' }}>
              <A_StageTile name="Костя · экран" color="#a87b56" isShare kind="code" label="terminal · ssh prod-1"/>
            </div>
            <A_StageTile name="Маша · Figma" color="#d68b6c" isShare kind="design" label="Profile redesign v3"/>
            <A_StageTile name="Лев" color="#7d9268" speaking/>
          </div>
          {/* participant tiles */}
          <div style={{ width: 160, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.textMute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>участники · 5</div>
            <div style={{ aspectRatio: '4/3' }}><A_StageTile name="Аня" color="#c96442" muted/></div>
            <div style={{ aspectRatio: '4/3' }}><A_StageTile name="Соня" color="#c98870"/></div>
            <div style={{ aspectRatio: '4/3' }}><A_StageTile name="Юля" color="#b88c4e"/></div>
            <div style={{
              flex: 1, borderRadius: 16, border: `1.5px dashed ${theme.textMute}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 4, color: theme.textMute, fontSize: 11,
              minHeight: 60,
            }}>
              <Icon.Plus width={16} height={16}/>
              пригласить
            </div>
          </div>
        </div>
        {/* control bar */}
        <div style={{
          padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          borderTop: `1px solid ${theme.border}`,
        }}>
          <CtrlBtn icon={<Icon.Mic width={16} height={16}/>} label="микрофон" theme={theme} active/>
          <CtrlBtn icon={<Icon.Headphones width={16} height={16}/>} label="звук" theme={theme} active/>
          <CtrlBtn icon={<Icon.Video width={16} height={16}/>} label="видео" theme={theme}/>
          <CtrlBtn icon={<Icon.Monitor width={16} height={16}/>} label="экран" theme={theme} hot/>
          <CtrlBtn icon={<Icon.Hand width={16} height={16}/>} label="рука" theme={theme}/>
          <div style={{ width: 1, height: 28, background: theme.border, margin: '0 6px' }}/>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
            background: '#c0432f', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}>
            <Icon.PhoneOff width={14} height={14}/>
            выйти
          </div>
        </div>
      </div>
      <A_VoiceChat/>
    </div>
  );
}

function CtrlBtn({ icon, label, theme, active, hot }) {
  const bg = hot ? theme.accent : active ? theme.panelAlt : 'transparent';
  const color = hot ? '#fff' : active ? theme.text : theme.textSoft;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
      background: bg, color, borderRadius: 12, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      border: active && !hot ? `1px solid ${theme.border}` : '1px solid transparent',
    }}>{icon}{label}</div>
  );
}

window.VariantA_Chat = VariantA_Chat;
window.VariantA_Voice = VariantA_Voice;
window.CtrlBtn = CtrlBtn;
