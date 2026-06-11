// Настройки сервера — полноэкранная страница с боковой навигацией.

function KD_SetNav({ t, current = 'appearance' }) {
  const groups = [
    { title: 'сервер', items: [
      { id: 'overview', name: 'обзор', icon: <Icon.Sparkle width={12} height={12}/> },
      { id: 'channels', name: 'каналы и роли' },
      { id: 'members', name: 'участники', count: 23 },
      { id: 'invites', name: 'приглашения' },
      { id: 'audit', name: 'журнал событий' },
    ]},
    { title: 'аккаунт', items: [
      { id: 'profile', name: 'мой профиль' },
      { id: 'notifications', name: 'уведомления' },
      { id: 'appearance', name: 'внешний вид' },
      { id: 'audio', name: 'голос и видео' },
      { id: 'shortcuts', name: 'клавиши' },
    ]},
    { title: 'инстанс', items: [
      { id: 'server', name: 'сервер инстанса', mono: '1.4.2' },
      { id: 'storage', name: 'хранилище', mono: '4.2GB' },
      { id: 'backup', name: 'бэкапы' },
    ]},
  ];
  return (
    <div style={{
      width: 220, background: t.panelAlt, borderRight: `1px solid ${t.border}`,
      padding: '14px 8px', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{ padding: '0 10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: KD_RADIUS, background: t.accent,
          color: '#fff', fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>Д</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>Друзья и кофе</div>
          <div style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>настройки</div>
        </div>
      </div>
      {groups.map(g => (
        <div key={g.title} style={{ marginBottom: 10 }}>
          <div style={{
            padding: '3px 10px', fontSize: 10, fontWeight: 700,
            color: t.textMute, letterSpacing: '0.05em', fontFamily: KD_MONO,
            textTransform: 'uppercase',
          }}>— {g.title}</div>
          {g.items.map(it => {
            const active = it.id === current;
            return (
              <div key={it.id} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                borderRadius: 4, fontSize: 12, cursor: 'pointer',
                color: active ? t.text : t.textSoft,
                background: active ? t.panelHi : 'transparent',
                fontWeight: active ? 600 : 500,
                borderLeft: active ? `2px solid ${t.accent}` : '2px solid transparent',
                paddingLeft: active ? 8 : 10,
                margin: '0 4px 1px',
              }}>
                {it.icon}
                <span style={{ flex: 1 }}>{it.name}</span>
                {it.count && <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>{it.count}</span>}
                {it.mono && <span style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO }}>{it.mono}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function KD_SetField({ t, label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.text, marginBottom: 4, fontFamily: KD_MONO, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: t.textSoft, marginBottom: 8 }}>{hint}</div>}
      {children}
    </div>
  );
}

function KD_Swatch({ t, color, active, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
      <div style={{
        width: 38, height: 38, borderRadius: KD_RADIUS, background: color,
        boxShadow: active ? `0 0 0 2px ${t.bg}, 0 0 0 4px ${color}` : `0 0 0 1px ${t.border}`,
        position: 'relative',
      }}>
        {active && <span style={{
          position: 'absolute', inset: 0, color: '#fff', fontSize: 16, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✓</span>}
      </div>
      <span style={{ fontSize: 10, color: t.textSoft, fontFamily: KD_MONO }}>{label}</span>
    </div>
  );
}

function KD_ThemePreview({ t, themeMode, active, label, hint }) {
  const isLight = themeMode === 'light';
  const bg = isLight ? '#e8e0cc' : '#1a1610';
  const panel = isLight ? '#f0e8d4' : '#221d15';
  const txt = isLight ? '#2a2418' : '#e8ddc4';
  const muted = isLight ? '#8a7e64' : '#7d6e54';
  return (
    <div style={{
      flex: 1, padding: 10, borderRadius: KD_RADIUS,
      background: t.panel, border: `1.5px solid ${active ? t.accent : t.border}`,
      cursor: 'pointer',
    }}>
      <div style={{
        background: bg, borderRadius: 4, padding: 8, height: 80, marginBottom: 8,
        display: 'flex', gap: 6, alignItems: 'flex-start',
      }}>
        <div style={{ width: 18, background: isLight ? '#ddd3bd' : '#13100c', borderRadius: 2, height: '100%' }}/>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ height: 5, background: muted, borderRadius: 2, width: '60%', opacity: 0.6 }}/>
          <div style={{ height: 5, background: txt, borderRadius: 2, width: '90%' }}/>
          <div style={{ height: 5, background: txt, borderRadius: 2, width: '75%' }}/>
          <div style={{ height: 5, background: '#c87a3a', borderRadius: 2, width: '40%' }}/>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 14, height: 14, borderRadius: 7, border: `1.5px solid ${active ? t.accent : t.textMute}`,
          background: active ? t.accent : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{active && <span style={{ width: 4, height: 4, borderRadius: 2, background: '#fff' }}/>}</div>
        <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{label}</span>
        <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO, marginLeft: 'auto' }}>{hint}</span>
      </div>
    </div>
  );
}

function KD_Toggle({ t, on, label, hint }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      background: t.panel, borderRadius: KD_RADIUS, border: `1px solid ${t.border}`,
      marginBottom: 6,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: t.textSoft, marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{
        width: 36, height: 20, borderRadius: 10, background: on ? t.accent : t.panelHi,
        display: 'flex', alignItems: 'center', padding: 2,
        justifyContent: on ? 'flex-end' : 'flex-start',
      }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: '#fff' }}/>
      </div>
    </div>
  );
}

function KD_Slider({ t, label, value, hint }) {
  return (
    <div style={{
      padding: '12px 14px', background: t.panel, borderRadius: KD_RADIUS,
      border: `1px solid ${t.border}`, marginBottom: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{label}</span>
        <span style={{ fontSize: 11, color: t.accent, fontFamily: KD_MONO, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ position: 'relative', height: 4, background: t.panelHi, borderRadius: 2 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '60%', background: t.accent, borderRadius: 2 }}/>
        <div style={{
          position: 'absolute', left: '60%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 14, height: 14, borderRadius: 7, background: '#fff',
          boxShadow: `0 0 0 2px ${t.accent}`,
        }}/>
      </div>
      {hint && <div style={{ fontSize: 10, color: t.textMute, marginTop: 8, fontFamily: KD_MONO }}>{hint}</div>}
    </div>
  );
}

function FinalSettings({ t }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text,
      fontFamily: KD_FONT, display: 'flex', overflow: 'hidden',
    }}>
      <KD_ServerRail t={t}/>
      <KD_SetNav t={t}/>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          padding: '14px 28px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'baseline', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: t.text }}>внешний вид</div>
            <div style={{ fontSize: 11, color: t.textSoft, marginTop: 2 }}>как «Как дела?» будет выглядеть у тебя</div>
          </div>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>esc · закрыть</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px', maxWidth: 720 }}>
          <KD_SetField t={t} label="тема" hint="следуем системе или фиксируем вручную">
            <div style={{ display: 'flex', gap: 10 }}>
              <KD_ThemePreview t={t} themeMode="light" active={t.name === 'light'} label="светлая" hint="овёс"/>
              <KD_ThemePreview t={t} themeMode="dark" active={t.name === 'dark'} label="тёмная" hint="ночь"/>
              <KD_ThemePreview t={t} themeMode="light" label="как у системы" hint="auto"/>
            </div>
          </KD_SetField>

          <KD_SetField t={t} label="акцентный цвет" hint="используется в активных каналах, кнопках и таймерах">
            <div style={{ display: 'flex', gap: 14 }}>
              <KD_Swatch t={t} color="#5d6f4c" label="мох" active/>
              <KD_Swatch t={t} color="#c87a3a" label="терракот"/>
              <KD_Swatch t={t} color="#8a6e4d" label="каштан"/>
              <KD_Swatch t={t} color="#7d6e4d" label="орех"/>
              <KD_Swatch t={t} color="#9c7f5e" label="песок"/>
              <KD_Swatch t={t} color="#6e6856" label="лесной"/>
            </div>
          </KD_SetField>

          <KD_SetField t={t} label="плотность" hint="как близко друг к другу располагаются сообщения и каналы">
            <div style={{
              display: 'flex', background: t.panel, borderRadius: KD_RADIUS,
              border: `1px solid ${t.border}`, padding: 3, gap: 2,
            }}>
              {[
                { id: 'cosy', name: 'уютно', hint: '+ воздух' },
                { id: 'compact', name: 'компактно', hint: 'по умолчанию', active: true },
                { id: 'dense', name: 'плотно', hint: 'для марафонов' },
              ].map(d => (
                <div key={d.id} style={{
                  flex: 1, padding: '8px 10px', borderRadius: 4, textAlign: 'center', cursor: 'pointer',
                  background: d.active ? t.panelHi : 'transparent',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: d.active ? t.text : t.textSoft }}>{d.name}</div>
                  <div style={{ fontSize: 10, color: t.textMute, marginTop: 2, fontFamily: KD_MONO }}>{d.hint}</div>
                </div>
              ))}
            </div>
          </KD_SetField>

          <KD_SetField t={t} label="скругление углов" hint="0 — резкие, 12 — мягкие">
            <KD_Slider t={t} label="радиус" value="6 px" hint="по умолчанию для кнопок, аватаров, карточек"/>
          </KD_SetField>

          <KD_SetField t={t} label="прочее">
            <KD_Toggle t={t} on label="моноширинные акценты" hint="время, ID, статусы — моноширинным шрифтом"/>
            <KD_Toggle t={t} on label="показывать аватары в каналах" hint="убери, чтобы каналы были чуть плотнее"/>
            <KD_Toggle t={t} label="мягкие анимации" hint="лёгкие переходы при смене каналов"/>
            <KD_Toggle t={t} on label="дружелюбное приветствие" hint="«доброе утро, как ты сегодня?» в начале дня"/>
          </KD_SetField>

          <div style={{
            padding: '12px 14px', background: t.warmBg, borderRadius: KD_RADIUS,
            border: `1px solid ${t.warmSoft}`, fontSize: 12, color: t.text,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>🌿</span>
            <span style={{ flex: 1 }}>настройки сохраняются на этом устройстве. синхронизация с других включается в <b>аккаунт → мой профиль</b>.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.FinalSettings = FinalSettings;
