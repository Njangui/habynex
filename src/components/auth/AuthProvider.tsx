'use client'

import { useAuthSync } from '@/hooks/useAuth'
import { useRealtime } from '@/hooks/useRealtime'
import { useVisitorTracking } from '@/hooks/useVisitorTracking'
import { useAuthStore } from '@/stores/auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthSync()
  const { user } = useAuthStore()
  useRealtime(user?.id)
  useVisitorTracking()
  return <>{children}</>
}
