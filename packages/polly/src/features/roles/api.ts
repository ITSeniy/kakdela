import type {
  CreateRoleRequest,
  PatchRoleRequest,
  Role,
  RolesListResponse,
} from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'

export async function listRoles(serverId: string): Promise<Role[]> {
  const res = await apiFetch<RolesListResponse>(`/api/servers/${serverId}/roles`)
  return res.roles
}

export async function createRole(serverId: string, body: CreateRoleRequest): Promise<Role> {
  return apiFetch<Role>(`/api/servers/${serverId}/roles`, { method: 'POST', body: JSON.stringify(body) })
}

export async function patchRole(roleId: string, body: PatchRoleRequest): Promise<Role> {
  return apiFetch<Role>(`/api/roles/${roleId}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export async function deleteRole(roleId: string): Promise<void> {
  await apiFetch<void>(`/api/roles/${roleId}`, { method: 'DELETE' })
}

export async function setMemberRoles(serverId: string, userId: string, roleIds: string[]): Promise<void> {
  await apiFetch<void>(`/api/servers/${serverId}/members/${userId}/roles`, {
    method: 'PUT',
    body: JSON.stringify({ roleIds }),
  })
}
