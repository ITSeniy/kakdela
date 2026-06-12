import { Avatar } from '../../components/Avatar.js'
import { Icon } from '../../components/Icon.js'

interface ParticipantTileProps {
  displayName: string
  avatarUrl?: string | null
  muted: boolean
  speaking: boolean
  isSelf?: boolean
  /**
   * Компактный вид для нижней полосы (dock) при развёрнутой карточке —
   * аватар 40px, та же логика speaking ring / mute-пилюли.
   */
  compact?: boolean
  /** Размер аватара, если раскладка знает размер карточки. */
  avatarSize?: number
  /** Клик по карточке (развернуть/свернуть, как в Discord). */
  onClick?(): void
}

const AVATAR_SIZE = 88
const AVATAR_SIZE_COMPACT = 40

/**
 * Карточка участника в духе Discord: чуть подсвеченный тёмный тайл,
 * круглый аватар в центре, имя-пилюля слева внизу, mute-пилюля справа
 * внизу, speaking — акцентное кольцо вокруг тайла.
 */
export function ParticipantTile({
  displayName,
  avatarUrl,
  muted,
  speaking,
  isSelf,
  compact,
  avatarSize: avatarSizeProp,
  onClick,
}: ParticipantTileProps) {
  const avatarSize = avatarSizeProp ?? (compact ? AVATAR_SIZE_COMPACT : AVATAR_SIZE)
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick() } : undefined}
      className={[
        'relative w-full h-full rounded-lg overflow-hidden flex items-center justify-center min-w-0',
        compact ? 'min-h-[72px]' : '',
        onClick ? 'cursor-pointer' : '',
      ].join(' ')}
      style={{
        // Тайл заметно светлее сцены (как в Discord), тёплый оттенок из
        // токенов; speaking-кольцо — box-shadow, чтобы не дёргать layout.
        background: 'color-mix(in srgb, var(--kd-stage), var(--kd-stage-text) 8%)',
        boxShadow: speaking
          ? '0 0 0 2px var(--kd-accent), var(--kd-shadow-tile)'
          : '0 0 0 0px var(--kd-accent), var(--kd-shadow-tile)',
        transition: 'box-shadow 200ms ease-out',
      }}
    >
      <Avatar
        name={displayName}
        avatarUrl={avatarUrl ?? null}
        size={avatarSize}
      />
      <div className={`absolute left-1.5 bottom-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded font-mono bg-kd-overlay-strong text-kd-stage-text ${compact ? 'max-w-[85%]' : ''}`}>
        <span className="text-[10px] font-semibold truncate">{displayName}</span>
        {isSelf && !compact && (
          <span className="text-[9px] font-bold text-kd-accent shrink-0">· вы</span>
        )}
      </div>
      {muted && (
        <div className="absolute right-1.5 bottom-1.5 flex items-center justify-center w-5 h-5 rounded bg-kd-overlay-strong">
          <Icon.MicOff size={11} className="text-kd-dnd" />
        </div>
      )}
    </div>
  )
}
