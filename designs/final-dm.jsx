// Личные сообщения (DM)

function KD_DMList({ t, current = 'masha' }) {
  const dms = [
    { id: 'masha', n: 'Маша Тёплая', c: '#d68b6c', last: 'ок, минуту', when: 'сейчас', unread: 0, online: 'online' },
    { id: 'lev', n: 'Лев Морозов', c: '#7d9268', last: 'договорились ✊', when: '14м', unread: 0, online: 'online' },
    { id: 'kostya', n: 'Костя Дн', c: '#a87b56', last: 'кинул pdf, посмотри как будет минута', when: '1ч', unread: 2, online: 'online' },
    { id: 'sonya', n: 'Соня Н', c: '#c98870', last: 'спокойной ночи 🌙', when: 'вчера', unread: 0, online: 'dnd' },
    { id: 'tima', n: 'Тима Р', c: '#8d6e4d', last: 'я зайду в 6', when: 'вчера', unread: 0, online: 'idle' },
    { id: 'grp', n: 'дизайн-чат', c: t.warm, last: 'Юля: ок, давай завтра', when: 'вчера', unread: 4, group: true },
    { id: 'yulya', n: 'Юля С', c: '#b88c4e', last: 'окей', when: '2дн', unread: 0, online: 'offline' },
    { id: 'vlad', n: 'Влад К', c: '#9c7f5e', last: 'видосик скинул', when: '4дн', unread: 0, online: 'offline' },
  ];
  return (
    <div style={{
      width: 256, background: t.panel, borderRight: `1px solid ${t.border}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, background: t.panelAlt }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>личные сообщения</div>
        <div style={{ fontSize: 10, color: t.textMute, marginTop: 1, fontFamily: KD_MONO }}>8 переписок · 6 непрочитанных</div>
      </div>
      <div style={{ padding: 8 }}>
        <div style={{
          background: t.panelAlt, borderRadius: 4, padding: '6px 10px',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon.Search width={12} height={12} style={{ color: t.textMute }}/>
          <span style={{ fontSize: 11, color: t.textMute, flex: 1 }}>искать переписку…</span>
          <span style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO }}>⌘K</span>
        </div>
      </div>
      <div style={{
        padding: '4px 14px 6px', fontSize: 10, fontWeight: 700, color: t.textMute,
        fontFamily: KD_MONO, letterSpacing: '0.05em', textTransform: 'uppercase',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>— недавние</span>
        <Icon.Plus width={11} height={11} style={{ cursor: 'pointer' }}/>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {dms.map(d => {
          const active = d.id === current;
          const dot = { online: t.online, idle: t.idle, dnd: t.dnd, offline: t.textMute };
          return (
            <div key={d.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
              borderLeft: active ? `2px solid ${t.accent}` : '2px solid transparent',
              paddingLeft: active ? 12 : 14,
              background: active ? t.panelHi : 'transparent',
              cursor: 'pointer',
              opacity: d.online === 'offline' && !d.unread && !d.group ? 0.7 : 1,
            }}>
              <div style={{ position: 'relative' }}>
                <Avatar name={d.n} color={d.c} size={32} />
                {d.online && !d.group && <div style={{
                  position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: 5,
                  background: dot[d.online], border: `2px solid ${active ? t.panelHi : t.panel}`,
                }}/>}
                {d.group && <div style={{
                  position: 'absolute', bottom: -3, right: -3, width: 14, height: 14, borderRadius: 4,
                  background: t.panel, border: `1.5px solid ${t.warm}`, color: t.warm,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700,
                }}>3</div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: active || d.unread ? 700 : 500, color: t.text, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.n}</span>
                  <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO, flexShrink: 0 }}>{d.when}</span>
                </div>
                <div style={{
                  fontSize: 11, color: d.unread ? t.text : t.textSoft, marginTop: 1,
                  fontWeight: d.unread ? 600 : 400,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{d.last}</div>
              </div>
              {d.unread > 0 && <span style={{
                background: t.warm, color: '#fff', fontSize: 10, fontWeight: 700,
                padding: '0 6px', borderRadius: 8, fontFamily: KD_MONO,
              }}>{d.unread}</span>}
            </div>
          );
        })}
      </div>
      <KD_UserBar t={t}/>
    </div>
  );
}

function KD_DMBubble({ t, name, color, time, text, side = 'left', reactions, attachment }) {
  const isMine = side === 'right';
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '4px 20px',
      flexDirection: isMine ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
    }}>
      {!isMine && <Avatar name={name} color={color} size={28}/>}
      {isMine && <div style={{ width: 28 }}/>}
      <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
        <div style={{
          padding: '7px 12px',
          background: isMine ? t.accent : t.panel,
          color: isMine ? '#fff' : t.text,
          border: isMine ? 'none' : `1px solid ${t.border}`,
          borderRadius: KD_RADIUS,
          fontSize: 13, lineHeight: 1.45,
        }}>
          {text}
          {attachment && <div style={{
            marginTop: 6, padding: 6, background: isMine ? 'rgba(255,255,255,0.18)' : t.panelAlt,
            borderRadius: 4, fontSize: 11, fontFamily: KD_MONO,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>📎</span> {attachment}
          </div>}
        </div>
        <div style={{
          fontSize: 10, color: t.textMute, marginTop: 3, fontFamily: KD_MONO,
          padding: '0 4px', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{time}</span>
          {isMine && <span style={{ color: t.online }}>✓✓ прочитано</span>}
        </div>
        {reactions && (
          <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
            {reactions.map((r, i) => (
              <div key={i} style={{
                background: t.panel, border: `1px solid ${t.border}`,
                padding: '1px 6px', borderRadius: 10, fontSize: 11,
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <span>{r.emoji}</span>
                <span style={{ color: t.textSoft, fontFamily: KD_MONO, fontSize: 10 }}>{r.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FinalDM({ t }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text,
      fontFamily: KD_FONT, display: 'flex', overflow: 'hidden',
    }}>
      <KD_ServerRail t={t} current=""/>
      <KD_DMList t={t}/>
      <div style={{ flex: 1, background: t.bg, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* шапка */}
        <div style={{
          padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: `1px solid ${t.border}`, background: t.panelAlt,
        }}>
          <div style={{ position: 'relative' }}>
            <Avatar name="Маша Тёплая" color="#d68b6c" size={30}/>
            <div style={{
              position: 'absolute', bottom: -2, right: -2, width: 10, height: 10,
              borderRadius: 5, background: t.online, border: `2px solid ${t.panelAlt}`,
            }}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Маша Тёплая</div>
            <div style={{ fontSize: 10, color: t.online, fontFamily: KD_MONO }}>● пьёт какао · печатает…</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{
              padding: '5px 10px', borderRadius: 4, border: `1px solid ${t.border}`,
              fontSize: 11, color: t.text, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
            }}>
              <Icon.Speaker width={11} height={11}/> позвонить
            </div>
            <div style={{
              padding: '5px 10px', borderRadius: 4, border: `1px solid ${t.border}`,
              fontSize: 11, color: t.text, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
            }}>
              <Icon.Video width={11} height={11}/> видео
            </div>
            <div style={{
              padding: '5px 10px', borderRadius: 4, border: `1px solid ${t.border}`,
              fontSize: 11, color: t.text, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
            }}>
              <Icon.Monitor width={11} height={11}/> экран
            </div>
            <div style={{
              padding: '5px 8px', borderRadius: 4, fontSize: 11, color: t.textMute, cursor: 'pointer',
            }}>· · ·</div>
          </div>
        </div>
        {/* сообщения */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '8px 0', display: 'flex', flexDirection: 'column' }}>
          {/* контекст знакомства */}
          <div style={{
            margin: '10px 20px', padding: '14px', background: t.panelAlt,
            borderRadius: KD_RADIUS, border: `1px solid ${t.border}`,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <Avatar name="Маша Тёплая" color="#d68b6c" size={48}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>это начало вашей переписки с Машей Тёплой</div>
              <div style={{ fontSize: 11, color: t.textSoft, marginTop: 2 }}>вы оба в комнатах <b style={{ color: t.accent }}>Друзья и кофе</b> и <b style={{ color: t.accent }}>Бук-клуб</b>. знакомы с мая 2024.</div>
            </div>
          </div>
          <KD_DayDivider t={t} label="вчера · 21:18"/>
          <KD_DMBubble t={t} name="Маша Тёплая" color="#d68b6c" time="21:18"
            text="привет! я смотрела твой mockup — мне очень зашло. но у меня пара мыслей по плотности"/>
          <KD_DMBubble t={t} name="аня" color={t.warm} time="21:20" side="right"
            text="о, расскажи, мне важно. я могу завтра показать обновлённое?"/>
          <KD_DMBubble t={t} name="Маша Тёплая" color="#d68b6c" time="21:22"
            text="давай. в 11 на совместном звонке, я там скрин покажу"
            reactions={[{emoji:'☕',count:1}]}/>
          <KD_DayDivider t={t} label="сегодня"/>
          <KD_DMBubble t={t} name="Маша Тёплая" color="#d68b6c" time="11:08"
            text="кстати, скинула в #дизайн картинку — посмотри"
            attachment="profile-redesign-v3.fig"/>
          <KD_DMBubble t={t} name="аня" color={t.warm} time="11:10" side="right"
            text="увидела, классно. сейчас гляну детальнее ✨"/>
          <KD_DMBubble t={t} name="Маша Тёплая" color="#d68b6c" time="11:12"
            text="ок, минуту"/>
        </div>
        {/* композер */}
        <div style={{ padding: '8px 20px 14px' }}>
          <div style={{
            background: t.panel, borderRadius: KD_RADIUS, padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${t.border}`,
          }}>
            <Icon.Plus width={15} height={15} style={{ color: t.textMute }}/>
            <div style={{ flex: 1, fontSize: 12, color: t.textMute }}>напиши Маше…</div>
            <Icon.Smile width={15} height={15} style={{ color: t.textMute }}/>
            <div style={{
              padding: '4px 10px', background: t.accent, color: '#fff',
              borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: KD_MONO, cursor: 'pointer',
            }}>send ⏎</div>
          </div>
          <div style={{ fontSize: 10, color: t.textMute, marginTop: 5, paddingLeft: 4, fontFamily: KD_MONO }}>
            <b style={{ color: t.accent, fontFamily: KD_MONO }}>Маша</b> печатает…
          </div>
        </div>
      </div>
    </div>
  );
}

window.FinalDM = FinalDM;
