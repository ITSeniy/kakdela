import { EmptyState } from '../../components/EmptyState.js'

export function DmHome() {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center justify-center bg-kd-bg">
      <EmptyState
        glyph="💬"
        title="выбери переписку слева"
        body={'или открой профиль участника на сервере\nи нажми «написать сообщение».'}
      />
    </div>
  )
}
