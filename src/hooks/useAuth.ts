'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'

// Hook global à monter UNE SEULE FOIS dans le layout
// Synchronise auth Supabase → store Zustand
export function useAuthSync() {
  const { setUser, setProfile, setRoles, reset } = useAuthStore()
  const supabase = createClient()

  useEffect(() => {
    // Session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      }
    })

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await loadProfile(session.user.id)
        } else {
          reset()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ])
    if (profile) setProfile(profile)
    if (roles) setRoles(roles.map((r: { role: string }) => r.role as any))
  }
}

export function useAuth() {
  return useAuthStore()
}
