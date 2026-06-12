// Страница «мой профиль»: форма редактирования собственного профиля
// (аватар, имя, статус, пароль). Сама форма живёт в ProfileEditForm.

import { useQuery } from '@tanstack/react-query'

import { toast } from '../../components/toast/index.js'
import { useAuthStore } from '../auth/store.js'
import { getUserProfile } from '../profile/api.js'
import { ProfileEditForm } from '../profile/ProfileEditForm.js'

export function ProfileSettings() {
  const userId = useAuthStore((s) => s.user?.id ?? null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => getUserProfile(userId!),
    enabled: userId !== null,
    staleTime: 30_000,
  })

  if (isLoading || !profile) {
    return <div className="py-8 text-center text-kd-text-mute font-mono text-[11px]">загружаем…</div>
  }

  return (
    <ProfileEditForm
      profile={profile}
      onSaved={() => toast.info('профиль сохранён')}
    />
  )
}
