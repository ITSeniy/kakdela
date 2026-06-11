import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type InputMode = 'voice-activated' | 'push-to-talk'

interface InputSettingsState {
  inputMode: InputMode
  /**
   * `KeyboardEvent.code` (например, 'Space', 'KeyV', 'AltRight').
   * Стабильно относительно раскладки — пользователь жмёт ту же физическую
   * клавишу что в EN, что в RU.
   */
  pttKey: string
}

interface InputSettingsActions {
  setInputMode(mode: InputMode): void
  setPttKey(code: string): void
}

export const useVoiceInputSettings = create<InputSettingsState & InputSettingsActions>()(
  persist(
    (set) => ({
      inputMode: 'voice-activated',
      pttKey: 'Space',
      setInputMode(mode) {
        set({ inputMode: mode })
      },
      setPttKey(code) {
        set({ pttKey: code })
      },
    }),
    { name: 'kd:voice:input' },
  ),
)

/**
 * Подписи кнопок для humans. `KeyboardEvent.code` бывает довольно техничен
 * (KeyV, AltRight…), поэтому маппим самые употребимые в дружественный вид.
 */
export function describeKey(code: string): string {
  switch (code) {
    case 'Space':       return 'Space'
    case 'AltLeft':     return 'Left Alt'
    case 'AltRight':    return 'Right Alt'
    case 'ShiftLeft':   return 'Left Shift'
    case 'ShiftRight':  return 'Right Shift'
    case 'ControlLeft': return 'Left Ctrl'
    case 'ControlRight':return 'Right Ctrl'
    default:
      if (code.startsWith('Key')) return code.slice(3)
      if (code.startsWith('Digit')) return code.slice(5)
      return code
  }
}
