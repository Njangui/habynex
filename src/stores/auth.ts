import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  roles: UserRole[]
  unreadMessages: number
  unreadNotifications: number
  // Actions
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setRoles: (roles: UserRole[]) => void
  setUnreadMessages: (count: number) => void
  setUnreadNotifications: (count: number) => void
  reset: () => void
  // Helpers
  isAdmin: () => boolean
  isAgent: () => boolean
  isPhotographer: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      roles: [],
      unreadMessages: 0,
      unreadNotifications: 0,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setRoles: (roles) => set({ roles }),
      setUnreadMessages: (count) => set({ unreadMessages: count }),
      setUnreadNotifications: (count) => set({ unreadNotifications: count }),

      reset: () => set({
        user: null, profile: null, roles: [],
        unreadMessages: 0, unreadNotifications: 0,
      }),

      isAdmin: () => {
        const { roles } = get()
        return roles.includes('admin') || roles.includes('super_admin')
      },
      isAgent: () => get().roles.includes('agent'),
      isPhotographer: () => get().roles.includes('photographer'),
    }),
    {
      name: 'habynex-auth',
      partialize: (state) => ({
        profile: state.profile,
        roles: state.roles,
      }),
    }
  )
)
