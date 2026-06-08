'use client'

import Image from 'next/image'
import type { Profile } from '@/types'

interface Props { profile: Profile | null; size?: number }

export function UserAvatar({ profile, size = 36 }: Props) {
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  if (profile?.avatar_url) {
    return (
      <div style={{ width: size, height: size }} className="rounded-full overflow-hidden flex-shrink-0 ring-1 ring-hb-200">
        <Image src={profile.avatar_url} alt="Avatar" width={size} height={size} className="object-cover w-full h-full" />
      </div>
    )
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="rounded-full bg-hb-600 dark:bg-hb-500 flex items-center justify-center text-white font-semibold flex-shrink-0"
    >
      {initials}
    </div>
  )
}
