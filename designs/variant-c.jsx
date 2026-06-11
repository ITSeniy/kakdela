// Вариант C — «Чайхана»
// Очень светлый, почти молочный фон, плавающие панели с большими отступами,
// крупные скругления, минимум разделителей. Дружелюбный и тихий.

const C_THEME = {
  bg: '#fbf5ec',
  panel: '#ffffff',
  panelSoft: '#f7eedd',
  border: 'rgba(120, 90, 60, 0.08)',
  text: '#3d2e22',
  textSoft: '#8a7660',
  textMute: '#b6a48a',
  accent: '#d68b6c',
  accentSoft: '#f4d4c2',
  online: '#8aa472',
  font: '"Inter", -apple-system, system-ui, sans-serif',
  radius: 22,
  shadow: '0 1px 0 rgba(120,90,60,0.04), 0 10px 30px rgba(120,90,60,0.08)',
};

// Раскладка C: 4 столбца, всё в плавающих карточках с большими отступами
function C_ServerDock() {
  const t = C_THEME;
  return (
    <div style={{
      width: 90, padding: '20px 0', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 18, background: t.accent,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em',
        boxShadow: '0 8px 20px rgba(214, 139, 108, 0.35)',
      }}>КД</div>
      <div style={{
        background: t.panel, borderRadius: 22, padding: 8, display: 'flex',
        flexDirection: 'column', gap: 8, boxShadow: t.shadow,
      }}>
        {[
          { l: 'Д', c: t.accent, active: true },
          { l: 'Б', c: '#7d9268' },
          { l: 'ПК', c: '#a87b56' },
          { l: 'С', c: '#b88c4e' },
          { l: 'Х', c: '#9c7f5e' },
        ].map((s, i) => (
          <div key={i} style={{
            width: 44, height: 44, borderRadius: 14, background: s.c,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: s.active ? `0 0 0 2.5px ${t.bg}, 0 0 0 4.5px ${t.accent}` : undefined,
          }}>{s.l}</div>
        ))}
        <div style={{
          width: 44, height: 44, borderRadius: 14, border: `1.5px dashed ${t.textMute}`,
          color: t.textMute, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}><Icon.Plus width={16} height={16}/></div>
      </div>
    </div>
  );
}

function C_ChannelCard() {
  const t = C_THEME;
  const cats = [
    { name: 'общение', items: [
      { name: 'болталка', unread: 12, active: true },
      { name: 'как-дела', mention: 2 },
      { name: 'кухня' }, { name: 'настроение' },
    ]},
    { name: 'голосовые', voice: true, items: [
      { name: 'у камина', users: 4 },
      { name: 'тихая комната' },
      { name: 'совместный экран' },
    ]},
    { name: 'личные', items: [
      { name: 'Лев', dm: true }, { name: 'Маша', dm: true, unread: 1 },
    ]},
  ];
  return (
    <div style={{
      flex: 1, background: t.panel, borderRadius: t.radius,
      padding: '20px 16px', display: 'flex', flexDirection: 'column',
      boxShadow: t.shadow, minHeight: 0,
    }}>
      <div style={{ padding: '0 8px 14px' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>Друзья и кофе</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: t.online }}/>
          <span style={{ fontSize: 11, color: t.textSoft }}>14 онлайн · уютно сегодня</span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {cats.map(cat => (
          <div key={cat.name} style={{ marginBottom: 14 }}>
            <div style={{
              padding: '4px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              color: t.textMute, textTransform: 'uppercase',
            }}>{cat.name}</div>
            {cat.items.map(it => (
              <div key={it.name} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                borderRadius: 14, fontSize: 13, cursor: 'pointer', marginBottom: 2,
                color: it.active ? '#fff' : t.text,
                background: it.active ? t.accent : 'transparent',
                fontWeight: it.active ? 600 : 500,
              }}>
                {it.dm ? <Avatar name={it.name} color={pickColor(it.name.length)} size={20}/>
                  : cat.voice ? <Icon.Speaker width={14} height={14}/>
                  : <Icon.Hash width={14} height={14}/>}
                <span style={{ flex: 1 }}>{it.name}</span>
                {it.users && <span style={{ fontSize: 11, color: it.active ? '#fff' : t.online, fontWeight: 600 }}>{it.users} 🪑</span>}
                {it.unread && <span style={{
                  background: it.active ? '#fff' : t.accent, color: it.active ? t.accent : '#fff',
                  fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 8,
                }}>{it.unread}</span>}
                {it.mention && <span style={{
                  background: '#e87060', color: '#fff', fontSize: 10, fontWeight: 700,
                  padding: '1px 7px', borderRadius: 8,
                }}>@{it.mention}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px',
        background: t.panelSoft, borderRadius: 14, marginTop: 8,
      }}>
        <Avatar name="Аня К" color={t.accent} size={32}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>аня</div>
          <div style={{ fontSize: 10, color: t.textSoft, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: t.online }}/>
            варит кофе ☕
          </div>
        </div>
        <Icon.Settings width={14} height={14} style={{ color: t.textMute }}/>
      </div>
    </div>
  );
}

function C_Bubble({ name, color, time, text, side = 'left', reactions, attachment }) {
  const t = C_THEME;
  const isMine = side === 'right';
  return (
    <div style={{ display: 'flex', gap: 10, flexDirection: isMine ? 'row-reverse' : 'row', padding: '4px 4px', alignItems: 'flex-end' }}>
      <Avatar name={name} color={color} size={32}/>
      <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, padding: '0 4px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{name}</span>
          <span style={{ fontSize: 10, color: t.textMute }}>{time}</span>
        </div>
        <div style={{
          padding: '10px 14px',
          background: isMine ? t.accent : t.panelSoft,
          color: isMine ? '#fff' : t.text,
          borderRadius: 18, borderTopLeftRadius: isMine ? 18 : 6, borderTopRightRadius: isMine ? 6 : 18,
          fontSize: 13.5, lineHeight: 1.5,
        }}>{text}</div>
        {attachment && (
          <div style={{
            marginTop: 6, width: 220, height: 110, borderRadius: 14,
            background: `linear-gradient(135deg, ${t.accentSoft}, ${t.accent}55)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: t.text, fontSize: 11, fontFamily: 'ui-monospace, monospace',
          }}>{attachment}</div>
        )}
        {reactions && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {reactions.map((r, i) => (
              <div key={i} style={{
                background: '#fff', boxShadow: t.shadow,
                padding: '3px 9px', borderRadius: 12, fontSize: 12, color: t.text,
                display: 'flex', alignItems: 'center', gap: 4,
              }}><span>{r.emoji}</span><span style={{ color: t.textSoft, fontSize: 11 }}>{r.count}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function C_ChatCard() {
  const t = C_THEME;
  return (
    <div style={{
      flex: 2.2, background: t.panel, borderRadius: t.radius,
      display: 'flex', flexDirection: 'column', boxShadow: t.shadow, minWidth: 0, minHeight: 0,
    }}>
      <div style={{
        padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${t.border}`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 12, background: t.accentSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accent,
        }}><Icon.Hash width={16} height={16}/></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>болталка</div>
          <div style={{ fontSize: 11, color: t.textSoft }}>как ты сегодня? расскажи в двух словах</div>
        </div>
        <div style={{ display: 'flex', gap: 14, color: t.textMute }}>
          <Icon.Search width={16} height={16}/>
          <Icon.Pin width={16} height={16}/>
          <Icon.Inbox width={16} height={16}/>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          alignSelf: 'center', padding: '4px 12px', background: t.panelSoft,
          borderRadius: 10, fontSize: 10, color: t.textSoft, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4,
        }}>сегодня</div>
        <C_Bubble name="Лев" color="#7d9268" time="09:14" text="доброе утро 🌅 как все?"/>
        <C_Bubble name="Маша" color="#d68b6c" time="09:17" text="кот будил каждые два часа, но настроение бодрое ☕" reactions={[{emoji:'🐈',count:4}]}/>
        <C_Bubble name="Костя" color="#a87b56" time="09:22" text="ребят, нашёл, как варить идеальный пуровер. вечером покажу" attachment="pour-over.jpg · 1.2 mb"/>
        <C_Bubble name="аня" color={t.accent} time="09:28" text="я ещё сплю наполовину, но уже думаю про обед :)" side="right" reactions={[{emoji:'☕',count:3},{emoji:'💜',count:2}]}/>
        <C_Bubble name="Соня" color="#c98870" time="09:30" text="кто на созвон в 11? у меня готов прототип"/>
      </div>
      <div style={{ padding: '14px 24px 20px' }}>
        <div style={{
          background: t.panelSoft, borderRadius: 18, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Icon.Plus width={18} height={18} style={{ color: t.textMute }}/>
          <div style={{ flex: 1, fontSize: 13, color: t.textMute }}>как ты сегодня? расскажи…</div>
          <Icon.Smile width={18} height={18} style={{ color: t.textMute }}/>
          <div style={{
            width: 36, height: 36, borderRadius: 12, background: t.accent,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 14px ${t.accent}55`,
          }}><Icon.Send width={15} height={15}/></div>
        </div>
      </div>
    </div>
  );
}

function C_MembersCard() {
  const t = C_THEME;
  return (
    <div style={{
      flex: 0.9, background: t.panel, borderRadius: t.radius,
      padding: '20px 12px', boxShadow: t.shadow, minHeight: 0, overflow: 'hidden',
    }}>
      <div style={{ padding: '0 10px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>кто здесь сегодня</div>
        <div style={{ fontSize: 11, color: t.textSoft, marginTop: 2 }}>14 человек заглянули</div>
      </div>
      {/* mini voice room card */}
      <div style={{
        margin: '0 4px 14px', padding: '12px', background: `linear-gradient(135deg, ${t.accentSoft}, ${t.accent}33)`,
        borderRadius: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Icon.Speaker width={13} height={13} style={{ color: t.accent }}/>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.text }}>у камина</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: t.textSoft }}>4 чел.</span>
        </div>
        <div style={{ display: 'flex', marginLeft: 0 }}>
          {['Лев', 'Маша', 'Костя', 'Соня'].map((n, i) => (
            <div key={n} style={{ marginLeft: i === 0 ? 0 : -8 }}>
              <Avatar name={n} color={pickColor(i+1)} size={26} ring={t.panel} ringColor={t.panel}/>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 10, padding: '6px', background: '#fff', borderRadius: 10,
          fontSize: 11, fontWeight: 600, color: t.accent, textAlign: 'center', cursor: 'pointer',
        }}>зайти на огонёк →</div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: t.textMute, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px' }}>онлайн · 6</div>
      {[
        { n: 'Лев', s: '#болталка', c: '#7d9268' },
        { n: 'Костя', s: 'на стриме ☕', c: '#a87b56' },
        { n: 'Юля', s: 'отошла', c: '#b88c4e', idle: true },
        { n: 'Тима', s: '', c: '#8d6e4d' },
        { n: 'Влад', s: 'играет в Hades', c: '#9c7f5e' },
        { n: 'Соня', s: 'не беспокоить', c: '#c98870', dnd: true },
      ].map(m => (
        <div key={m.n} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
          borderRadius: 12, cursor: 'pointer',
        }}>
          <div style={{ position: 'relative' }}>
            <Avatar name={m.n} color={m.c} size={28}/>
            <div style={{
              position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5,
              background: m.idle ? '#d4a14a' : m.dnd ? '#e87060' : t.online,
              border: `2px solid ${t.panel}`,
            }}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>{m.n}</div>
            {m.s && <div style={{ fontSize: 10, color: t.textSoft }}>{m.s}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function VariantC_Chat() {
  const t = C_THEME;
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text, fontFamily: t.font,
      display: 'flex', gap: 16, padding: 16, overflow: 'hidden',
    }}>
      <C_ServerDock/>
      <C_ChannelCard/>
      <C_ChatCard/>
      <C_MembersCard/>
    </div>
  );
}

// === Voice/Screenshare ===
function C_StageTile({ name, color, kind, label, isShare, speaking, muted }) {
  const t = C_THEME;
  return (
    <div style={{
      position: 'relative', borderRadius: 18, overflow: 'hidden',
      background: '#23201c',
      boxShadow: speaking ? `0 0 0 3px ${t.accent}, 0 12px 30px rgba(214,139,108,0.25)` : t.shadow,
    }}>
      {isShare ? (
        <SharePlaceholder kind={kind} label={label} bg="#1d1a16" fg="#fbf5ec" stripe="#15120f"/>
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, ${color}, ${color}aa)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Avatar name={name} color={color} size={64} ring="rgba(255,255,255,0.3)" ringColor="rgba(255,255,255,0.15)"/>
        </div>
      )}
      <div style={{
        position: 'absolute', left: 10, bottom: 10,
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(255,255,255,0.95)', padding: '5px 10px', borderRadius: 10,
      }}>
        {muted && <Icon.MicOff width={11} height={11} style={{ color: '#e87060' }}/>}
        <span style={{ fontSize: 11, color: t.text, fontWeight: 600 }}>{name}</span>
        {isShare && <span style={{ fontSize: 9, color: t.accent, fontWeight: 700 }}>· шеринг</span>}
      </div>
    </div>
  );
}

function C_VoiceMain() {
  const t = C_THEME;
  return (
    <div style={{
      flex: 1, background: t.panel, borderRadius: t.radius,
      display: 'flex', flexDirection: 'column', boxShadow: t.shadow, minWidth: 0, minHeight: 0,
    }}>
      <div style={{
        padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${t.border}`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 12, background: t.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}><Icon.Speaker width={16} height={16}/></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>у камина</div>
          <div style={{ fontSize: 11, color: t.textSoft }}>5 на связи · 32 минуты · сеть отличная</div>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 3, background: t.panelSoft, borderRadius: 10 }}>
          {['мозаика', 'фокус'].map((m, i) => (
            <div key={m} style={{
              padding: '5px 12px', fontSize: 11, fontWeight: 600, borderRadius: 8,
              background: i === 0 ? '#fff' : 'transparent',
              color: i === 0 ? t.text : t.textSoft, cursor: 'pointer',
              boxShadow: i === 0 ? t.shadow : 'none',
            }}>{m}</div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: '20px 24px', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1, minHeight: 0 }}>
          <C_StageTile name="Костя · код" color="#a87b56" isShare kind="code" label="terminal · ssh prod-1"/>
          <C_StageTile name="Маша · Figma" color="#d68b6c" isShare kind="design" label="Profile redesign v3"/>
        </div>
        <div style={{ display: 'flex', gap: 10, height: 96 }}>
          {[
            { n: 'Лев', c: '#7d9268', speaking: true },
            { n: 'Костя', c: '#a87b56' },
            { n: 'Маша', c: '#d68b6c' },
            { n: 'Соня', c: '#c98870', muted: true },
            { n: 'аня', c: t.accent },
          ].map(p => (
            <div key={p.n} style={{ flex: 1 }}><C_StageTile {...p} name={p.n} color={p.c}/></div>
          ))}
        </div>
      </div>
      <div style={{
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderTop: `1px solid ${t.border}`,
      }}>
        <CCtrl icon={<Icon.Mic width={16} height={16}/>} active label="микро"/>
        <CCtrl icon={<Icon.Headphones width={16} height={16}/>} active label="звук"/>
        <CCtrl icon={<Icon.Video width={16} height={16}/>} label="видео"/>
        <CCtrl icon={<Icon.Monitor width={16} height={16}/>} hot label="экран"/>
        <CCtrl icon={<Icon.Hand width={16} height={16}/>} label="рука"/>
        <CCtrl icon={<Icon.Sparkle width={14} height={14}/>} label="реакция"/>
        <div style={{ width: 1, height: 26, background: t.border, margin: '0 6px' }}/>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
          background: '#fff', border: `1.5px solid #e87060`, color: '#c0432f',
          borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <Icon.PhoneOff width={14} height={14}/>
          уйти тихо
        </div>
      </div>
    </div>
  );
}

function CCtrl({ icon, label, active, hot }) {
  const t = C_THEME;
  const bg = hot ? t.accent : active ? t.panelSoft : 'transparent';
  const color = hot ? '#fff' : t.text;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
      background: bg, color, borderRadius: 14, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      border: !active && !hot ? `1px solid ${t.border}` : '1px solid transparent',
    }}>{icon}{label}</div>
  );
}

function C_VoiceChatSidebar() {
  const t = C_THEME;
  return (
    <div style={{
      flex: 0.85, background: t.panel, borderRadius: t.radius,
      display: 'flex', flexDirection: 'column', boxShadow: t.shadow, minHeight: 0,
    }}>
      <div style={{ padding: '18px 18px 12px', borderBottom: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>чат у камина</div>
        <div style={{ fontSize: 10, color: t.textSoft, marginTop: 2 }}>видно только участникам звонка</div>
      </div>
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
        <C_Bubble name="Костя" color="#a87b56" time="11:04" text="смотрите, баг был в роутере"/>
        <C_Bubble name="Лев" color="#7d9268" time="11:05" text="ага! локально воспроизводится?"/>
        <C_Bubble name="Костя" color="#a87b56" time="11:05" text="да, секунду" reactions={[{emoji:'👀',count:2}]}/>
        <div style={{
          alignSelf: 'center', padding: '6px 10px', background: t.panelSoft,
          borderRadius: 10, fontSize: 11, color: t.textSoft,
          display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0',
        }}>
          <Icon.Monitor width={11} height={11} style={{ color: t.accent }}/>
          <b style={{ color: t.text }}>Маша</b> начала демонстрацию <b style={{ color: t.text }}>Figma</b>
        </div>
        <C_Bubble name="Маша" color="#d68b6c" time="11:08" text="заодно гляньте редизайн профиля 🌷"/>
        <C_Bubble name="аня" color={t.accent} time="11:09" text="о, нравится! акцент чуть теплее можно?" side="right"/>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{
          background: t.panelSoft, borderRadius: 14, padding: '9px 14px',
          fontSize: 12, color: t.textMute, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon.Plus width={14} height={14}/>
          <span style={{ flex: 1 }}>сообщение в звонок…</span>
          <Icon.Smile width={14} height={14}/>
        </div>
      </div>
    </div>
  );
}

function VariantC_Voice() {
  const t = C_THEME;
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text, fontFamily: t.font,
      display: 'flex', gap: 16, padding: 16, overflow: 'hidden',
    }}>
      <C_ServerDock/>
      <C_ChannelCard/>
      <C_VoiceMain/>
      <C_VoiceChatSidebar/>
    </div>
  );
}

window.VariantC_Chat = VariantC_Chat;
window.VariantC_Voice = VariantC_Voice;
