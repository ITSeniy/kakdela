// Onboarding — присоединиться к серверу / создать свой / выбрать первый «уголок»

function KD_OBCard({ t, title, hint, accent, big, badge, children, footer }) {
  return (
    <div style={{
      background: t.panel, borderRadius: 8, border: `1px solid ${t.border}`,
      padding: big ? 24 : 16, display: 'flex', flexDirection: 'column', gap: 12,
      cursor: 'pointer', position: 'relative',
      borderTopColor: accent || undefined, borderTopWidth: accent ? 2 : undefined,
    }}>
      {badge && <div style={{
        position: 'absolute', top: 10, right: 10, fontSize: 9, padding: '2px 6px',
        background: t.warmBg, color: t.warm, fontFamily: KD_MONO,
        borderRadius: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>{badge}</div>}
      {title && <div>
        <div style={{ fontSize: big ? 15 : 13, fontWeight: 700, color: t.text }}>{title}</div>
        {hint && <div style={{ fontSize: 11, color: t.textSoft, marginTop: 3 }}>{hint}</div>}
      </div>}
      {children}
      {footer && <div style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO, marginTop: 4 }}>{footer}</div>}
    </div>
  );
}

function FinalOnboarding({ t }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text,
      fontFamily: KD_FONT, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* тонкая верхняя панель */}
      <div style={{
        padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${t.border}`, background: t.panelAlt,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: KD_RADIUS, background: t.warm,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, letterSpacing: '-0.04em',
        }}>кд</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>как дела?</div>
        <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>self-hosted · v1.4.2</span>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 11, color: t.textSoft }}>привет, аня · #1284</span>
        <Avatar name="Аня К" color={t.warm} size={24}/>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '34px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* приветствие */}
        <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: t.text, letterSpacing: '-0.02em', marginBottom: 6 }}>
            привет, аня. как дела?
          </div>
          <div style={{ fontSize: 13, color: t.textSoft, lineHeight: 1.6 }}>
            давай заведём тебе уголок. можешь зайти в чужую комнату или начать свою — <br/>
            никто не торопит.
          </div>
        </div>

        {/* три карты */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, maxWidth: 980, margin: '0 auto', width: '100%' }}>
          <KD_OBCard t={t} accent={t.accent} big
            title="зайти к друзьям"
            hint="по ссылке или коду приглашения">
            <div style={{
              padding: '10px 12px', background: t.panelAlt, borderRadius: KD_RADIUS,
              border: `1px dashed ${t.textMute}`, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ color: t.textMute, fontSize: 13, fontFamily: KD_MONO }}>kakdela.cafe / </span>
              <span style={{ color: t.text, fontSize: 13, fontFamily: KD_MONO, fontWeight: 600 }}>buk-klub-2024</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: t.accent, fontFamily: KD_MONO, fontWeight: 700 }}>зайти →</span>
            </div>
            <div style={{ fontSize: 11, color: t.textSoft }}>
              приглашение действует <b style={{ color: t.text, fontFamily: KD_MONO }}>7 дней</b> или <b style={{ color: t.text, fontFamily: KD_MONO }}>23 захода</b>
            </div>
          </KD_OBCard>

          <KD_OBCard t={t} accent={t.warm} big badge="новое"
            title="завести свою комнату"
            hint="будешь хозяином, всё под твоим присмотром">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { name: 'для друзей', sub: 'болталка, кухня, голос', icon: '🪴' },
                { name: 'для проекта', sub: 'задачи, код, дизайн', icon: '🧶' },
                { name: 'для соседей', sub: 'дом, объявления, чат', icon: '🔑' },
                { name: 'пустая', sub: 'начну с нуля сам', icon: '✦' },
              ].map(o => (
                <div key={o.name} style={{
                  padding: '8px 10px', borderRadius: KD_RADIUS, background: t.panelAlt,
                  display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${t.border}`,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 4, background: t.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>{o.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{o.name}</div>
                    <div style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>{o.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </KD_OBCard>

          <KD_OBCard t={t} big title="вернуться к своим" hint="комнаты, где ты уже бывала">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { l: 'Д', n: 'Друзья и кофе', c: t.accent, last: 'болталка · только что', dot: 14 },
                { l: 'Б', n: 'Бук-клуб', c: t.warm, last: 'обсуждение · вчера', dot: 3 },
                { l: 'ПК', n: 'Полночный код', c: '#8a6e4d', last: 'дизайн · 3 дня' },
                { l: 'С', n: 'Соседи', c: '#7a6850', last: 'объявления · нед.' },
              ].map(s => (
                <div key={s.n} style={{
                  padding: '8px 10px', borderRadius: KD_RADIUS, background: t.panelAlt,
                  display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${t.border}`,
                  position: 'relative',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 4, background: s.c, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}>{s.l}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{s.n}</div>
                    <div style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>{s.last}</div>
                  </div>
                  {s.dot && <div style={{
                    fontSize: 10, fontWeight: 700, color: '#fff', background: t.warm,
                    padding: '0 6px', borderRadius: 8, fontFamily: KD_MONO,
                  }}>{s.dot}</div>}
                </div>
              ))}
            </div>
          </KD_OBCard>
        </div>

        {/* подвал */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 980, margin: '0 auto', width: '100%' }}>
          <div style={{
            padding: 14, background: t.panelSoft, borderRadius: KD_RADIUS,
            border: `1px solid ${t.borderSoft}`, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>🌿</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>что такое «свой инстанс»?</div>
              <div style={{ fontSize: 11, color: t.textSoft, marginTop: 2 }}>сервер «Как дела?» крутится у тебя или у друзей дома. как тёплая лампа в гостиной — никаких чужих ушей.</div>
            </div>
          </div>
          <div style={{
            padding: 14, background: t.panelSoft, borderRadius: KD_RADIUS,
            border: `1px solid ${t.borderSoft}`, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>📜</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>горячие клавиши уже работают</div>
              <div style={{ fontSize: 11, color: t.textSoft, marginTop: 2, fontFamily: KD_MONO }}>⌘K — поиск · ⌘J — последний канал · ⌘/ — все клавиши</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.FinalOnboarding = FinalOnboarding;
