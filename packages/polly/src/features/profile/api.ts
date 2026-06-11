import type { PatchMeRequest, User, UserProfile } from '@kakdela/ginzu/api-types'

import { apiFetch } from '../../lib/api.js'

export async function getUserProfile(userId: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/api/users/${userId}`)
}

export async function patchMe(body: PatchMeRequest): Promise<User> {
  return apiFetch<User>('/api/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
