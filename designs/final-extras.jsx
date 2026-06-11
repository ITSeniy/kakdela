// КакДела · дополнительные экраны
// 1. Пригласить друзей  2. Палитра ⌘K  3. Лайтбокс
// 4. Настройки канала   5. Состояния соединения
// 6. Пустые состояния   7. Загрузка файла в композере

// ─── общая сцена-затемнение поверх чата ────────────────────────────────
function KD_ModalStage({ t, children, blur = true }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text,
      fontFamily: KD_FONT, display: 'flex', overflow: 'hidden', position: 'relative',
    }}>
      <div style={{ display: 'flex', flex: 1, minWidth: 0 }}>
        <KD_ServerRail t={t}/>
        <KD_ChannelList t={t}/>
        <div style={{ flex: 1, background: t.bg, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <KD_ChannelHeader t={t}
            icon={<Icon.Hash width={14} height={14} style={{ color: t.textSoft }}/>}
            name="болталка" topic="как ты сегодня?" stats="2 087 · 23"/>
          <KD_ChatBody t={t}/>
          <KD_Composer t={t}/>
        </div>
        <KD_MemberList t={t}/>
      </div>
      <div style={{
        position: 'absolute', left: 56, top: 0, right: 0, bottom: 0,
        background: t.name === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(40,30,15,0.32)',
        backdropFilter: blur ? 'blur(2px)' : undefined,
        WebkitBackdropFilter: blur ? 'blur(2px)' : undefined,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── 1. ПРИГЛАСИТЬ ─────────────────────────────────────────────────────
function FinalInvite({ t }) {
  return (
    <KD_ModalStage t={t}>
      <div style={{
        width: 560, background: t.panel, borderRadius: 10, overflow: 'hidden',
        border: `1px solid ${t.border}`, boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
      }}>
        {/* header */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: t.accent, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>Д</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>пригласить в «друзья и кофе»</div>
            <div style={{ fontSize: 11, color: t.textSoft, marginTop: 1 }}>
              ссылка пустит сразу в канал <b style={{ color: t.text, fontFamily: KD_MONO }}>#привет</b>
            </div>
          </div>
          <div style={{
            width: 24, height: 24, borderRadius: 4, display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: t.textMute,
            cursor: 'pointer', fontSize: 14, fontFamily: KD_MONO,
          }}>×</div>
        </div>

        {/* preview card */}
        <div style={{ padding: '14px 18px 12px', background: t.panelAlt, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO, marginBottom: 6, letterSpacing: '0.05em' }}>
            — так увидят твои друзья
          </div>
          <div style={{ padding: 12, background: t.panel, border: `1px solid ${t.border}`, borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: t.accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>Д</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>друзья и кофе</div>
              <div style={{ fontSize: 11, color: t.textSoft, marginTop: 1 }}>
                <b style={{ color: t.text }}>Лев</b> зовёт тебя · уже 23 человека
              </div>
            </div>
            <div style={{ display: 'flex', marginRight: 8 }}>
              {['#7d9268', '#d68b6c', '#a87b56', '#c98870'].map((c, i) => (
                <div key={i} style={{
                  width: 22, height: 22, borderRadius: 11, background: c,
                  border: `2px solid ${t.panel}`, marginLeft: i ? -7 : 0,
                }}/>
              ))}
            </div>
            <div style={{ padding: '6px 12px', background: t.accent, color: '#fff', borderRadius: 4,
              fontSize: 11, fontWeight: 700, fontFamily: KD_MONO }}>зайти ⏎</div>
          </div>
        </div>

        {/* link row */}
        <div style={{ padding: '14px 18px 0' }}>
          <div style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO, marginBottom: 5, letterSpacing: '0.05em' }}>
            — ссылка-приглашение
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{
              flex: 1, padding: '9px 12px', background: t.bg, border: `1px solid ${t.border}`,
              borderRadius: 4, fontFamily: KD_MONO, fontSize: 12, color: t.text,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ color: t.textMute }}>kakdela.team/</span>
              <span style={{ color: t.accent, fontWeight: 700 }}>kofe-uV7p</span>
              <span style={{ flex: 1 }}/>
              <span style={{ fontSize: 9, color: t.textMute }}>14 / 50</span>
            </div>
            <div style={{
              padding: '9px 14px', background: t.accent, color: '#fff', borderRadius: 4,
              fontSize: 11, fontWeight: 700, fontFamily: KD_MONO, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>⧉ копировать</div>
          </div>
          <div style={{ fontSize: 10, color: t.accent, marginTop: 5, fontFamily: KD_MONO }}>
            ✓ скопировано · действует до 28.05.2026, 18:00
          </div>
        </div>

        {/* options grid */}
        <div style={{ padding: '14px 18px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO, marginBottom: 6, letterSpacing: '0.05em' }}>— срок действия</div>
            <div style={{ display: 'flex', background: t.bg, borderRadius: 4, border: `1px solid ${t.border}`, padding: 2 }}>
              {[['1д', 0], ['7д', 1], ['30д', 2], ['∞', 3]].map(([v, i]) => (
                <div key={i} style={{
                  flex: 1, padding: '5px 4px', fontSize: 10, textAlign: 'center', cursor: 'pointer',
                  fontFamily: KD_MONO, borderRadius: 3,
                  background: i === 1 ? t.accent : 'transparent',
                  color: i === 1 ? '#fff' : t.textSoft, fontWeight: i === 1 ? 700 : 500,
                }}>{v}</div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO, marginBottom: 6, letterSpacing: '0.05em' }}>— макс. применений</div>
            <div style={{ display: 'flex', background: t.bg, borderRadius: 4, border: `1px solid ${t.border}`, padding: 2 }}>
              {[['1', 0], ['5', 1], ['25', 2], ['50', 3], ['∞', 4]].map(([v, i]) => (
                <div key={i} style={{
                  flex: 1, padding: '5px 4px', fontSize: 10, textAlign: 'center', cursor: 'pointer',
                  fontFamily: KD_MONO, borderRadius: 3,
                  background: i === 3 ? t.accent : 'transparent',
                  color: i === 3 ? '#fff' : t.textSoft, fontWeight: i === 3 ? 700 : 500,
                }}>{v}</div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '10px 18px 14px', display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, padding: '8px 10px', background: t.bg, borderRadius: 4,
            border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO }}>при входе</span>
            <span style={{ fontSize: 11, color: t.text, fontWeight: 600, fontFamily: KD_MONO }}>→ #привет</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: t.textMute }}>⌄</span>
          </div>
          <div style={{ flex: 1, padding: '8px 10px', background: t.bg, borderRadius: 4,
            border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO }}>с ролью</span>
            <span style={{ fontSize: 11, color: t.text, fontWeight: 600 }}>друг</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: t.textMute }}>⌄</span>
          </div>
        </div>

        {/* sharing buttons */}
        <div style={{ padding: '12px 18px', background: t.panelAlt, borderTop: `1px solid ${t.border}`,
          borderBottom: `1px solid ${t.border}`, display: 'flex', gap: 6 }}>
          {[
            { ico: '⧉', l: 'копия' },
            { ico: '▦', l: 'QR' },
            { ico: '✉', l: 'почта' },
            { ico: '☏', l: 'смс' },
            { ico: 'tg', l: 'telegram' },
            { ico: '⇪', l: 'ещё' },
          ].map((x, i) => (
            <div key={i} style={{
              flex: 1, padding: '8px 4px', background: t.panel, border: `1px solid ${t.border}`,
              borderRadius: 4, textAlign: 'center', cursor: 'pointer',
            }}>
              <div style={{ fontSize: 13, color: t.textSoft, marginBottom: 1, fontFamily: KD_MONO, fontWeight: 700 }}>{x.ico}</div>
              <div style={{ fontSize: 9, color: t.textSoft, fontFamily: KD_MONO }}>{x.l}</div>
            </div>
          ))}
        </div>

        {/* recent invites */}
        <div style={{ padding: '12px 18px 14px' }}>
          <div style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO, marginBottom: 6,
            letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between' }}>
            <span>— активные приглашения · 3</span>
            <span style={{ cursor: 'pointer', color: t.textSoft }}>отозвать все</span>
          </div>
          {[
            { code: 'kofe-uV7p', who: 'аня', uses: '14/50', exp: 'через 6д', mine: true },
            { code: 'morn-A2x9', who: 'Лев', uses: '2/5', exp: 'через 23ч' },
            { code: 'team-9Lkm', who: 'аня', uses: '∞', exp: 'не истекает', mine: true },
          ].map((inv, i, arr) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
              borderBottom: i < arr.length - 1 ? `1px solid ${t.borderSoft}` : 'none',
            }}>
              <span style={{ fontSize: 11, fontFamily: KD_MONO, color: inv.mine ? t.accent : t.text, fontWeight: 700 }}>
                /{inv.code}
              </span>
              <span style={{ fontSize: 10, color: t.textSoft }}>создал <b style={{ color: t.text }}>{inv.who}</b></span>
              <span style={{ flex: 1 }}/>
              <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>{inv.uses}</span>
              <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>· {inv.exp}</span>
              <span style={{ fontSize: 13, color: t.textMute, cursor: 'pointer', padding: '0 4px' }}>×</span>
            </div>
          ))}
        </div>
      </div>
    </KD_ModalStage>
  );
}

// ─── 2. КОМАНДНАЯ ПАЛИТРА ⌘K ───────────────────────────────────────────
function FinalPalette({ t }) {
  const Row = ({ icon, name, hint, kbd, active, color }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
      borderLeft: active ? `2px solid ${t.accent}` : '2px solid transparent',
      paddingLeft: active ? 10 : 12,
      background: active ? t.panelHi : 'transparent', borderRadius: 4,
      margin: '0 6px', cursor: 'pointer',
    }}>
      <div style={{ width: 22, height: 22, borderRadius: 4, background: color || t.panelAlt,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color ? '#fff' : t.textSoft, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{name}</div>
        {hint && <div style={{ fontSize: 10, color: t.textSoft, fontFamily: KD_MONO }}>{hint}</div>}
      </div>
      {kbd && (
        <div style={{ display: 'flex', gap: 3 }}>
          {kbd.split(' ').map((k, i) => (
            <span key={i} style={{
              padding: '1px 5px', background: t.bg, border: `1px solid ${t.border}`,
              borderRadius: 3, fontSize: 9, color: t.textMute, fontFamily: KD_MONO,
            }}>{k}</span>
          ))}
        </div>
      )}
    </div>
  );
  const Section = ({ title, children }) => (
    <div style={{ paddingTop: 6 }}>
      <div style={{ padding: '4px 14px 2px', fontSize: 9, color: t.textMute, fontFamily: KD_MONO,
        letterSpacing: '0.06em', display: 'flex', justifyContent: 'space-between' }}>
        <span>— {title}</span>
      </div>
      {children}
    </div>
  );
  return (
    <KD_ModalStage t={t}>
      <div style={{
        width: 640, marginTop: -200, background: t.panel,
        borderRadius: 10, overflow: 'hidden', border: `1px solid ${t.border}`,
        boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
      }}>
        {/* search input */}
        <div style={{
          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: `1px solid ${t.border}`, background: t.panelAlt,
        }}>
          <Icon.Search width={16} height={16} style={{ color: t.textMute }}/>
          <input readOnly value="ма"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 15, color: t.text, fontFamily: KD_FONT, fontWeight: 500,
            }}/>
          <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>8 совпадений</span>
          <span style={{
            padding: '2px 6px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 3,
            fontSize: 9, color: t.textMute, fontFamily: KD_MONO,
          }}>esc</span>
        </div>

        <div style={{ maxHeight: 420, overflow: 'hidden' }}>
          <Section title="недавнее">
            <Row icon="#" name="болталка" hint="общение · 12 непрочитанных" kbd="⌘ 1"/>
            <Row icon="М" color="#d68b6c" name="Маша Тёплая" hint="ЛС · была минуту назад"/>
          </Section>

          <Section title="каналы · 3">
            <Row icon="#" name="кухня" hint="общение · 23 подп." active/>
            <Row icon="#" name="как-дела" hint="общение · 2 упоминания"/>
            <Row icon="♪" name="у камина" hint="голосовой · 4 в эфире" color={t.accent}/>
          </Section>

          <Section title="люди · 3">
            <Row icon="М" color="#d68b6c" name="Маша Тёплая" hint="пьёт какао · #болталка"/>
            <Row icon="М" color="#a87b56" name="Максим Хр" hint="не в сети · был 3ч назад"/>
            <Row icon="М" color="#9c7f5e" name="Марк С (друг)" hint="играет в Hades"/>
          </Section>

          <Section title="действия">
            <Row icon="+" name="создать канал «ма…»" hint="новый текстовый канал" kbd="⌘ ⇧ N"/>
            <Row icon="@" name="перейти к упоминаниям" hint="входящие · 2 непрочитанных" kbd="⌘ ⇧ M"/>
            <Row icon="☾" name="не беспокоить · 1 час" hint="заглушить все уведомления" kbd="⌘ ⇧ D"/>
          </Section>
        </div>

        {/* footer hints */}
        <div style={{
          padding: '8px 14px', background: t.panelAlt, borderTop: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', gap: 14, fontSize: 10, color: t.textMute, fontFamily: KD_MONO,
        }}>
          <span><b style={{ color: t.text }}>↑↓</b> навигация</span>
          <span><b style={{ color: t.text }}>⏎</b> открыть</span>
          <span><b style={{ color: t.text }}>⇥</b> заменить запрос</span>
          <span><b style={{ color: t.text }}>?</b> подсказка</span>
          <span style={{ flex: 1 }}/>
          <span>palette · v2</span>
        </div>
      </div>
    </KD_ModalStage>
  );
}

// ─── 3. ЛАЙТБОКС ───────────────────────────────────────────────────────
function FinalLightbox({ t }) {
  const isDark = t.name === 'dark';
  return (
    <div style={{
      width: '100%', height: '100%', background: '#0a0805', color: '#e8ddc4',
      fontFamily: KD_FONT, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* top bar */}
      <div style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Avatar name="Костя" color="#a87b56" size={32}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e8ddc4' }}>
            Костя Дн <span style={{ color: 'rgba(232,221,196,0.55)', fontWeight: 500 }}>в</span>
            <span style={{ color: '#e8a05c', fontFamily: KD_MONO, marginLeft: 4 }}>#болталка</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(232,221,196,0.55)', fontFamily: KD_MONO, marginTop: 1 }}>
            21.05.2026 · 09:22 · pour-over-recipe.jpg · 1620×1080 · 1.2 MB
          </div>
        </div>
        {[
          { ico: '⤓', l: 'скачать' },
          { ico: '⧉', l: 'копия' },
          { ico: '↗', l: 'к сообщению' },
          { ico: '⇪', l: 'поделиться' },
        ].map((x, i) => (
          <div key={i} title={x.l} style={{
            width: 32, height: 32, borderRadius: 4, background: 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#e8ddc4', fontSize: 15, cursor: 'pointer', fontFamily: KD_MONO,
          }}>{x.ico}</div>
        ))}
        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }}/>
        <div style={{
          width: 32, height: 32, borderRadius: 4, background: 'rgba(200,67,47,0.18)',
          color: '#e07060', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 16, fontFamily: KD_MONO,
        }}>×</div>
      </div>

      {/* main image + arrows */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{
          position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
          width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e8ddc4',
          fontSize: 22, cursor: 'pointer', fontFamily: KD_MONO,
        }}>‹</div>
        <div style={{
          position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
          width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e8ddc4',
          fontSize: 22, cursor: 'pointer', fontFamily: KD_MONO,
        }}>›</div>

        {/* image placeholder — striped frame imitates a photo */}
        <div style={{
          width: 840, height: 540, borderRadius: 8, overflow: 'hidden',
          background: `repeating-linear-gradient(135deg, #2a241b 0 14px, #221d15 14px 28px)`,
          position: 'relative', boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
        }}>
          <div style={{
            position: 'absolute', inset: 24, border: '1px dashed rgba(232,221,196,0.18)', borderRadius: 4,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <div style={{
              padding: '8px 14px', background: 'rgba(232,221,196,0.08)', borderRadius: 4,
              fontFamily: KD_MONO, fontSize: 11, color: 'rgba(232,221,196,0.6)',
            }}>фото · 1620 × 1080</div>
            <div style={{ fontSize: 13, color: 'rgba(232,221,196,0.7)', fontWeight: 600 }}>pour-over-recipe.jpg</div>
            <div style={{ fontSize: 10, color: 'rgba(232,221,196,0.4)', fontFamily: KD_MONO }}>
              ☕ воронка hario v60 · 22г кофе · 360 мл воды · 3:30
            </div>
          </div>
        </div>
      </div>

      {/* footer: reactions + thumbnail strip + position */}
      <div style={{
        padding: '10px 20px 14px', background: 'rgba(0,0,0,0.4)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[{e:'☕',c:5},{e:'🔥',c:3},{e:'❤',c:2}].map((r, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                padding: '3px 8px', borderRadius: 4, fontSize: 11, color: '#e8ddc4',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span>{r.e}</span>
                <span style={{ fontFamily: KD_MONO, fontSize: 10, color: 'rgba(232,221,196,0.7)' }}>{r.c}</span>
              </div>
            ))}
            <div style={{
              padding: '3px 8px', borderRadius: 4, fontSize: 13, color: 'rgba(232,221,196,0.5)',
              border: '1px dashed rgba(255,255,255,0.12)', cursor: 'pointer',
            }}>+</div>
          </div>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 10, color: 'rgba(232,221,196,0.5)', fontFamily: KD_MONO }}>
            3 из 8 · из канала #болталка
          </span>
        </div>
        {/* thumbnails */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[0,1,2,3,4,5,6,7].map(i => {
            const active = i === 2;
            return (
              <div key={i} style={{
                width: 56, height: 40, borderRadius: 3,
                background: `repeating-linear-gradient(${30 + i * 30}deg, #2a241b 0 6px, #1a1610 6px 12px)`,
                opacity: active ? 1 : 0.5, cursor: 'pointer',
                boxShadow: active ? '0 0 0 2px #9bb083' : undefined,
                position: 'relative',
              }}>
                {i === 5 && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 11, fontFamily: KD_MONO, fontWeight: 700,
                  }}>▶ 0:42</div>
                )}
              </div>
            );
          })}
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 10, color: 'rgba(232,221,196,0.4)', fontFamily: KD_MONO }}>
            ← →  esc · space ⏵
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 4. НАСТРОЙКИ КАНАЛА ───────────────────────────────────────────────
function FinalChannelSettings({ t, mode = 'edit' }) {
  const Tab = ({ name, active, danger }) => (
    <div style={{
      padding: '7px 12px', fontSize: 12, cursor: 'pointer', borderRadius: 4,
      background: active ? t.panelHi : 'transparent',
      color: danger ? t.danger : active ? t.text : t.textSoft,
      fontWeight: active ? 700 : 500,
      borderLeft: active ? `2px solid ${t.accent}` : '2px solid transparent',
      paddingLeft: active ? 10 : 12,
    }}>{name}</div>
  );
  const Field = ({ label, mono, value, extra }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO, marginBottom: 4, letterSpacing: '0.05em' }}>— {label}</div>
      <div style={{
        padding: '8px 11px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 4,
        fontSize: 12, color: t.text, fontFamily: mono ? KD_MONO : KD_FONT,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {value}
        <span style={{ flex: 1 }}/>
        {extra && <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>{extra}</span>}
      </div>
    </div>
  );
  const Toggle = ({ label, hint, on }) => (
    <div style={{
      padding: '8px 0', borderBottom: `1px solid ${t.borderSoft}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{label}</div>
        <div style={{ fontSize: 10, color: t.textSoft, marginTop: 1 }}>{hint}</div>
      </div>
      <div style={{
        width: 32, height: 18, borderRadius: 9,
        background: on ? t.accent : t.border,
        position: 'relative', cursor: 'pointer',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: on ? 16 : 2, width: 14, height: 14,
          borderRadius: 7, background: '#fff', transition: 'left .15s',
        }}/>
      </div>
    </div>
  );

  return (
    <KD_ModalStage t={t}>
      <div style={{
        width: 760, height: 580, background: t.panel,
        borderRadius: 10, overflow: 'hidden', border: `1px solid ${t.border}`,
        boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* header */}
        <div style={{
          padding: '12px 18px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', gap: 10, background: t.panelAlt,
        }}>
          <Icon.Hash width={14} height={14} style={{ color: t.textSoft }}/>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>
            болталка
            <span style={{ color: t.textMute, fontWeight: 400, marginLeft: 6, fontSize: 12 }}>· настройки канала</span>
          </div>
          <span style={{ flex: 1 }}/>
          <span style={{
            padding: '2px 7px', background: t.accentBg, color: t.accent, borderRadius: 3,
            fontSize: 9, fontWeight: 700, fontFamily: KD_MONO, letterSpacing: '0.05em',
          }}>ХОЗ</span>
          <span style={{ fontSize: 14, color: t.textMute, cursor: 'pointer', padding: '0 6px' }}>×</span>
        </div>

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* left tabs */}
          <div style={{
            width: 200, background: t.panelAlt, borderRight: `1px solid ${t.border}`,
            padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 1,
          }}>
            <Tab name="обзор" active/>
            <Tab name="разрешения"/>
            <Tab name="приглашения"/>
            <Tab name="уведомления"/>
            <Tab name="закреплённые"/>
            <Tab name="интеграции"/>
            <Tab name="вебхуки"/>
            <div style={{ height: 1, background: t.border, margin: '8px 8px' }}/>
            <Tab name="архивировать"/>
            <Tab name="удалить канал" danger/>
            <div style={{ flex: 1 }}/>
            <div style={{
              padding: '8px 10px', background: t.bg, borderRadius: 4,
              fontSize: 9, color: t.textMute, fontFamily: KD_MONO, lineHeight: 1.4,
            }}>
              канал · #1284<br/>
              создан 12.03.2026<br/>
              <b style={{ color: t.text }}>аня</b> · 67 дней назад
            </div>
          </div>

          {/* content */}
          <div style={{ flex: 1, padding: '16px 20px', overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12 }}>обзор</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12 }}>
              <Field label="название" mono value={<><span style={{ color: t.textMute }}>#</span> болталка</>}/>
              <Field label="тип канала" value="текстовый" extra="⌄"/>
            </div>
            <Field label="о чём канал" value="как ты сегодня? расскажи в двух словах"/>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="медленный режим" value="выкл" extra="⌄"/>
              <Field label="автоудаление сообщений" value="через 30 дней" extra="⌄"/>
            </div>

            <div style={{ marginTop: 4 }}>
              <Toggle label="канал по умолчанию" hint="новые участники автоматически попадают сюда" on/>
              <Toggle label="только для своих" hint="недоступен по приглашению «друг»" on={false}/>
              <Toggle label="NSFW · 18+" hint="скрывать превью и блюрить медиа" on={false}/>
              <Toggle label="треды разрешены" hint="можно ответить веткой на любое сообщение" on/>
            </div>

            <div style={{
              marginTop: 16, padding: '10px 12px', background: t.bg,
              border: `1px dashed ${t.border}`, borderRadius: 4,
              fontSize: 10, color: t.textSoft, fontFamily: KD_MONO, lineHeight: 1.5,
            }}>
              {'> 32 непрочитанных изменения сохранятся автоматически'}<br/>
              {'> чтобы сбросить — ⌘ . или закрой окно'}
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{
          padding: '10px 18px', borderTop: `1px solid ${t.border}`, background: t.panelAlt,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>
            ● не сохранено · 3 изменения
          </span>
          <span style={{ flex: 1 }}/>
          <div style={{
            padding: '6px 14px', borderRadius: 4, fontSize: 11, fontWeight: 600,
            color: t.textSoft, cursor: 'pointer',
          }}>отмена</div>
          <div style={{
            padding: '6px 14px', borderRadius: 4, fontSize: 11, fontWeight: 700,
            background: t.accent, color: '#fff', fontFamily: KD_MONO, cursor: 'pointer',
          }}>сохранить ⌘⏎</div>
        </div>
      </div>
    </KD_ModalStage>
  );
}

// ─── 5. СОСТОЯНИЯ СОЕДИНЕНИЯ ───────────────────────────────────────────
// Один кадр показывает оба состояния: офлайн-баннер под шапкой + toast снизу
function FinalConnection({ t, variant = 'both' }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text,
      fontFamily: KD_FONT, display: 'flex', overflow: 'hidden',
    }}>
      <KD_ServerRail t={t}/>
      <KD_ChannelList t={t}/>
      <div style={{ flex: 1, background: t.bg, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
        <KD_ChannelHeader t={t}
          icon={<Icon.Hash width={14} height={14} style={{ color: t.textSoft }}/>}
          name="болталка" topic="как ты сегодня?" stats="2 087 · 23"/>

        {/* офлайн-баннер */}
        {(variant === 'both' || variant === 'offline') && (
          <div style={{
            padding: '8px 16px', background: t.warmBg,
            borderBottom: `1px solid ${t.warmSoft}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, background: t.warm,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              color: '#fff', fontSize: 13, fontFamily: KD_MONO, fontWeight: 700 }}>!</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.warmDeep }}>
                ты офлайн · показываем последнее, что успели загрузить
              </div>
              <div style={{ fontSize: 10, color: t.textSoft, marginTop: 1, fontFamily: KD_MONO }}>
                последняя синхронизация: 14:23 · 5 мин назад · 3 неотправленных сообщения в очереди
              </div>
            </div>
            <div style={{ padding: '4px 10px', background: t.warm, color: '#fff', borderRadius: 4,
              fontSize: 10, fontWeight: 700, fontFamily: KD_MONO, cursor: 'pointer' }}>попробовать ↻</div>
          </div>
        )}

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <KD_ChatBody t={t}/>
        </div>
        <KD_Composer t={t}/>

        {/* reconnect toast */}
        {(variant === 'both' || variant === 'toast') && (
          <div style={{
            position: 'absolute', left: '50%', bottom: 110, transform: 'translateX(-50%)',
            padding: '10px 14px', background: t.name === 'dark' ? '#332b21' : '#2a2418',
            color: t.name === 'dark' ? '#e8ddc4' : '#fff', borderRadius: 6,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', gap: 12, minWidth: 360,
            border: `1px solid ${t.border}`,
          }}>
            {/* spinner placeholder */}
            <div style={{ width: 16, height: 16, borderRadius: 8, position: 'relative', flexShrink: 0 }}>
              <div style={{
                position: 'absolute', inset: 0, border: `2px solid ${t.name === 'dark' ? '#5a4128' : '#5e5440'}`,
                borderRadius: 8, opacity: 0.4,
              }}/>
              <div style={{
                position: 'absolute', inset: 0, border: `2px solid transparent`,
                borderTopColor: t.warm, borderRadius: 8,
              }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>соединение потеряно</div>
              <div style={{ fontSize: 10, opacity: 0.7, fontFamily: KD_MONO, marginTop: 1 }}>
                переподключаемся… попытка 2 · через 2.1с
              </div>
            </div>
            <div style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.08)', color: 'inherit',
              borderRadius: 3, fontSize: 10, fontWeight: 700, fontFamily: KD_MONO, cursor: 'pointer' }}>
              сейчас
            </div>
            <span style={{ padding: '0 4px', cursor: 'pointer', opacity: 0.6, fontSize: 13, fontFamily: KD_MONO }}>×</span>
          </div>
        )}
      </div>
      <KD_MemberList t={t}/>
    </div>
  );
}

// ─── 6. ПУСТЫЕ СОСТОЯНИЯ ───────────────────────────────────────────────
function KD_Empty({ t, glyph, title, body, cta, kbd }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text,
      fontFamily: KD_FONT, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 14, background: t.accentBg,
        border: `1px dashed ${t.accent}`, color: t.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 30, fontFamily: KD_MONO, fontWeight: 700,
      }}>{glyph}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: t.text, textAlign: 'center', marginTop: 4 }}>
        {title}
      </div>
      <div style={{
        fontSize: 12, color: t.textSoft, textAlign: 'center', maxWidth: 260,
        lineHeight: 1.5, whiteSpace: 'pre-line',
      }}>{body}</div>
      {cta && (
        <div style={{
          padding: '7px 14px', background: t.accent, color: '#fff', borderRadius: 4,
          fontSize: 11, fontWeight: 700, fontFamily: KD_MONO, marginTop: 4,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>{cta}{kbd && <span style={{
          padding: '0 5px', background: 'rgba(255,255,255,0.18)', borderRadius: 2,
          fontSize: 9, fontWeight: 700,
        }}>{kbd}</span>}</div>
      )}
    </div>
  );
}

function FinalEmpties({ t }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text,
      fontFamily: KD_FONT, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
    }}>
      <div style={{ borderRight: `1px solid ${t.border}` }}>
        <div style={{
          padding: '8px 14px', background: t.panelAlt, borderBottom: `1px solid ${t.border}`,
          fontSize: 11, color: t.textSoft, fontFamily: KD_MONO,
        }}>
          <Icon.Hash width={11} height={11} style={{ display: 'inline', verticalAlign: -1 }}/>
          {' '}новый-канал · только что создан
        </div>
        <KD_Empty t={t}
          glyph="✎"
          title="канал пустой — напиши первым"
          body={'история начнётся с твоего сообщения.\nможно про погоду, можно про планы — как удобнее.'}
          cta="написать привет" kbd="⏎"/>
      </div>
      <div style={{ borderRight: `1px solid ${t.border}` }}>
        <div style={{
          padding: '8px 14px', background: t.panelAlt, borderBottom: `1px solid ${t.border}`,
          fontSize: 11, color: t.textSoft, fontFamily: KD_MONO,
        }}>
          <Icon.Inbox width={11} height={11} style={{ display: 'inline', verticalAlign: -1 }}/>
          {' '}входящие · ни одного упоминания
        </div>
        <KD_Empty t={t}
          glyph="@"
          title="тебя никто не звал — и это нормально"
          body={'упоминания, ответы и треды соберём сюда —\nможно спокойно жить, ничего не теряя.'}
          cta="посмотреть всё" kbd="g i"/>
      </div>
      <div>
        <div style={{
          padding: '8px 14px', background: t.panelAlt, borderBottom: `1px solid ${t.border}`,
          fontSize: 11, color: t.textSoft, fontFamily: KD_MONO,
        }}>
          ▦ файлы в #болталка · ничего не загружено
        </div>
        <KD_Empty t={t}
          glyph="▦"
          title="тут пока пусто"
          body={'перетащи файл в окно или нажми + в композере.\nкартинки, видео, документы до 100 мб.'}
          cta="загрузить файл" kbd="⌘ U"/>
      </div>
    </div>
  );
}

// ─── 7. ЗАГРУЗКА ФАЙЛА В КОМПОЗЕРЕ ─────────────────────────────────────
function KD_UploadComposer({ t }) {
  const files = [
    { name: 'IMG_8842.heic', size: '4.8 MB', prog: 100, done: true, ext: 'HEIC', kind: 'image' },
    { name: 'pour-over-recipe.pdf', size: '320 KB · 12 стр.', prog: 68, ext: 'PDF', kind: 'doc' },
    { name: 'кухня-стрим.mp4', size: '184 MB · 03:24', prog: 23, ext: 'MP4', kind: 'video' },
    { name: 'кофе-таблица.numbers', size: '24 KB', prog: 0, queued: true, ext: 'NUM', kind: 'doc' },
  ];
  const Chip = (f, i) => {
    const isImg = f.kind === 'image';
    return (
      <div key={i} style={{
        background: t.panelAlt, border: `1px solid ${f.done ? t.accent : t.border}`,
        borderRadius: 4, padding: 8, display: 'flex', gap: 10, alignItems: 'center',
        position: 'relative', overflow: 'hidden', minWidth: 0,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 4, flexShrink: 0,
          background: isImg
            ? `repeating-linear-gradient(135deg, #c98870 0 6px, #a87b56 6px 12px)`
            : f.kind === 'video'
              ? `repeating-linear-gradient(135deg, #5d6f4c 0 6px, #43533a 6px 12px)`
              : t.bg,
          border: `1px solid ${t.border}`,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700, fontFamily: KD_MONO,
        }}>{isImg || f.kind === 'video' ? '' : f.ext}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontSize: 12, fontWeight: 600, color: t.text,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220,
            }}>{f.name}</span>
            <span style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO }}>{f.ext}</span>
          </div>
          <div style={{ fontSize: 10, color: t.textSoft, fontFamily: KD_MONO, marginTop: 1 }}>
            {f.queued
              ? <>в очереди · 4 из 4</>
              : f.done
                ? <>✓ загружено · {f.size}</>
                : <>{f.size} · <span style={{ color: t.accent }}>{f.prog}%</span> · ↑ minio</>}
          </div>
          {/* progress bar */}
          {!f.queued && (
            <div style={{ marginTop: 5, height: 3, background: t.bg, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${f.prog}%`, height: '100%',
                background: f.done ? t.accent : t.warm,
                transition: 'width .2s',
              }}/>
            </div>
          )}
          {f.queued && (
            <div style={{ marginTop: 5, height: 3, background: t.bg, borderRadius: 2,
              backgroundImage: `repeating-linear-gradient(90deg, ${t.border} 0 4px, transparent 4px 8px)` }}/>
          )}
        </div>
        <div style={{
          width: 22, height: 22, borderRadius: 4, color: t.textMute,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, cursor: 'pointer', flexShrink: 0, fontFamily: KD_MONO,
        }}>×</div>
      </div>
    );
  };
  return (
    <div style={{ padding: '8px 16px 14px', flexShrink: 0 }}>
      <div style={{
        background: t.panel, borderRadius: 6, border: `1px solid ${t.border}`,
        padding: 10, display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {/* aggregate progress strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px',
        }}>
          <span style={{
            padding: '2px 7px', background: t.warmBg, color: t.warmDeep,
            borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: KD_MONO,
          }}>↑ 3 из 4</span>
          <span style={{ fontSize: 11, color: t.text, fontWeight: 600 }}>
            идёт загрузка · <span style={{ color: t.accent }}>47%</span>
          </span>
          <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>
            91 / 213 MB · 1.4 MB/s · осталось ~1:23
          </span>
          <span style={{ flex: 1 }}/>
          <span style={{ fontSize: 10, color: t.textSoft, fontFamily: KD_MONO, cursor: 'pointer' }}>
            пауза
          </span>
          <span style={{ fontSize: 10, color: t.danger, fontFamily: KD_MONO, cursor: 'pointer' }}>
            отмена всех
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {files.map(Chip)}
        </div>

        {/* caption row */}
        <div style={{
          padding: '6px 10px', background: t.bg, borderRadius: 4, border: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Icon.Plus width={13} height={13} style={{ color: t.textMute }}/>
          <span style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>
            кстати, вот рецепт пуровера
          </span>
          <span style={{ fontSize: 11, color: t.textMute, marginLeft: 2 }}>|</span>
          <span style={{ flex: 1 }}/>
          <span style={{ fontSize: 10, fontFamily: KD_MONO, opacity: 0.7, color: t.textMute }}>md</span>
          <Icon.Smile width={14} height={14} style={{ color: t.textMute }}/>
          <div style={{
            padding: '4px 10px', background: t.textMute, color: t.bg,
            borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: KD_MONO,
            opacity: 0.6, cursor: 'not-allowed',
          }}>ждём загрузку…</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 5, paddingLeft: 4 }}>
        <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>
          ↑ файлы льются на свой сервер <b style={{ color: t.accent }}>kakdela.team / minio</b> · не уходят наружу
        </span>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>
          ⇧ перетащи ещё файлы сюда
        </span>
      </div>
    </div>
  );
}

function FinalUpload({ t }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text,
      fontFamily: KD_FONT, display: 'flex', overflow: 'hidden',
    }}>
      <KD_ServerRail t={t}/>
      <KD_ChannelList t={t}/>
      <div style={{ flex: 1, background: t.bg, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <KD_ChannelHeader t={t}
          icon={<Icon.Hash width={14} height={14} style={{ color: t.textSoft }}/>}
          name="болталка" topic="как ты сегодня?" stats="2 087 · 23"/>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <KD_ChatBody t={t}/>
        </div>
        <KD_UploadComposer t={t}/>
      </div>
      <KD_MemberList t={t}/>
    </div>
  );
}

window.FinalInvite = FinalInvite;
window.FinalPalette = FinalPalette;
window.FinalLightbox = FinalLightbox;
window.FinalChannelSettings = FinalChannelSettings;
window.FinalConnection = FinalConnection;
window.FinalEmpties = FinalEmpties;
window.FinalUpload = FinalUpload;
window.KD_ModalStage = KD_ModalStage;
