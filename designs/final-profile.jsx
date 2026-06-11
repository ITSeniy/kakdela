// Профиль участника (модалка на затемнённом канвасе)

function FinalProfile({ t }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text,
      fontFamily: KD_FONT, display: 'flex', overflow: 'hidden',
    }}>
      <KD_ServerRail t={t}/>
      <KD_ChannelList t={t}/>
      <div style={{
        flex: 1, background: t.bg, position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* фоновый чат для контекста */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none' }}>
          <KD_ChatBody t={t}/>
        </div>
        <div style={{
          position: 'absolute', inset: 0, background: t.name === 'dark'
            ? 'rgba(0,0,0,0.45)' : 'rgba(40,30,15,0.25)',
        }}/>

        {/* модалка */}
        <div style={{
          position: 'relative', width: 460, background: t.panel,
          borderRadius: 10, overflow: 'hidden', border: `1px solid ${t.border}`,
          boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
        }}>
          {/* шапка */}
          <div style={{
            height: 80, background: `linear-gradient(135deg, #d68b6c, #a87b56)`,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 8, right: 10, display: 'flex', gap: 4,
            }}>
              <div style={{
                padding: '4px 8px', background: 'rgba(20,15,10,0.4)',
                borderRadius: 4, fontSize: 10, color: '#fff', fontFamily: KD_MONO, cursor: 'pointer',
              }}>· · ·</div>
              <div style={{
                padding: '4px 8px', background: 'rgba(20,15,10,0.4)',
                borderRadius: 4, fontSize: 10, color: '#fff', fontFamily: KD_MONO, cursor: 'pointer',
              }}>esc ✕</div>
            </div>
          </div>
          {/* аватар + имя */}
          <div style={{ padding: '0 18px 16px', marginTop: -28 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
              <div style={{ position: 'relative' }}>
                <Avatar name="Маша Тёплая" color="#d68b6c" size={70} ring="#5d6f4c" ringColor={t.panel}/>
                <div style={{
                  position: 'absolute', bottom: 4, right: 4, width: 14, height: 14,
                  borderRadius: 7, background: t.online, border: `3px solid ${t.panel}`,
                }}/>
              </div>
              <div style={{ flex: 1, paddingBottom: 4 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: '-0.01em' }}>Маша Тёплая</div>
                <div style={{ fontSize: 11, color: t.textMute, fontFamily: KD_MONO }}>masha #4071 · с нами с осени 2023</div>
              </div>
              <div style={{
                padding: '5px 10px', background: t.accent, color: '#fff', borderRadius: 4,
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: KD_MONO,
              }}>написать ⏎</div>
            </div>

            {/* about */}
            <div style={{
              padding: 12, background: t.panelAlt, borderRadius: KD_RADIUS,
              border: `1px solid ${t.border}`, marginBottom: 10,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.textMute, fontFamily: KD_MONO, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>о себе</div>
              <div style={{ fontSize: 13, color: t.text, lineHeight: 1.5 }}>
                делаю интерфейсы и рисую растения. <br/>
                люблю какао, плохой кофе по утрам и хороший вечером 🌿
              </div>
            </div>

            {/* статус */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{
                flex: 1, padding: '8px 10px', background: t.panelAlt, borderRadius: KD_RADIUS,
                border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: t.online }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: t.textMute, fontFamily: KD_MONO }}>статус</div>
                  <div style={{ fontSize: 12, color: t.text, fontWeight: 600 }}>пьёт какао ☕</div>
                </div>
              </div>
              <div style={{
                flex: 1, padding: '8px 10px', background: t.panelAlt, borderRadius: KD_RADIUS,
                border: `1px solid ${t.border}`,
              }}>
                <div style={{ fontSize: 11, color: t.textMute, fontFamily: KD_MONO }}>часовой пояс</div>
                <div style={{ fontSize: 12, color: t.text, fontWeight: 600 }}>МСК · 11:24</div>
              </div>
            </div>

            {/* роли */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.textMute, fontFamily: KD_MONO, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>роли · 3</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[
                  { l: 'дизайн', c: '#d68b6c' },
                  { l: 'свой', c: t.accent },
                  { l: 'ранняя пташка', c: '#c87a3a' },
                ].map(r => (
                  <div key={r.l} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px',
                    border: `1px solid ${r.c}55`, borderRadius: 4,
                    fontSize: 11, color: t.text, fontFamily: KD_MONO,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: r.c }}/>
                    {r.l}
                  </div>
                ))}
                <div style={{
                  padding: '3px 8px', border: `1px dashed ${t.textMute}`, borderRadius: 4,
                  fontSize: 11, color: t.textMute, cursor: 'pointer',
                }}>+</div>
              </div>
            </div>

            {/* общие сервера */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.textMute, fontFamily: KD_MONO, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>общие комнаты · 3</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { l: 'Д', n: 'Друзья и кофе', c: t.accent, last: '#болталка · 09:17' },
                  { l: 'Б', n: 'Бук-клуб', c: t.warm, last: '#обсуждение · вчера' },
                  { l: 'ПК', n: 'Полночный код', c: '#8a6e4d', last: '#дизайн · 3 дня назад' },
                ].map(s => (
                  <div key={s.n} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
                    borderRadius: 4, cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 4, background: s.c, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>{s.l}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{s.n}</div>
                      <div style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>{s.last}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <KD_MemberList t={t}/>
    </div>
  );
}

window.FinalProfile = FinalProfile;
