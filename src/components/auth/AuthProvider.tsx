'use client'

import { useAuthSync } from '@/hooks/useAuth'
import { useRealtime } from '@/hooks/useRealtime'
import { useAuthStore } from '@/stores/auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthSync()
  const { user } = useAuthStore()
  useRealtime(user?.id)
  // Tracking visiteurs géré par middleware.ts + api/tracking/visit (plus fiable, pas de doublon)
  return <>{children}</>
}
