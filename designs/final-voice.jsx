// Голосовой канал с демонстрацией экрана + чат-сайдбар звонка

function KD_StageTile({ t, name, color, kind, label, isShare, speaking, muted }) {
  return (
    <div style={{
      position: 'relative', borderRadius: KD_RADIUS, overflow: 'hidden',
      background: t.stage,
      boxShadow: speaking ? `0 0 0 2px ${t.accent}` : `0 2px 8px rgba(0,0,0,0.2)`,
      border: speaking ? 'none' : `1px solid ${t.border}`,
    }}>
      {isShare ? (
        <SharePlaceholder kind={kind} label={label} bg={t.stage} fg={t.stageText} stripe="#0a0805"/>
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(160deg, ${color}, ${color}99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Avatar name={name} color={color} size={48} ring="rgba(255,255,255,0.3)" ringColor="rgba(255,255,255,0.15)"/>
        </div>
      )}
      <div style={{
        position: 'absolute', left: 6, bottom: 6, display: 'flex', alignItems: 'center', gap: 4,
        background: 'rgba(10, 8, 4, 0.85)', padding: '2px 6px', borderRadius: 3,
        fontFamily: KD_MONO,
      }}>
        {muted && <Icon.MicOff width={9} height={9} style={{ color: '#e87060' }}/>}
        <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{name}</span>
        {isShare && <span style={{ fontSize: 9, color: t.accent, fontWeight: 700 }}>· SHARE</span>}
      </div>
      {isShare && (
        <div style={{
          position: 'absolute', right: 6, top: 6, fontSize: 9, color: '#fff',
          background: 'rgba(10,8,4,0.8)', padding: '2px 6px', borderRadius: 3,
          fontFamily: KD_MONO,
        }}>1080p · 30fps</div>
      )}
    </div>
  );
}

function KD_CallPhotoMsg({ t, name, color, time, caption, preview }) {
  return (
    <div style={{ padding: '6px 14px 8px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO, width: 36, flexShrink: 0, textAlign: 'right', paddingTop: 2 }}>{time}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color }}>{name}</span>
          <span style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO }}>прикрепил{name === 'Маша' || name === 'аня' || name === 'Соня' ? 'а' : ''} фото</span>
        </div>
        {/* preview */}
        <div style={{
          borderRadius: 4, overflow: 'hidden', border: `1px solid ${t.border}`,
          background: preview.bg, position: 'relative', maxWidth: 200,
          cursor: 'pointer',
        }}>
          <div style={{ aspectRatio: preview.ratio || '4/3', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
            {/* плейсхолдер-картинка через css */}
            {preview.kind === 'pour-over' && (
              <svg viewBox="0 0 100 80" width="100%" height="100%" style={{ opacity: 0.9 }}>
                <rect x="0" y="0" width="100" height="80" fill={preview.bg}/>
                <ellipse cx="50" cy="62" rx="20" ry="4" fill="rgba(20,15,10,0.3)"/>
                <path d="M 35 25 L 32 60 L 68 60 L 65 25 Z" fill="#3d2f24" opacity="0.85"/>
                <ellipse cx="50" cy="25" rx="15" ry="4" fill="#1a1208"/>
                <ellipse cx="50" cy="23" rx="14" ry="3" fill="#5d4332"/>
                <path d="M 50 14 Q 47 18 48 22 M 53 13 Q 51 17 52 22 M 47 13 Q 45 17 46 22" stroke="rgba(232,200,160,0.5)" strokeWidth="1" fill="none"/>
              </svg>
            )}
            {preview.kind === 'figma' && (
              <svg viewBox="0 0 120 80" width="100%" height="100%">
                <rect x="0" y="0" width="120" height="80" fill={preview.bg}/>
                <rect x="8" y="10" width="40" height="60" rx="3" fill={t.accent} opacity="0.3"/>
                <circle cx="28" cy="25" r="6" fill={t.accent}/>
                <rect x="18" y="36" width="20" height="2.5" rx="1" fill={t.accent}/>
                <rect x="14" y="42" width="28" height="2" rx="1" fill={t.accent} opacity="0.5"/>
                <rect x="56" y="10" width="56" height="36" rx="3" fill="#d68b6c" opacity="0.4"/>
                <rect x="56" y="50" width="26" height="20" rx="3" fill="#a87b56" opacity="0.4"/>
                <rect x="86" y="50" width="26" height="20" rx="3" fill="#7d9268" opacity="0.4"/>
              </svg>
            )}
          </div>
          <div style={{
            position: 'absolute', left: 6, bottom: 6,
            background: 'rgba(15,10,5,0.75)', color: '#fff',
            padding: '1px 5px', borderRadius: 3,
            fontSize: 9, fontFamily: KD_MONO,
          }}>{preview.name} · {preview.size}</div>
        </div>
        {caption && <div style={{ fontSize: 12, color: t.text, marginTop: 4, lineHeight: 1.4 }}>{caption}</div>}
      </div>
    </div>
  );
}

function KD_VoiceCallChat({ t }) {
  return (
    <div style={{
      width: 260, background: t.panel, borderRadius: KD_RADIUS,
      border: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{
        padding: '8px 12px', borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Icon.Hash width={12} height={12} style={{ color: t.textSoft }}/>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.text }}>чат у камина</span>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO }}>only call</span>
      </div>
      <div style={{ flex: 1, padding: '8px 0', overflow: 'hidden' }}>
        <KD_Message t={t} compact name="Костя" color="#a87b56" time="11:04" text="смотрите, баг был в роутере"/>
        <KD_Message t={t} compact name="Лев" color="#7d9268" time="11:05" text="ага, видно. локально воспроизводится?"/>
        <KD_Message t={t} compact name="Костя" color="#a87b56" time="11:05" text="да, сейчас покажу"/>
        <div style={{
          padding: '4px 16px', fontSize: 10, color: t.textMute, fontFamily: KD_MONO,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon.Monitor width={10} height={10} style={{ color: t.warm }}/>
          <span>Маша начала демонстрацию</span>
        </div>
        <KD_Message t={t} compact name="Маша" color="#d68b6c" time="11:08" text="гляньте редизайн профиля"/>
        <KD_CallPhotoMsg t={t} name="Маша" color="#d68b6c" time="11:08"
          caption="вот скрин старого варианта для сравнения"
          preview={{ kind: 'figma', name: 'profile-old.png', size: '1280×800', bg: t.bg, ratio: '3/2' }}/>
        <KD_Message t={t} compact name="аня" color={t.warm} time="11:09" text="о, нравится! акцент чуть теплее можно?"/>
        <KD_CallPhotoMsg t={t} name="Костя" color="#a87b56" time="11:11"
          caption="пуровер на вечер — настало время"
          preview={{ kind: 'pour-over', name: 'IMG_4071.jpg', size: '3.2 MB', bg: '#2a1f15', ratio: '4/3' }}/>
        <KD_Message t={t} compact name="Соня" color="#c98870" time="11:14" text="ммм, готовь к 19:00"/>
        <KD_Message t={t} compact name="Костя" color="#a87b56" time="11:16" text="@аня глянь логи в /var/log/api"/>
      </div>
      <div style={{ padding: 8, borderTop: `1px solid ${t.border}` }}>
        {/* мини-превью прикрепляемого фото */}
        <div style={{
          marginBottom: 6, padding: '4px 6px', background: t.panelAlt,
          borderRadius: 4, border: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 3,
            background: `linear-gradient(135deg, ${t.warm}, ${t.warmDeep})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13,
          }}>📷</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: t.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: KD_MONO }}>screen-2026-05.png</div>
            <div style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO }}>прикреплено · 248 КБ</div>
          </div>
          <span style={{ fontSize: 11, color: t.textMute, cursor: 'pointer', padding: '0 4px' }}>✕</span>
        </div>
        <div style={{
          background: t.panelAlt, borderRadius: 4, padding: '6px 8px',
          fontSize: 11, color: t.text, display: 'flex', alignItems: 'center', gap: 6,
          border: `1px solid ${t.border}`,
        }}>
          <Icon.Plus width={12} height={12} style={{ color: t.textMute, cursor: 'pointer' }}/>
          <span style={{ flex: 1, color: t.textMute }}>добавь подпись…</span>
          <Icon.Smile width={12} height={12} style={{ color: t.textMute, cursor: 'pointer' }}/>
          <span style={{
            fontSize: 9, fontFamily: KD_MONO, fontWeight: 700,
            background: t.accent, color: '#fff', padding: '1px 5px', borderRadius: 3, cursor: 'pointer',
          }}>⏎</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 5, paddingLeft: 4 }}>
          <span style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            📎 файл
          </span>
          <span style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            📷 фото
          </span>
          <span style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            ✂ скрин
          </span>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 9, color: t.textMute, fontFamily: KD_MONO }}>⌘V — вставить</span>
        </div>
      </div>
    </div>
  );
}

function KD_VCtrl({ t, icon, label, active, warn, hot }) {
  const bg = warn ? t.warm : hot ? t.accent : active ? t.panelHi : 'transparent';
  const color = warn || hot ? '#fff' : t.text;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
      background: bg, color, borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer',
      border: !warn && !hot && !active ? `1px solid ${t.border}` : '1px solid transparent',
    }}>{icon}{label}</div>
  );
}

function FinalVoice({ t }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.text,
      fontFamily: KD_FONT, display: 'flex', overflow: 'hidden',
    }}>
      <KD_ServerRail t={t}/>
      <KD_ChannelList t={t} active="у камина"/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: `1px solid ${t.border}`, background: t.panelAlt,
        }}>
          <Icon.Speaker width={14} height={14} style={{ color: t.accent }}/>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>у камина</div>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '1px 5px', background: t.accent, color: '#fff',
            borderRadius: 3, letterSpacing: '0.05em', fontFamily: KD_MONO,
          }}>LIVE</span>
          <div style={{ fontSize: 11, color: t.textSoft, fontFamily: KD_MONO }}>00:32:14</div>
          <div style={{ fontSize: 11, color: t.textSoft }}>· 5 человек · 2 экрана</div>
          <div style={{ flex: 1 }}/>
          <div style={{
            display: 'flex', gap: 2, padding: 2, background: t.panel,
            borderRadius: 4, border: `1px solid ${t.border}`,
          }}>
            {['моз.', 'фок.', 'сет.'].map((m, i) => (
              <div key={m} style={{
                padding: '3px 8px', fontSize: 10, fontWeight: 600, borderRadius: 3,
                background: i === 0 ? t.panelHi : 'transparent',
                color: i === 0 ? t.text : t.textSoft, cursor: 'pointer',
                fontFamily: KD_MONO,
              }}>{m}</div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: t.online, fontFamily: KD_MONO }}>● 38ms / 24kbps</div>
        </div>
        <div style={{ flex: 1, padding: 12, display: 'flex', gap: 10, minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
            <div style={{ flex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, minHeight: 0 }}>
              <KD_StageTile t={t} name="Костя · код" color="#a87b56" isShare kind="code" label="ssh prod-1.kakdela"/>
              <KD_StageTile t={t} name="Маша · Figma" color="#d68b6c" isShare kind="design" label="Profile redesign v3"/>
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, minHeight: 0 }}>
              <KD_StageTile t={t} name="Лев" color="#7d9268" speaking/>
              <KD_StageTile t={t} name="Костя" color="#a87b56"/>
              <KD_StageTile t={t} name="Маша" color="#d68b6c"/>
              <KD_StageTile t={t} name="Соня" color="#c98870" muted/>
              <KD_StageTile t={t} name="аня" color={t.warm}/>
            </div>
          </div>
          <KD_VoiceCallChat t={t}/>
        </div>
        <div style={{
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6,
          borderTop: `1px solid ${t.border}`, background: t.panelAlt,
        }}>
          <KD_VCtrl t={t} icon={<Icon.Mic width={13} height={13}/>} label="микро" active hot/>
          <KD_VCtrl t={t} icon={<Icon.Headphones width={13} height={13}/>} label="звук" active/>
          <KD_VCtrl t={t} icon={<Icon.Video width={13} height={13}/>} label="видео"/>
          <KD_VCtrl t={t} icon={<Icon.Monitor width={13} height={13}/>} label="демо" warn/>
          <KD_VCtrl t={t} icon={<Icon.Hand width={13} height={13}/>} label="рука"/>
          <KD_VCtrl t={t} icon={<Icon.Sparkle width={11} height={11}/>} label="реакции"/>
          <KD_VCtrl t={t} icon={<Icon.Settings width={13} height={13}/>} label="настр."/>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 10, color: t.textMute, fontFamily: KD_MONO, marginRight: 8 }}>
            CPU 12% · 234 mb · opus@48k
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            background: t.danger, borderRadius: 5, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            <Icon.PhoneOff width={12} height={12}/>
            выйти
          </div>
        </div>
      </div>
      <KD_MemberList t={t} highlightVoice/>
    </div>
  );
}

window.FinalVoice = FinalVoice;
window.KD_StageTile = KD_StageTile;
window.KD_VCtrl = KD_VCtrl;
