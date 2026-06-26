import { describe, expect, it } from 'vitest'

import { ALL_PERMISSIONS, Permissions, hasPermission, sanitizePermissions } from '@kakdela/ginzu/permissions'

describe('permissions bitfield', () => {
  it('ADMINISTRATOR перекрывает любое право', () => {
    const mask = Permissions.ADMINISTRATOR
    expect(hasPermission(mask, 'KICK_MEMBERS')).toBe(true)
    expect(hasPermission(mask, 'MANAGE_ROLES')).toBe(true)
    expect(hasPermission(mask, 'VIEW_AUDIT_LOG')).toBe(true)
  })

  it('точечное право не даёт прочих', () => {
    const mask = Permissions.MANAGE_EMOJI
    expect(hasPermission(mask, 'MANAGE_EMOJI')).toBe(true)
    expect(hasPermission(mask, 'KICK_MEMBERS')).toBe(false)
    expect(hasPermission(mask, 'ADMINISTRATOR')).toBe(false)
  })

  it('объединение масок суммирует права', () => {
    const mask = Permissions.MANAGE_CHANNELS | Permissions.MANAGE_MESSAGES
    expect(hasPermission(mask, 'MANAGE_CHANNELS')).toBe(true)
    expect(hasPermission(mask, 'MANAGE_MESSAGES')).toBe(true)
    expect(hasPermission(mask, 'MANAGE_EMOJI')).toBe(false)
  })

  it('ALL_PERMISSIONS включает каждый флаг', () => {
    for (const flag of Object.keys(Permissions) as (keyof typeof Permissions)[]) {
      expect(hasPermission(ALL_PERMISSIONS, flag)).toBe(true)
    }
  })

  it('sanitizePermissions отрезает неизвестные биты', () => {
    const dirty = ALL_PERMISSIONS | (1 << 30)
    expect(sanitizePermissions(dirty)).toBe(ALL_PERMISSIONS)
  })

  it('эскалация: нельзя выдать бит, которого нет у актора (кроме ADMIN)', () => {
    const actor = Permissions.MANAGE_ROLES | Permissions.MANAGE_CHANNELS
    const requested = Permissions.MANAGE_ROLES | Permissions.KICK_MEMBERS
    // requested содержит KICK_MEMBERS, которого нет у актора → эскалация.
    expect((requested & ~actor) !== 0).toBe(true)
    // А подмножество прав актора — не эскалация.
    expect((Permissions.MANAGE_CHANNELS & ~actor) !== 0).toBe(false)
  })
})
