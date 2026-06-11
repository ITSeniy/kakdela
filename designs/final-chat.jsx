// Главный экран — чат канала. Работает для light/dark через theme prop.

function KD_GreetingBanner({ t }) {
  return (
    <div style={{
      margin: '8px 16px 4px', padding: '10px 14px',
      background: t.warmBg, borderRadius: KD_RADIUS,
      border: `1px solid ${t.warmSoft}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ fontSize: 22 }}>☕</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
          доброе утро, аня · как ты сегодня?
        </div>
        <div style={{ fontSize: 11, color: t.textSoft, marginTop: 1, fontFamily: KD_MONO }}>
          14 новых сообщений · 3 человека ждут ответа · 1 невыполненный созвон
        </div>
      </div>
      <div style={{
        padding: '4px 10px', background: t.warm, color: '#fff',
        borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: KD_MONO, cursor: 'pointer',
      }}>наверстать ⏵</div>
    </div>
  );
}

function KD_ChatBody({ t }) {
  return (
    <div style={{ flex: 1, overflow: 'hidden', padding: '8px 0', display: 'flex', flexDirection: 'column' }}>
      <KD_GreetingBanner t={t}/>
      <KD_DayDivider t={t} label="21.05.2026 · вт"/>
      <KD_Message t={t} name="Лев Морозов" color="#7d9268" time="09:14"
        text="доброе утро, котики 🌅 кто как спал?" role="хоз"
        reactions={[{emoji:'🌅',count:3},{emoji:'☕',count:5}]}/>
      <KD_Message t={t} name="Маша Тёплая" color="#d68b6c" time="09:17"
        text="плохо, кот будил каждые два часа. но настроение бодрое — иду пить какао"
        reactions={[{emoji:'🐈',count:4},{emoji:'💜',count:2}]}/>
      <KD_Message t={t} compact name="Маша Тёплая" color="#d68b6c" time="09:17"
        text="а у вас как утро?"/>
      <KD_Message t={t} name="Костя Дн" color="#a87b56" time="09:22"
        text="ребят, нашёл рецепт идеального пуровера. вечером покажу на стриме"
        replyTo={{ name: 'Лев', text: 'кто умеет варить кофе?' }}
        attachment={{ name: 'pour-over-recipe.jpg', size: '1.2 MB · 1620×1080', ext: 'JPG' }}/>
      <KD_Message t={t} name="аня" color={t.warm} time="09:28"
        text="я ещё сплю наполовину, но уже думаю про обед. кто на созвон в 11?"
        role="хоз" edited
        reactions={[{emoji:'✋',count:3},{emoji:'☕',count:5},{emoji:'🥐',count:1}]}/>
      <KD_Message t={t} compact name="Соня Н" color="#c98870" time="09:30"
        text="я буду! только сначала допишу одно письмо"/>
      <KD_Message t={t} compact name="Тима Р" color="#8d6e4d" time="09:31"
        text="+1"/>
      <KD_Message t={t} compact name="Влад К" color="#9c7f5e" time="09:33"
        text="меня не ждите, я на встрече до 12"/>
      <KD_Message t={t} name="Лев Морозов" color="#7d9268" time="09:35"
        text="окей, тогда созвон в 11. поставил напоминалку — придёт за 5 минут"
        role="хоз" reactions={[{emoji:'👍',count:4}]}/>
    </div>
  );
}

function FinalChat({ t }) {
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
          name="болталка"
          topic="как ты сегодня? расскажи в двух словах"
          stats="2 087 сообщ. · 23 подп."
        />
        <KD_ChatBody t={t}/>
        <KD_Composer t={t}/>
      </div>
      <KD_MemberList t={t}/>
    </div>
  );
}

window.FinalChat = FinalChat;
window.KD_ChatBody = KD_ChatBody;
window.KD_GreetingBanner = KD_GreetingBanner;
