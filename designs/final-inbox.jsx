// Входящие — единый экран упоминаний, ответов и тредов

function KD_InboxTab({ t, label, count, active }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
      borderRadius: 4, cursor: 'pointer',
      background: active ? t.panelHi : 'transparent',
      borderLeft: active ? `2px solid ${t.accent}` : '2px solid transparent',
      paddingLeft: active ? 12 : 14,
      color: active ? t.text : t.textSoft,
      fontSize: 12, fontWeight: active ? 600 : 500,
    }}>
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && <span style={{
        fontSize: 10, color: count > 0 ? t.warm : t.textMute, fontFamily: KD_MONO, fontWeight: 700,
      }}>{count}</span>}
    </div>
  );
}

function KD_InboxRow({ t, dot, where, mention, snippet, who, color, time, replies, kind }) {
  const kindColor = { mention: t.warm, reply: t.accent, thread: '#a87b56', bookmark: t.accent };
  const kindLabel = { mention: 'упоминание', reply: 'ответ', thread: 'тред', bookmark: 'сохранено' };
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '12px 18px',
      borderBottom: `1px solid ${t.borderSoft}`, cursor: 'pointer',
      background: dot ? t.warmBg : 'transparent',
    }}>
      <div style={{ width: 3, alignSelf: 'stretch', background: dot ? t.warm : 'transparent', borderRadius: 2, flexShrink: 0 }}/>
      <Avatar name={who} color={color} size={32}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 6px', background: `${kindColor[kind]}22`,
            color: kindColor[kind], borderRadius: 3, fontFamily: KD_MONO,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{kindLabel[kind]}</span>
          <span style={{ fontSize: 11, color: t.textSoft, fontFamily: KD_MONO }}>{where}</span>
          <span style={{ flex: 1 }}/>
          <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>{time}</span>
        </div>
        <div style={{ fontSize: 13, color: t.text, lineHeight: 1.5 }}>
          <b>{who}:</b>{' '}
          {mention && <span style={{ color: t.warm, fontWeight: 600 }}>@аня </span>}
          {snippet}
        </div>
        {replies && (
          <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex' }}>
              {replies.users.map((u, i) => (
                <div key={i} style={{ marginLeft: i === 0 ? 0 : -6 }}>
                  <Avatar name={u.n} color={u.c} size={18} ring={t.bg} ringColor={t.bg}/>
                </div>
              ))}
            </div>
            <span style={{ fontSize: 11, color: t.textSoft }}>{replies.count} {replies.count === 1 ? 'ответ' : 'ответа'}</span>
            <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>· последний {replies.last}</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: t.textMute }}>
        <Icon.Pin width={13} height={13} style={{ cursor: 'pointer' }}/>
        <span style={{ fontSize: 10, fontFamily: KD_MONO, cursor: 'pointer' }}>✓</span>
      </div>
    </div>
  );
}

function FinalInbox({ t }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text,
      fontFamily: KD_FONT, display: 'flex', overflow: 'hidden',
    }}>
      <KD_ServerRail t={t} current=""/>
      {/* боковая навигация */}
      <div style={{
        width: 220, background: t.panel, borderRight: `1px solid ${t.border}`,
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, background: t.panelAlt }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>входящие</div>
          <div style={{ fontSize: 10, color: t.textMute, marginTop: 1, fontFamily: KD_MONO }}>14 новых · 6 упоминаний</div>
        </div>
        <div style={{ padding: '8px 4px' }}>
          <div style={{
            padding: '3px 10px', fontSize: 10, fontWeight: 700, color: t.textMute,
            fontFamily: KD_MONO, letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>— фильтры</div>
          <KD_InboxTab t={t} label="всё" count={14} active/>
          <KD_InboxTab t={t} label="упоминания" count={6}/>
          <KD_InboxTab t={t} label="ответы мне" count={4}/>
          <KD_InboxTab t={t} label="треды" count={3}/>
          <KD_InboxTab t={t} label="сохранённое" count={12}/>

          <div style={{
            padding: '12px 10px 3px', fontSize: 10, fontWeight: 700, color: t.textMute,
            fontFamily: KD_MONO, letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>— по комнатам</div>
          {[
            { l: 'Д', n: 'Друзья и кофе', c: t.accent, count: 8 },
            { l: 'Б', n: 'Бук-клуб', c: t.warm, count: 4 },
            { l: 'ПК', n: 'Полночный код', c: '#8a6e4d', count: 2 },
          ].map(s => (
            <div key={s.n} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
              borderRadius: 4, cursor: 'pointer', margin: '0 4px',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 3, background: s.c, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
              }}>{s.l}</div>
              <span style={{ flex: 1, fontSize: 12, color: t.text }}>{s.n}</span>
              <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>{s.count}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}/>
        <KD_UserBar t={t}/>
      </div>
      {/* список */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: `1px solid ${t.border}`, background: t.panelAlt,
        }}>
          <Icon.Inbox width={14} height={14} style={{ color: t.warm }}/>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>входящие</div>
          <span style={{
            fontSize: 9, padding: '1px 5px', background: t.warm, color: '#fff',
            borderRadius: 3, fontFamily: KD_MONO, fontWeight: 700,
          }}>14</span>
          <div style={{ width: 1, height: 14, background: t.border }}/>
          <span style={{ fontSize: 11, color: t.textSoft }}>всё, что просит твоего внимания</span>
          <div style={{ flex: 1 }}/>
          <div style={{
            display: 'flex', gap: 2, padding: 2, background: t.panel,
            borderRadius: 4, border: `1px solid ${t.border}`,
          }}>
            {['все', 'непрочит.', 'мои'].map((m, i) => (
              <div key={m} style={{
                padding: '3px 8px', fontSize: 10, fontWeight: 600, borderRadius: 3,
                background: i === 1 ? t.panelHi : 'transparent',
                color: i === 1 ? t.text : t.textSoft, cursor: 'pointer',
                fontFamily: KD_MONO,
              }}>{m}</div>
            ))}
          </div>
          <div style={{
            padding: '4px 10px', borderRadius: 4, border: `1px solid ${t.border}`,
            fontSize: 11, color: t.text, fontFamily: KD_MONO, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>отметить всё ✓</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{
            padding: '6px 18px', fontSize: 10, fontWeight: 700, color: t.textMute,
            fontFamily: KD_MONO, letterSpacing: '0.05em', textTransform: 'uppercase',
            background: t.bgDeep, borderBottom: `1px solid ${t.borderSoft}`,
          }}>— сегодня</div>

          <KD_InboxRow t={t} dot kind="mention"
            where="Друзья и кофе · #болталка"
            who="Костя Дн" color="#a87b56" time="3 мин"
            mention snippet="глянь логи в /var/log/api — там стек-трейс который я искал утром"/>

          <KD_InboxRow t={t} dot kind="reply"
            where="Друзья и кофе · #дизайн"
            who="Маша Тёплая" color="#d68b6c" time="14 мин"
            snippet="о, тогда возьмём твой вариант. я перерисую сегодня к 6"
            replies={{ count: 3, last: '8 мин',
              users: [
                { n: 'Маша', c: '#d68b6c' },
                { n: 'аня', c: t.warm },
                { n: 'Лев', c: '#7d9268' },
              ]}}/>

          <KD_InboxRow t={t} dot kind="thread"
            where="Бук-клуб · #обсуждение → тред «Архипелаг ГУЛАГ»"
            who="Лев Морозов" color="#7d9268" time="1ч"
            snippet="перечитал главу 4 — мне кажется, мы пропустили важную деталь про лагерное самоуправление"
            replies={{ count: 12, last: '32 мин',
              users: [
                { n: 'Лев', c: '#7d9268' },
                { n: 'Юля', c: '#b88c4e' },
                { n: 'Тима', c: '#8d6e4d' },
              ]}}/>

          <KD_InboxRow t={t} kind="mention"
            where="Полночный код · #дизайн"
            who="Гриша П" color="#6e6856" time="2ч"
            mention snippet="у меня вопрос по токенам — почему мы решили отказаться от oklch?"/>

          <KD_InboxRow t={t} kind="reply"
            where="Друзья и кофе · #болталка"
            who="Соня Н" color="#c98870" time="3ч"
            snippet="я буду! только сначала допишу одно письмо"/>

          <div style={{
            padding: '6px 18px', fontSize: 10, fontWeight: 700, color: t.textMute,
            fontFamily: KD_MONO, letterSpacing: '0.05em', textTransform: 'uppercase',
            background: t.bgDeep, borderBottom: `1px solid ${t.borderSoft}`,
          }}>— вчера</div>

          <KD_InboxRow t={t} kind="bookmark"
            where="Друзья и кофе · #кухня"
            who="Костя Дн" color="#a87b56" time="вчера"
            snippet="рецепт идеального пуровера — настало время. файл вложен"/>

          <KD_InboxRow t={t} kind="thread"
            where="Друзья и кофе · #дизайн → тред «иконки 2.0»"
            who="Маша Тёплая" color="#d68b6c" time="вчера"
            snippet="готов набор из 84 иконок. в фигме под тегом v2-final"
            replies={{ count: 6, last: 'вчера',
              users: [
                { n: 'Маша', c: '#d68b6c' },
                { n: 'аня', c: t.warm },
              ]}}/>

          <KD_InboxRow t={t} kind="mention"
            where="Соседи · #объявления"
            who="Гена Х" color="#a89684" time="2 дня"
            mention snippet="у нас в субботу субботник, кто пойдёт? записываемся в треде"/>
        </div>
        <div style={{
          padding: '8px 18px', borderTop: `1px solid ${t.border}`, background: t.panelAlt,
          fontSize: 10, color: t.textMute, fontFamily: KD_MONO,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <span>j / k — навигация</span>
          <span>e — отметить как прочитанное</span>
          <span>⏎ — открыть в канале</span>
          <span style={{ flex: 1 }}/>
          <span>обновлено только что</span>
        </div>
      </div>
    </div>
  );
}

window.FinalInbox = FinalInbox;
