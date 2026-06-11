// Настройки сервера: модалка 760×580 с боковой навигацией.
// Источник паттерна: designs/final-settings.jsx (KD_SetNav, шапка контента)
// и designs/final-extras.jsx (FinalChannelSettings — габариты модалки).

import { useQuery } from '@tanstack/react-query'

import { Modal } from '../../components/Modal.js'
import { SectionLabel } from '../../components/SectionLabel.js'
import { useAuthStore } from '../auth/store.js'
import { listMembers } from '../servers/api.js'
import { AuditLog } from './AuditLog.js'
import { EmojiManagement } from './EmojiManagement.js'
import { GeneralSettings } from './GeneralSettings.js'
import { InviteManagement } from './InviteManagement.js'
import { useServerSettingsUi, type ServerSettingsTab } from './store.js'

const TABS: Array<{ id: ServerSettingsTab; label: string; desc: string }> = [
  { id: 'general', label: 'общее',     desc: 'имя, иконка и опасная зона' },
  { id: 'emoji',   label: 'эмодзи',    desc: 'свои эмодзи этого сервера' },
  { id: 'invites', label: 'инвайты',   desc: 'кто и как может присоединиться' },
  { id: 'audit',   label: 'аудит-лог', desc: 'журнал действий админов' },
]

export function ServerSettingsModal() {
  const serverId = useServerSettingsUi((s) => s.openServerId)
  const tab      = useServerSettingsUi((s) => s.tab)
  const setTab   = useServerSettingsUi((s) => s.setTab)
  const close    = useServerSettingsUi((s) => s.close)
  const userId   = useAuthStore((s) => s.user?.id)

  // Доступ к настройкам только для admin/owner. Берём роль из обычного
  // /api/servers/:id/members — он уже на руках у ChannelList и кеш дешёвый.
  const { data: members = [] } = useQuery({
    queryKey: ['members', serverId],
    queryFn:  () => listMembers(serverId!),
    enabled:  serverId !== null,
    staleTime: 60_000,
  })

  if (!serverId) return null
  const role = userId ? members.find((m) => m.id === userId)?.role : undefined
  const isAdmin = role === 'admin' || role === 'owner'
  // Любой member может зайти в «общее» — там лежит leave-кнопка. Остальные
  // вкладки только для admin/owner.
  const visibleTabs = isAdmin ? TABS : TABS.filter((t) => t.id === 'general')
  const current = TABS.find((t) => t.id === tab)

  return (
    <Modal onClose={close} width={760} className="h-[580px]">
      <div className="flex-1 flex min-h-0">
        {/* левая навигация */}
        <nav className="w-[200px] shrink-0 bg-kd-panel-alt border-r border-kd-border px-1.5 py-3 overflow-y-auto">
          <div className="px-2.5 pb-2">
            <div className="text-[12px] font-bold text-kd-text">настройки</div>
            <div className="text-[10px] font-mono text-kd-text-mute">сервер</div>
          </div>
          <SectionLabel>— сервер</SectionLabel>
          {visibleTabs.map((t) => {
            const active = t.id === tab
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  'w-full text-left px-2.5 py-[5px] mb-px rounded text-[12px] border-l-2 transition-colors',
                  active
                    ? 'bg-kd-panel-hi border-kd-accent text-kd-text font-semibold pl-2'
                    : 'border-transparent text-kd-text-soft font-medium hover:text-kd-text hover:bg-kd-panel-soft',
                ].join(' ')}
              >
                {t.label}
              </button>
            )
          })}
        </nav>

        {/* контент */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="px-7 py-3.5 border-b border-kd-border flex items-baseline gap-3 shrink-0">
            <div className="min-w-0">
              <div className="text-[17px] font-bold text-kd-text">{current?.label ?? '…'}</div>
              <div className="text-[11px] text-kd-text-soft mt-0.5">{current?.desc}</div>
            </div>
            <div className="flex-1" />
            <button
              type="button"
              onClick={close}
              className="text-[10px] font-mono text-kd-text-mute hover:text-kd-text shrink-0"
            >
              esc · закрыть
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="max-w-[720px] px-7 py-5">
              {/* `general` доступна всем members (там lives leave-кнопка). */}
              {tab === 'general' && <GeneralSettings serverId={serverId} />}
              {isAdmin && tab === 'emoji'   && <EmojiManagement serverId={serverId} />}
              {isAdmin && tab === 'invites' && <InviteManagement serverId={serverId} />}
              {isAdmin && tab === 'audit'   && <AuditLog serverId={serverId} />}
              {!isAdmin && tab !== 'general' && (
                <div className="py-8 text-center text-kd-text-mute font-mono text-[11px]">
                  эта вкладка только для админа сервера.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
