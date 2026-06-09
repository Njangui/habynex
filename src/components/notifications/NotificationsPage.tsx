'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BellOff, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { timeAgo, cn } from '@/lib/utils'
import Link from 'next/link'
import type { Notification } from '@/types'

const NOTIF_ICONS: Record<string, string> = {
  default: '🔔',
  visit: '📅',
  message: '💬',
  payment: '✅',
  alert: '🚨',
  report: '📊',
}

function getIcon(title: string): string {
  const t = title.toLowerCase()

  if (t.includes('visite') || t.includes('réservation')) {
    return NOTIF_ICONS.visit
  }

  if (t.includes('message')) {
    return NOTIF_ICONS.message
  }

  if (t.includes('paiement') || t.includes('confirmé')) {
    return NOTIF_ICONS.payment
  }

  if (t.includes('alerte') || t.includes('escalade')) {
    return NOTIF_ICONS.alert
  }

  if (t.includes('rapport')) {
    return NOTIF_ICONS.report
  }

  return NOTIF_ICONS.default
}

export function NotificationsPage() {
  const { user, setUnreadNotifications } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/connexion')
      return
    }

    load()
  }, [user])

  async function load() {
    if (!user) return

    setLoading(true)

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(50)

    setNotifications((data as Notification[]) ?? [])
    setLoading(false)
  }

  async function markAllRead() {
    if (!user) return

    await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_read', false)

    setNotifications(prev =>
      prev.map(n => ({
        ...n,
        is_read: true,
      }))
    )

    setUnreadNotifications(0)
  }

  async function markRead(id: string) {
    await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)

    setNotifications(prev =>
      prev.map(n =>
        n.id === id
          ? {
              ...n,
              is_read: true,
            }
          : n
      )
    )

    setUnreadNotifications(
      Math.max(
        0,
        notifications.filter(n => !n.is_read).length - 1
      )
    )
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Notifications
          </h1>

          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600 font-medium transition-colors"
          >
            <Check size={15} />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />

              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-2/3" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <BellOff
              size={32}
              className="text-gray-300 dark:text-gray-600"
            />
          </div>

          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            Pas encore de notifications
          </h2>

          <p className="text-sm text-gray-400 max-w-xs">
            Vous recevrez des alertes pour vos visites, messages et
            recommandations ici.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const content = (
              <>
                {/* Icône */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0',
                    notif.is_read
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : 'bg-brand-100 dark:bg-brand-900'
                  )}
                >
                  {getIcon(notif.title)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        'text-sm leading-snug',
                        notif.is_read
                          ? 'font-normal text-gray-700 dark:text-gray-300'
                          : 'font-semibold text-gray-900 dark:text-white'
                      )}
                    >
                      {notif.title}
                    </p>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {timeAgo(notif.sent_at)}
                      </span>

                      {!notif.is_read && (
                        <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {notif.body}
                  </p>
                </div>
              </>
            )

            // ✅ CAS LINK
            if (notif.action_url) {
              const isExternal = notif.action_url.startsWith('http')
              return (
                <Link
                  key={notif.id}
                  href={notif.action_url}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  onClick={() => {
                    if (!notif.is_read) {
                      markRead(notif.id)
                    }
                  }}
                  className={cn(
                    'flex gap-4 p-4 rounded-2xl border transition-colors cursor-pointer',
                    notif.is_read
                      ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                      : 'bg-brand-50 dark:bg-brand-950/20 border-brand-100 dark:border-brand-900'
                  )}
                >
                  {content}
                </Link>
              )
            }

            // ✅ CAS DIV
            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.is_read) {
                    markRead(notif.id)
                  }
                }}
                className={cn(
                  'flex gap-4 p-4 rounded-2xl border transition-colors cursor-pointer',
                  notif.is_read
                    ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                    : 'bg-brand-50 dark:bg-brand-950/20 border-brand-100 dark:border-brand-900'
                )}
              >
                {content}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
