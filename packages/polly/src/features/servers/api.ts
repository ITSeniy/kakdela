import type {
  Channel,
  CreateInviteResponse,
  CreateServerRequest,
  InviteSummary,
  InvitesListResponse,
  MemberPublic,
  PatchServerRequest,
  Server,
} from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'

export async function listServers(): Promise<Server[]> {
  const data = await apiFetch<{ servers: Server[] }>('/api/servers')
  return data.servers
}

export interface ServerDetail {
  server: Server
  channels: Channel[]
  memberCount: number
}

export async function getServerDetail(serverId: string): Promise<ServerDetail> {
  return apiFetch<ServerDetail>(`/api/servers/${serverId}`)
}

export async function listMembers(serverId: string): Promise<MemberPublic[]> {
  const data = await apiFetch<{ members: MemberPublic[] }>(`/api/servers/${serverId}/members`)
  return data.members
}

// ───── T-083 ─────

export async function createServer(body: CreateServerRequest): Promise<Server> {
  return apiFetch<Server>('/api/servers', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function patchServer(serverId: string, body: PatchServerRequest): Promise<Server> {
  return apiFetch<Server>(`/api/servers/${serverId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function deleteServer(serverId: string): Promise<void> {
  await apiFetch<void>(`/api/servers/${serverId}`, { method: 'DELETE' })
}

export async function leaveServer(serverId: string): Promise<void> {
  await apiFetch<void>(`/api/servers/${serverId}/members/me`, { method: 'DELETE' })
}

export async function listInvites(serverId: string): Promise<InviteSummary[]> {
  const data = await apiFetch<InvitesListResponse>(`/api/servers/${serverId}/invites`)
  return data.invites
}

export async function createInvite(
  serverId: string,
  body: { expiresInDays?: number; maxUses?: number },
): Promise<CreateInviteResponse> {
  return apiFetch<CreateInviteResponse>(`/api/servers/${serverId}/invites`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function revokeInvite(code: string): Promise<void> {
  await apiFetch<void>(`/api/invites/${encodeURIComponent(code)}`, { method: 'DELETE' })
}

export async function acceptInvite(code: string): Promise<{ serverId: string }> {
  return apiFetch<{ serverId: string }>(`/api/invites/${encodeURIComponent(code)}/accept`, {
    method: 'POST',
  })
}
