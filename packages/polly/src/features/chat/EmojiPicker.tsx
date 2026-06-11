import { useMemo } from 'react'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

import type { CustomEmoji } from '@kakdela/ginzu/api-types'

// emoji-mart передаёт разный shape для native vs custom: у native есть
// `native`, у custom — наш `id`/`src`. Делаем оба поля опциональными,
// различая по наличию `native`.
interface EmojiSelection {
  native?: string
  id?: string
}

interface EmojiPickerProps {
  /** Native unicode emoji (`😀`) → строка-emoji; custom (`:name:`) → текст-токен. */
  onSelect: (token: string) => void
  /** Если задан — добавляется первая категория «Сервер» с этими emoji. */
  customEmoji?: ReadonlyArray<CustomEmoji>
}

export function EmojiPicker({ onSelect, customEmoji }: EmojiPickerProps) {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'

  const custom = useMemo(() => {
    if (!customEmoji || customEmoji.length === 0) return undefined
    return [
      {
        id: 'kd-server',
        name: 'Сервер',
        emojis: customEmoji.map((e) => ({
          id: e.name,
          // emoji-mart shows `name` в preview area + tooltip — даём явный
          // `:name:` чтобы юзер видел, что именно вставится в composer.
          name: `:${e.name}:`,
          keywords: ['custom', e.name],
          skins: [{ src: e.imageUrl }],
        })),
      },
    ]
  }, [customEmoji])

  return (
    <Picker
      data={data}
      custom={custom}
      categories={custom ? ['kd-server', 'frequent', 'people', 'nature', 'foods', 'activity', 'places', 'objects', 'symbols', 'flags'] : undefined}
      onEmojiSelect={(e: EmojiSelection) => {
        if (e.native) onSelect(e.native)
        else if (e.id) onSelect(`:${e.id}:`)
      }}
      theme={theme}
      previewPosition="none"
      skinTonePosition="none"
    />
  )
}

export default EmojiPicker
