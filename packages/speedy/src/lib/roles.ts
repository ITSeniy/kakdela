// Хелперы системы ролей: сериализация, гарантия наличия @everyone, и bulk-
// загрузка ролей+прав для списка участников (одним проходом, без N запросов).

import { and, asc, desc, eq, inArray } from 'drizzle-orm'

import { ALL_PERMISSIONS, Permissions } from '@kakdela/ginzu/permissions'
import type { Role, RoleRef } from '@kakdela/ginzu/api-types'

import { memberRoles, serverRoles } from '../db/schema.js'
import { db } from './db.js'

type RoleRow = typeof serverRoles.$inferSelect

export function serializeRole(row: RoleRow): Role {
  return {
    id:          row.id,
    serverId:    row.serverId,
    name:        row.name,
    color:       row.color,
    permissions: row.permissions,
    position:    row.position,
    hoist:       row.hoist,
    mentionable: row.mentionable,
    isEveryone:  row.isEveryone,
  }
}

function toRef(row: RoleRow): RoleRef {
  return { id: row.id, name: row.name, color: row.color, position: row.position, hoist: row.hoist }
}

/** Возвращает @everyone роль сервера, создавая её при отсутствии (safety net
 *  для серверов, заведённых до миграции системы ролей). */
export async function ensureEveryoneRole(serverId: string): Promise<RoleRow> {
  const rows = await db
    .select()
    .from(serverRoles)
    .where(and(eq(serverRoles.serverId, serverId), eq(serverRoles.isEveryone, true)))
    .limit(1)
  if (rows[0]) return rows[0]
  const inserted = await db
    .insert(serverRoles)
    .values({ serverId, name: '@everyone', permissions: 0, position: 0, isEveryone: true })
    .returning()
  return inserted[0]!
}

/** Все роли сервера, от старшей к младшей (position desc). Гарантирует @everyone. */
export async function listServerRoles(serverId: string): Promise<Role[]> {
  await ensureEveryoneRole(serverId)
  const rows = await db
    .select()
    .from(serverRoles)
    .where(eq(serverRoles.serverId, serverId))
    .orderBy(desc(serverRoles.position), asc(serverRoles.createdAt))
  return rows.map(serializeRole)
}

export interface MemberRoleInfo {
  roles: RoleRef[]          // кастомные роли (без @everyone), от старшей к младшей
  permissions: number       // эффективная маска для одного участника
}

/**
 * Bulk: для набора участников сервера возвращает их кастомные роли и
 * эффективную маску прав. builtinRoles — карта userId → owner/admin/member
 * (из server_members), нужна для owner=всё / admin=ADMINISTRATOR.
 * Два запроса (@everyone + все назначения сервера), остальное — в памяти.
 */
export async function loadMemberRoleInfo(
  serverId: string,
  builtinRoles: Map<string, 'owner' | 'admin' | 'member'>,
): Promise<Map<string, MemberRoleInfo>> {
  const everyone = await ensureEveryoneRole(serverId)
  const everyoneMask = everyone.permissions

  const userIds = [...builtinRoles.keys()]
  const out = new Map<string, MemberRoleInfo>()
  if (userIds.length === 0) return out

  const assignments = await db
    .select({
      userId:      memberRoles.userId,
      id:          serverRoles.id,
      name:        serverRoles.name,
      color:       serverRoles.color,
      position:    serverRoles.position,
      hoist:       serverRoles.hoist,
      permissions: serverRoles.permissions,
    })
    .from(memberRoles)
    .innerJoin(serverRoles, eq(memberRoles.roleId, serverRoles.id))
    .where(and(eq(memberRoles.serverId, serverId), inArray(memberRoles.userId, userIds)))

  const byUser = new Map<string, typeof assignments>()
  for (const a of assignments) {
    const list = byUser.get(a.userId) ?? []
    list.push(a)
    byUser.set(a.userId, list)
  }

  for (const userId of userIds) {
    const builtin = builtinRoles.get(userId) ?? 'member'
    const assigned = (byUser.get(userId) ?? []).slice().sort((a, b) => b.position - a.position)
    const roles = assigned.map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position, hoist: r.hoist }))

    // У owner права всегда полные, НО назначенные роли всё равно отдаём для
    // отображения (цвет имени, hoist-группа, галочка в настройках ролей) —
    // иначе хозяин не видит, что назначил роль сам себе.
    if (builtin === 'owner') {
      out.set(userId, { roles, permissions: ALL_PERMISSIONS })
      continue
    }
    let mask = everyoneMask
    for (const r of assigned) mask |= r.permissions
    if (builtin === 'admin') mask |= Permissions.ADMINISTRATOR
    out.set(userId, { roles, permissions: mask })
  }
  return out
}

export { toRef as roleToRef }
