'use client'

import { useState, useEffect } from 'react'
import { Bell, X, CheckCircle2, Loader2 } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export function NotifPermissionToast() {
  const { user } = useAuthStore()
  const { permission, isSupported, isSubscribed, isIos, loading, subscribe } = usePushNotifications()
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!user || !isSupported || isSubscribed || permission === 'denied') return
    if (localStorage.getItem('notif-asked-v2')) return
    const t = setTimeout(() => setShow(true), 6000)
    return () => clearTimeout(t)
  }, [user, isSupported, isSubscribed, permission])

  async function handleAccept() {
    const result = await subscribe()
    localStorage.setItem('notif-asked-v2', '1')
    if (result === 'granted') {
      setDone(true)
      toast.success('Notifications activées ! 🔔')
      setTimeout(() => setShow(false), 2000)
    } else if (result === 'denied') {
      toast.error('Notifications refusées dans les paramètres du navigateur.')
      setShow(false)
    }
  }

  function dismiss() {
    setShow(false)
    localStorage.setItem('notif-asked-v2', '1')
  }

  if (!show) return null

  if (done) {
    return (
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50">
        <div className="bg-green-500 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 animate-slide-up">
          <CheckCircle2 size={22} />
          <p className="font-semibold text-sm">Notifications activées !</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-slide-up">
      <div className="bg-hb-800 dark:bg-white text-white dark:text-hb-800 rounded-2xl shadow-2xl p-4">

        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Ne ratez aucune annonce 🏠</p>
            <p className="text-xs opacity-70 mt-0.5 leading-relaxed">
              {isIos
                ? "Sur iPhone : allez dans Réglages → Safari → Notifications pour activer."
                : "Recevez les nouvelles annonces dans vos quartiers favoris en temps réel."}
            </p>
          </div>
          <button onClick={dismiss} className="opacity-50 hover:opacity-100 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Avantages */}
        {!isIos && (
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {[
              '📍 Annonces par quartier',
              '💬 Nouveaux messages',
              '📅 Rappels de visite',
              '🎁 Offres exclusives',
            ].map(item => (
              <div key={item} className="text-[11px] opacity-70 flex items-center gap-1">
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {isIos ? (
          <button onClick={dismiss}
            className="w-full py-2.5 bg-white/20 text-white dark:text-hb-800 dark:bg-hb-100 text-sm font-semibold rounded-xl">
            J&apos;ai compris
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleAccept} disabled={loading}
              className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
              {loading ? 'Activation...' : 'Activer'}
            </button>
            <button onClick={dismiss}
              className="px-4 py-2.5 text-sm opacity-60 hover:opacity-100 border border-white/20 dark:border-hb-200 rounded-xl transition-opacity">
              Plus tard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
