// Вход и регистрация — два состояния одного экрана

function KD_AuthArt({ t }) {
  // декоративная левая часть с «уютной» иллюстрацией
  return (
    <div style={{
      flex: 1, background: t.name === 'dark'
        ? `linear-gradient(135deg, #1a1610, #221d15)`
        : `linear-gradient(135deg, #ddd3bd, #e8e0cc)`,
      borderRight: `1px solid ${t.border}`,
      padding: 56, display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* лого */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30 }}>
        <div style={{
          width: 36, height: 36, borderRadius: KD_RADIUS, background: t.warm,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 14, letterSpacing: '-0.04em',
        }}>кд</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>как дела?</div>
          <div style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>self-hosted · v1.4.2</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: t.text, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 14 }}>
          теплое место,<br/>
          где знаются все.
        </div>
        <div style={{ fontSize: 14, color: t.textSoft, lineHeight: 1.55 }}>
          мессенджер на своём сервере. для друзей, проектов, книжного клуба и соседей. без рекламы и чужих глаз.
        </div>

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { i: '💬', t: 'каналы и треды', s: 'болталки, дело, тематика — всё разложено' },
            { i: '🎙', t: 'голос с демонстрацией', s: 'до 8 экранов сразу, чат прямо в звонке' },
            { i: '🌿', t: 'свой сервер', s: 'данные дома или у друга — никто не подсмотрит' },
          ].map(f => (
            <div key={f.t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 18, lineHeight: 1, marginTop: 2 }}>{f.i}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{f.t}</div>
                <div style={{ fontSize: 11, color: t.textSoft, marginTop: 1 }}>{f.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* мини-цитата снизу */}
      <div style={{
        padding: 14, background: t.panel, borderRadius: KD_RADIUS,
        border: `1px solid ${t.border}`, maxWidth: 360,
      }}>
        <div style={{ fontSize: 12, color: t.text, lineHeight: 1.5, fontStyle: 'italic' }}>
          «у нас стоит свой инстанс уже второй год. вечером в среду все собираются в "у камина" — это лучшее, что случилось с нашим чатом.»
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <Avatar name="Лев Морозов" color="#7d9268" size={22}/>
          <div style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>
            Лев · хозяин «Друзья и кофе»
          </div>
        </div>
      </div>

      {/* декорации */}
      <div style={{
        position: 'absolute', right: -40, top: '20%', width: 140, height: 140,
        borderRadius: '50%', background: `radial-gradient(circle, ${t.warmBg}, transparent 70%)`,
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', right: '15%', bottom: -30, width: 100, height: 100,
        borderRadius: '50%', background: `radial-gradient(circle, ${t.accentBg}, transparent 70%)`,
        pointerEvents: 'none',
      }}/>
    </div>
  );
}

function KD_Input({ t, label, placeholder, value, hint, type, suffix, mono, error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
        <label style={{
          fontSize: 10, fontWeight: 700, color: t.text,
          fontFamily: KD_MONO, letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>{label}</label>
        {hint && <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>{hint}</span>}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: t.panel, borderRadius: KD_RADIUS,
        border: `1px solid ${error ? t.danger : value ? t.accent : t.border}`,
        padding: '9px 12px',
      }}>
        <span style={{
          flex: 1, fontSize: 13, color: value ? t.text : t.textMute,
          fontFamily: mono ? KD_MONO : KD_FONT,
        }}>{value || placeholder}</span>
        {suffix && <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>{suffix}</span>}
      </div>
      {error && (
        <div style={{ fontSize: 10, color: t.danger, marginTop: 4, fontFamily: KD_MONO }}>
          {error}
        </div>
      )}
    </div>
  );
}

function KD_BigButton({ t, label, kbd, primary, secondary }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '11px 16px',
      background: primary ? t.accent : secondary ? 'transparent' : t.panel,
      color: primary ? '#fff' : t.text,
      border: `1px solid ${primary ? t.accent : secondary ? 'transparent' : t.border}`,
      borderRadius: KD_RADIUS,
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
    }}>
      <span>{label}</span>
      {kbd && <span style={{
        fontSize: 10, fontFamily: KD_MONO, opacity: 0.8,
        padding: '1px 5px', borderRadius: 3,
        background: primary ? 'rgba(255,255,255,0.18)' : t.panelHi,
      }}>{kbd}</span>}
    </div>
  );
}

function KD_AuthForm({ t, mode = 'login' }) {
  const isLogin = mode === 'login';
  return (
    <div style={{
      width: 440, background: t.bg, padding: '56px 40px',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* верх */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
        <div style={{
          padding: '3px 8px', background: t.panel, border: `1px solid ${t.border}`,
          borderRadius: 4, fontSize: 10, color: t.textSoft, fontFamily: KD_MONO,
        }}>
          {isLogin ? '01. вход' : '02. регистрация'}
        </div>
        <div style={{ fontSize: 11, color: t.textMute, fontFamily: KD_MONO }}>
          ⌘K · помощь
        </div>
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, color: t.text, letterSpacing: '-0.02em', marginBottom: 4 }}>
        {isLogin ? 'привет, заходи' : 'давай знакомиться'}
      </div>
      <div style={{ fontSize: 12, color: t.textSoft, marginBottom: 26, lineHeight: 1.5 }}>
        {isLogin
          ? 'рад тебя снова видеть. как дела?'
          : 'выбери, где будет жить твой профиль'}
      </div>

      {/* сервер */}
      <KD_Input t={t} label="сервер"
        value={isLogin ? 'kakdela.cafe' : 'kakdela.cafe'}
        suffix={isLogin ? '✓ подключено' : '✓ доступен'} mono
        hint={isLogin ? 'твоя комната' : 'или укажи свой'}/>

      {isLogin ? (
        <>
          <KD_Input t={t} label="имя или почта"
            value="аня"
            hint="как мы знакомы"
            mono/>
          <KD_Input t={t} label="пароль"
            value="••••••••••"
            hint="забыла?"
            type="password"/>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <div style={{
              width: 14, height: 14, borderRadius: 3, background: t.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 10, fontWeight: 700,
            }}>✓</div>
            <span style={{ fontSize: 12, color: t.text }}>оставаться в сети на этом устройстве</span>
          </div>

          <KD_BigButton t={t} label="зайти" kbd="⏎" primary/>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0' }}>
            <div style={{ flex: 1, height: 1, background: t.border }}/>
            <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO, textTransform: 'uppercase', letterSpacing: '0.05em' }}>или</span>
            <div style={{ flex: 1, height: 1, background: t.border }}/>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <KD_BigButton t={t} label="🔑   войти по passkey"/>
            <KD_BigButton t={t} label="📩   получить код по почте"/>
            <KD_BigButton t={t} label="🪪   через свой keycloak/sso"/>
          </div>
        </>
      ) : (
        <>
          <KD_Input t={t} label="как тебя звать"
            value="аня котова"
            hint="можно потом изменить"/>
          <KD_Input t={t} label="ник"
            value="anya"
            suffix="#1284"
            hint="так тебя зовут @"
            mono/>
          <KD_Input t={t} label="почта"
            value="anya@example.com"
            mono/>
          <KD_Input t={t} label="пароль"
            value="••••••••••••"
            hint="мин. 10 символов"/>

          {/* приглашение */}
          <div style={{
            padding: 12, background: t.warmBg, border: `1px solid ${t.warmSoft}`,
            borderRadius: KD_RADIUS, marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>🎟</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>тебя пригласили в «Друзья и кофе»</div>
              <div style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO, marginTop: 1 }}>от Лев Морозов · действует 5 дней</div>
            </div>
          </div>

          <KD_BigButton t={t} label="создать аккаунт" kbd="⏎" primary/>

          <div style={{ marginTop: 14, fontSize: 11, color: t.textSoft, lineHeight: 1.5, textAlign: 'center' }}>
            создавая аккаунт, ты соглашаешься с <a style={{ color: t.accent, textDecoration: 'none' }}>правилами этого сервера</a> и обещаешь быть нежной
          </div>
        </>
      )}

      <div style={{ flex: 1 }}/>

      {/* низ — переключатель режима */}
      <div style={{
        marginTop: 26, padding: '14px 16px', background: t.panel,
        borderRadius: KD_RADIUS, border: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 12, color: t.textSoft, flex: 1 }}>
          {isLogin ? 'первый раз здесь?' : 'уже есть аккаунт?'}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 700, color: t.accent, cursor: 'pointer',
          fontFamily: KD_MONO,
        }}>
          {isLogin ? 'создать аккаунт →' : '← войти'}
        </span>
      </div>

      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>
        <span>● {isLogin ? 'kakdela.cafe' : 'self-hosted'}</span>
        <span style={{ width: 1, height: 10, background: t.border }}/>
        <span>v1.4.2</span>
        <span style={{ width: 1, height: 10, background: t.border }}/>
        <span>сменить сервер</span>
        <div style={{ flex: 1 }}/>
        <span>{t.name === 'dark' ? '🌙' : '☀'}</span>
      </div>
    </div>
  );
}

function FinalAuth({ t, mode = 'login' }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text,
      fontFamily: KD_FONT, display: 'flex', overflow: 'hidden',
    }}>
      <KD_AuthArt t={t}/>
      <KD_AuthForm t={t} mode={mode}/>
    </div>
  );
}

window.FinalAuth = FinalAuth;
