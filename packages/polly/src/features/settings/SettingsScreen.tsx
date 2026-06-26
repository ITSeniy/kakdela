// Полноэкранные настройки (designs/final-settings.jsx → FinalSettings).
// Оверлей начинается ПРАВЕЕ серверной рельсы (left-14) — рельса остаётся
// видимой и кликабельной, как в концепте: клик по серверу переключает
// серверные настройки на него, переход в DM/инбокс/поиск закрывает экран.
//
// Серверные и личные настройки — раздельные режимы: открытые с serverId
// показывают только группу «сервер», без него — только «аккаунт».

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'

import type { PermissionFlag } from '@kakdela/ginzu/permissions'

import { useServerPermissions } from '../roles/permissions.js'
import { getServerDetail, listMembers } from '../servers/api.js'
import { AppearanceSettings } from './AppearanceSettings.js'
import { AuditLog } from './AuditLog.js'
import { EmojiManagement } from './EmojiManagement.js'
import { GeneralSettings } from './GeneralSettings.js'
import { InviteManagement } from './InviteManagement.js'
import { MembersSettings } from './MembersSettings.js'
import { NotificationSettings } from './NotificationSettings.js'
import { ProfileSettings } from './ProfileSettings.js'
import { RolesSettings } from './RolesSettings.js'
import { ShortcutsSettings } from './ShortcutsSettings.js'
import { SoundSettings } from './SoundSettings.js'
import { VoiceSettings } from './VoiceSettings.js'
import { useSettingsUi, type SettingsPage } from './store.js'

interface PageDef {
  id: SettingsPage
  label: string
  desc: string
  /** Право, без которого вкладка скрыта (owner/ADMINISTRATOR проходят всегда). */
  perm?: PermissionFlag
}

const SERVER_PAGES: PageDef[] = [
  { id: 'server-overview', label: 'обзор',          desc: 'имя, иконка и опасная зона' },
  { id: 'server-members',  label: 'участники',      desc: 'кто здесь живёт' },
  { id: 'server-roles',    label: 'роли',           desc: 'роли и разрешения сервера', perm: 'MANAGE_ROLES' },
  { id: 'server-emoji',    label: 'эмодзи',         desc: 'свои эмодзи этого сервера', perm: 'MANAGE_EMOJI' },
  { id: 'server-invites',  label: 'приглашения',    desc: 'кто и как может присоединиться', perm: 'MANAGE_INVITES' },
  { id: 'server-audit',    label: 'журнал событий', desc: 'журнал действий админов', perm: 'VIEW_AUDIT_LOG' },
]

const ACCOUNT_PAGES: PageDef[] = [
  { id: 'profile',       label: 'мой профиль',   desc: 'аватар, имя и пароль' },
  { id: 'notifications', label: 'уведомления',   desc: 'когда показывать нативные всплывашки' },
  { id: 'appearance',    label: 'внешний вид',   desc: 'как «какдела» будет выглядеть у тебя' },
  { id: 'voice',         label: 'голос и видео', desc: 'микрофон, шумодав и push-to-talk' },
  { id: 'sounds',        label: 'звуки',         desc: 'звуки интерфейса и пак на вкус' },
  { id: 'shortcuts',     label: 'клавиши',       desc: 'горячие клавиши приложения' },
]

function NavItem({
  page, active, count, onClick,
}: {
  page: PageDef
  active: boolean
  count?: number
  onClick(): void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left px-2.5 py-[5px] mb-px rounded text-[12px] border-l-2 transition-colors flex items-center gap-1.5',
        active
          ? 'bg-kd-panel-hi border-kd-accent text-kd-text font-semibold pl-2'
          : 'border-transparent text-kd-text-soft font-medium hover:text-kd-text hover:bg-kd-panel-soft',
      ].join(' ')}
    >
      <span className="flex-1 truncate">{page.label}</span>
      {count !== undefined && (
        <span className="text-[10px] font-mono text-kd-text-mute shrink-0">{count}</span>
      )}
    </button>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pt-2.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-[0.05em] text-kd-text-mute">
      — {children}
    </div>
  )
}

export function SettingsScreen() {
  const isOpen = useSettingsUi((s) => s.isOpen)
  const page = useSettingsUi((s) => s.page)
  const serverId = useSettingsUi((s) => s.serverId)
  const setPage = useSettingsUi((s) => s.setPage)
  const close = useSettingsUi((s) => s.close)
  const perms = useServerPermissions(serverId)
  const [location] = useLocation()

  const { data: serverDetail } = useQuery({
    queryKey: ['server', serverId],
    queryFn: () => getServerDetail(serverId!),
    enabled: isOpen && serverId !== null,
    staleTime: 30_000,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members', serverId],
    queryFn: () => listMembers(serverId!),
    enabled: isOpen && serverId !== null,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      // Модалки поверх (профиль, confirm, kropper) гасят Esc в capture-фазе.
      if (e.key === 'Escape' && !e.defaultPrevented) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  // Рельса под оверлеем живая: клик по серверу в режиме серверных настроек
  // переключает их на этот сервер, любой другой переход (DM, инбокс, поиск,
  // аккаунт-режим) закрывает настройки.
  const prevLocRef = useRef(location)
  useEffect(() => {
    if (!isOpen) {
      prevLocRef.current = location
      return
    }
    if (location === prevLocRef.current) return
    prevLocRef.current = location
    const m = /^\/servers\/([0-9a-f-]+)/i.exec(location)
    if (serverId && m && m[1]) {
      if (m[1] !== serverId) useSettingsUi.setState({ serverId: m[1] })
    } else {
      close()
    }
  }, [location, isOpen, serverId, close])

  if (!isOpen) return null

  const pages = serverId
    ? SERVER_PAGES.filter((p) => !p.perm || perms.can(p.perm))
    : ACCOUNT_PAGES
  const current = pages.find((p) => p.id === page) ?? pages[0]!
  const serverName = serverDetail?.server.name ?? 'сервер'

  return (
    <div className="fixed inset-y-0 left-14 right-0 z-30 bg-kd-bg text-kd-text font-sans flex border-l border-kd-border">
      {/* левая навигация */}
      <nav className="w-[220px] shrink-0 bg-kd-panel-alt border-r border-kd-border px-2 py-3.5 overflow-y-auto">
        <div className="flex items-center gap-2 px-2.5 pb-2.5">
          <div className="w-7 h-7 rounded-kd bg-kd-accent text-white text-[11px] font-bold flex items-center justify-center shrink-0">
            {serverId ? serverName.charAt(0).toUpperCase() : 'кд'}
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-kd-text truncate">
              {serverId ? serverName : 'какдела'}
            </div>
            <div className="text-[10px] font-mono text-kd-text-mute">
              {serverId ? 'настройки сервера' : 'настройки аккаунта'}
            </div>
          </div>
        </div>

        <GroupLabel>{serverId ? 'сервер' : 'аккаунт'}</GroupLabel>
        {pages.map((p) => (
          <NavItem
            key={p.id}
            page={p}
            active={p.id === current.id}
            count={p.id === 'server-members' && members.length > 0 ? members.length : undefined}
            onClick={() => setPage(p.id)}
          />
        ))}
      </nav>

      {/* контент */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-7 py-3.5 border-b border-kd-border flex items-baseline gap-3 shrink-0">
          <div className="min-w-0">
            <div className="text-[17px] font-bold text-kd-text">{current.label}</div>
            <div className="text-[11px] text-kd-text-soft mt-0.5">{current.desc}</div>
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
            {current.id === 'server-overview' && serverId && <GeneralSettings serverId={serverId} />}
            {current.id === 'server-members'  && serverId && <MembersSettings serverId={serverId} />}
            {current.id === 'server-roles'    && serverId && perms.can('MANAGE_ROLES') && <RolesSettings serverId={serverId} />}
            {current.id === 'server-emoji'    && serverId && perms.can('MANAGE_EMOJI') && <EmojiManagement serverId={serverId} />}
            {current.id === 'server-invites'  && serverId && perms.can('MANAGE_INVITES') && <InviteManagement serverId={serverId} />}
            {current.id === 'server-audit'    && serverId && perms.can('VIEW_AUDIT_LOG') && <AuditLog serverId={serverId} />}
            {current.id === 'profile'       && <ProfileSettings />}
            {current.id === 'notifications' && <NotificationSettings />}
            {current.id === 'appearance'    && <AppearanceSettings />}
            {current.id === 'voice'         && <VoiceSettings />}
            {current.id === 'sounds'        && <SoundSettings />}
            {current.id === 'shortcuts'     && <ShortcutsSettings />}
          </div>
        </div>
      </div>
    </div>
  )
}
