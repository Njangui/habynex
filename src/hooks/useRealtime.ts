'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'

// Écouter les messages et notifications en temps réel
export function useRealtime(userId: string | undefined) {
  const { setUnreadMessages, setUnreadNotifications } = useAuthStore()
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return

    // Canal messages non lus
    const msgChannel = supabase
      .channel(`unread-messages-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=neq.${userId}`,
      }, () => {
        // Recompter
        supabase
          .from('conversations')
          .select('unread_count')
          .eq('client_id', userId)
          .then(({ data }) => {
            const total = data?.reduce((sum, c: { unread_count: number }) => sum + c.unread_count, 0) ?? 0
            setUnreadMessages(total)
          })
      })
      .subscribe()

    // Canal notifications non lues
    const notifChannel = supabase
      .channel(`unread-notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        supabase
          .from('notifications')
          .select('id', { count: 'exact' })
          .eq('user_id', userId)
          .eq('is_read', false)
          .then(({ count }) => setUnreadNotifications(count ?? 0))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(notifChannel)
    }
  }, [userId])
}
