// Отдельное окно входящего DM-звонка (T-087). На desktop его создаёт Rust
// (open_call_popup) — маленькое окно поверх всех окон, видно даже когда КакДела
// свёрнут. Кнопки попапа шлют глобальный tauri-event `call-popup-action`,
// который слушает главное окно. В non-Tauri окружении (`pnpm dev:web`) и на
// mobile всё это — no-op (там хватает тоста в самом приложении).

function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window
}

export interface CallPopupData {
  channelId: string
  fromName: string
  fromAvatarUrl: string | null
}

export interface CallPopupAction {
  action: 'accept' | 'decline'
  channelId: string
}

const CALL_ACTION_EVENT = 'call-popup-action'

/** Главное окно: открыть попап входящего звонка (desktop). */
export async function openCallPopup(data: CallPopupData): Promise<void> {
  if (!isTauri()) return
  try {
    const mod = await import('@tauri-apps/api/core')
    await mod.invoke('open_call_popup', {
      channelId: data.channelId,
      fromName: data.fromName,
      fromAvatarUrl: data.fromAvatarUrl,
    })
  } catch (err) {
    console.warn('[call-window] open_call_popup failed', err)
  }
}

/** Главное окно: закрыть попап (приняли/отклонили/таймаут/отмена). */
export async function closeCallPopup(): Promise<void> {
  if (!isTauri()) return
  try {
    const mod = await import('@tauri-apps/api/core')
    await mod.invoke('close_call_popup')
  } catch (err) {
    console.warn('[call-window] close_call_popup failed', err)
  }
}

/**
 * Главное окно слушает выбор пользователя из попапа. Возвращает unsubscribe.
 * На web — no-op (попапа нет, действует тост).
 */
export function onCallPopupAction(cb: (a: CallPopupAction) => void): () => void {
  if (!isTauri()) return () => {}
  let unlisten: (() => void) | null = null
  let disposed = false
  void (async () => {
    try {
      const mod = await import('@tauri-apps/api/event')
      const u = await mod.listen<CallPopupAction>(CALL_ACTION_EVENT, (e) => cb(e.payload))
      if (disposed) u()
      else unlisten = u
    } catch (err) {
      console.warn('[call-window] listen call-popup-action failed', err)
    }
  })()
  return () => {
    disposed = true
    if (unlisten) unlisten()
  }
}

/** Попап-окно: отправить выбор пользователя главному окну. */
export async function emitCallAction(
  action: 'accept' | 'decline',
  channelId: string,
): Promise<void> {
  if (!isTauri()) return
  try {
    const mod = await import('@tauri-apps/api/event')
    await mod.emit(CALL_ACTION_EVENT, { action, channelId })
  } catch (err) {
    console.warn('[call-window] emit call-popup-action failed', err)
  }
}
