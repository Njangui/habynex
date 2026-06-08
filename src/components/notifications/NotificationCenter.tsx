'use client'

/**
 * Centre de gestion des notifications Habynex
 * - Gérer les préférences (types activés/désactivés)
 * - Voir l'historique des notifications reçues
 * - Tester les notifications
 */

import { useState } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useAuthStore } from '@/stores/auth'
import {
  Bell, BellOff, Home, MessageSquare, Calendar,
  Gift, Shield, ToggleLeft, ToggleRight, Loader2,
  CheckCircle2, AlertCircle, Send
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const NOTIF_TYPES = [
  {
    id: 'new_listing',
    label: 'Nouvelles annonces',
    desc: 'Biens publiés dans vos quartiers favoris',
    icon: Home,
    color: 'text-brand-500',
    default: true,
  },
  {
    id: 'message',
    label: 'Nouveaux messages',
    desc: 'Quand quelqu\'un vous répond',
    icon: MessageSquare,
    color: 'text-blue-500',
    default: true,
  },
  {
    id: 'booking',
    label: 'Visites & réservations',
    desc: 'Confirmation, rappel, annulation de visite',
    icon: Calendar,
    color: 'text-purple-500',
    default: true,
  },
  {
    id: 'promo',
    label: 'Offres & promotions',
    desc: 'Bons plans et nouveautés Habynex',
    icon: Gift,
    color: 'text-amber-500',
    default: false,
  },
  {
    id: 'system',
    label: 'Notifications système',
    desc: 'Sécurité, mises à jour importantes',
    icon: Shield,
    color: 'text-green-500',
    default: true,
  },
]

export function NotificationCenter() {
  const { user } = useAuthStore()
  const { permission, isSubscribed, isSupported, isIos, loading, subscribe, unsubscribe } = usePushNotifications()
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_TYPES.map(t => [t.id, t.default]))
  )
  const [testLoading, setTestLoading] = useState(false)

  function togglePref(id: string) {
    setPrefs(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleToggleMain() {
    if (isSubscribed) {
      await unsubscribe()
      toast.success('Notifications désactivées')
    } else {
      const result = await subscribe()
      if (result === 'granted') toast.success('Notifications activées ! 🔔')
      else if (result === 'denied') toast.error('Permission refusée dans votre navigateur')
      else toast.error('Erreur — installez l\'app depuis la bannière')
    }
  }

  async function sendTestNotif() {
    if (!user) return
    setTestLoading(true)
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'test-self',
        },
        body: JSON.stringify({
          type: 'system',
          userId: user.id,
          title: '🔔 Test Habynex',
          message: 'Vos notifications fonctionnent parfaitement !',
          url: '/notifications',
          requireInteraction: false,
        }),
      })
      const data = await res.json()
      if (data.sent > 0) toast.success('Notification test envoyée !')
      else if (data.warning) toast.error(data.warning)
      else toast.error('Aucun abonnement actif trouvé')
    } catch {
      toast.error('Erreur lors du test')
    } finally {
      setTestLoading(false)
    }
  }

  const statusColor = isSubscribed ? 'text-green-500' : 'text-hb-400'
  const statusText = !isSupported
    ? 'Non supporté par ce navigateur'
    : isIos && !isSubscribed
    ? 'iOS : activez dans Réglages → Safari'
    : isSubscribed
    ? 'Notifications actives'
    : permission === 'denied'
    ? 'Bloquées dans les paramètres du navigateur'
    : 'Désactivées'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Statut principal */}
      <div className={cn(
        'rounded-3xl p-6 border-2 transition-colors',
        isSubscribed
          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20'
          : 'border-hb-200 dark:border-hb-600 bg-white dark:bg-hb-800'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center',
              isSubscribed ? 'bg-green-100 dark:bg-green-900/40' : 'bg-hb-100 dark:bg-hb-700'
            )}>
              {isSubscribed
                ? <Bell size={24} className="text-green-600 dark:text-green-400" />
                : <BellOff size={24} className="text-hb-400" />
              }
            </div>
            <div>
              <p className="font-bold text-hb-700 dark:text-white">Notifications push</p>
              <p className={cn('text-sm mt-0.5', statusColor)}>{statusText}</p>
            </div>
          </div>

          {isSupported && !isIos && permission !== 'denied' && (
            <button onClick={handleToggleMain} disabled={loading}
              className="flex-shrink-0">
              {loading
                ? <Loader2 size={28} className="animate-spin text-brand-500" />
                : isSubscribed
                  ? <ToggleRight size={36} className="text-green-500" />
                  : <ToggleLeft size={36} className="text-hb-300" />
              }
            </button>
          )}
        </div>

        {/* Info iOS */}
        {isIos && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl flex gap-2">
            <AlertCircle size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
              <strong>iPhone / iPad :</strong> Installez d&apos;abord l&apos;app Habynex sur votre écran d&apos;accueil (bouton Partager → Ajouter à l&apos;écran), puis revenez activer les notifications.
            </p>
          </div>
        )}

        {/* Permission refusée */}
        {permission === 'denied' && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl flex gap-2">
            <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-1">Notifications bloquées</p>
              <p className="text-xs text-red-500 dark:text-red-400 leading-relaxed">
                Allez dans les paramètres de votre navigateur → Confidentialité → Notifications → Habynex → Autoriser.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Préférences par type */}
      {isSubscribed && (
        <div className="bg-white dark:bg-hb-800 rounded-3xl border border-hb-100 dark:border-hb-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-hb-100 dark:border-hb-700">
            <p className="font-bold text-hb-700 dark:text-white">Choisir ce que je reçois</p>
            <p className="text-xs text-hb-400 mt-0.5">Personnalisez les types de notifications</p>
          </div>
          <div className="divide-y divide-hb-100 dark:divide-hb-700">
            {NOTIF_TYPES.map(type => (
              <div key={type.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-9 h-9 bg-hb-50 dark:bg-hb-700 rounded-xl flex items-center justify-center')}>
                    <type.icon size={17} className={type.color} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-hb-700 dark:text-white">{type.label}</p>
                    <p className="text-xs text-hb-400 mt-0.5">{type.desc}</p>
                  </div>
                </div>
                <button onClick={() => togglePref(type.id)} className="flex-shrink-0 ml-3">
                  {prefs[type.id]
                    ? <ToggleRight size={28} className="text-brand-500" />
                    : <ToggleLeft size={28} className="text-hb-300" />
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test notification */}
      {isSubscribed && (
        <div className="bg-white dark:bg-hb-800 rounded-3xl border border-hb-100 dark:border-hb-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-hb-700 dark:text-white">Tester les notifications</p>
              <p className="text-xs text-hb-400 mt-0.5">Envoyez-vous une notification de test</p>
            </div>
          </div>
          <button onClick={sendTestNotif} disabled={testLoading}
            className="w-full py-3 border-2 border-brand-300 text-brand-600 dark:text-brand-400 font-semibold rounded-2xl hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-colors flex items-center justify-center gap-2 text-sm">
            {testLoading
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />
            }
            {testLoading ? 'Envoi...' : 'Envoyer une notification test'}
          </button>
        </div>
      )}

      {/* Compteur abonnés — pour admin */}
      <div className="text-center text-xs text-hb-300 pb-4">
        Habynex respecte votre vie privée. Aucune donnée personnelle n&apos;est partagée avec des tiers.
      </div>
    </div>
  )
}
