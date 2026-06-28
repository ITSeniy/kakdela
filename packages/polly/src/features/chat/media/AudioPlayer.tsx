// Аудио-плеер вложений: компактная панель в стиле чата вместо нативного
// <audio controls>. Сам <audio> скрыт и работает движком.

import type { Attachment } from '@kakdela/ginzu/api-types'

import { Icon } from '../../../components/Icon.js'
import { IconButton, PlayPauseButton, Seekbar, fmtTime } from './controls.js'
import { useMediaPlayer } from './useMediaPlayer.js'

export function AudioPlayer({ attachment }: { attachment: Attachment }) {
  const p = useMediaPlayer<HTMLAudioElement>()
  const frac = p.duration > 0 ? p.currentTime / p.duration : 0
  const buf = p.duration > 0 ? p.buffered / p.duration : 0

  return (
    <div className="px-3 py-2.5 bg-kd-panel-alt rounded-kd border border-kd-border w-[400px] max-w-full">
      <audio ref={p.setRef} preload="metadata" src={attachment.url} className="hidden" />
      <div className="text-[11px] text-kd-text font-mono truncate mb-2">{attachment.originalName}</div>
      <div className="flex items-center gap-2.5">
        <PlayPauseButton playing={p.playing} onToggle={p.toggle} />
        <span className="text-[10px] font-mono text-kd-text-soft shrink-0">{fmtTime(p.currentTime)}</span>
        <Seekbar className="flex-1" fraction={frac} buffered={buf} onSeek={p.seekFraction} tone="panel" />
        <span className="text-[10px] font-mono text-kd-text-mute shrink-0">{fmtTime(p.duration)}</span>
        <IconButton tone="panel" title={p.muted ? 'включить звук' : 'выключить звук'} onClick={p.toggleMute}>
          {p.muted || p.volume === 0 ? <Icon.SpeakerOff size={15} /> : <Icon.Speaker size={15} />}
        </IconButton>
        <Seekbar className="w-12 shrink-0" fraction={p.muted ? 0 : p.volume} onSeek={p.setVolume} tone="panel" />
      </div>
    </div>
  )
}
