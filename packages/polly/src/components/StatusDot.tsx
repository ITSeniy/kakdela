export type Status = 'online' | 'idle' | 'dnd' | 'offline'

const STATUS_VAR: Record<Status, string> = {
  online:  'var(--kd-online)',
  idle:    'var(--kd-idle)',
  dnd:     'var(--kd-dnd)',
  offline: 'var(--kd-text-mute)',
}

interface StatusDotProps {
  status: Status
  size?: number
  className?: string
}

export function StatusDot({ status, size = 8, className }: StatusDotProps) {
  return (
    <span
      className={`inline-block rounded-full ${className ?? ''}`}
      style={{ width: size, height: size, background: STATUS_VAR[status] }}
    />
  )
}
