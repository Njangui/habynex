'use client'

/**
 * Hook complet notifications push Habynex
 * Gère : permission, abonnement, désabonnement, état
 * Compatible Android Chrome 50+ et iOS 16.4+
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY ?? ''

type PermState = 'granted' | 'denied' | 'default' | 'unsupported' | 'loading'

export function usePushNotifications() {
  const { user } = useAuthStore()
  const supabase = createClient()
  const [permission, setPermission] = useState<PermState>('loading')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isIos, setIsIos] = useState(false)

  const isSupported = typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window

  useEffect(() => {
    if (!isSupported) { setPermission('unsupported'); return }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIos(ios)
    setPermission(Notification.permission as PermState)

    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setIsSubscribed(!!sub))
    ).catch(() => {})
  }, [isSupported])

  const subscribe = useCallback(async (): Promise<'granted' | 'denied' | 'error'> => {
    if (!user || !isSupported || !VAPID_KEY) {
      console.warn('[Push] NEXT_PUBLIC_VAPID_KEY manquante ou non supporté')
      return 'error'
    }
    setLoading(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result as PermState)
      if (result !== 'granted') { setLoading(false); return 'denied' }

      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(VAPID_KEY),
      })

      const json = sub.toJSON()
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
        user_agent: navigator.userAgent.slice(0, 200),
      }, { onConflict: 'endpoint' })

      setIsSubscribed(true)
      return 'granted'
    } catch (err) {
      console.error('[Push] subscribe error:', err)
      return 'error'
    } finally {
      setLoading(false)
    }
  }, [user, isSupported, supabase])

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      setIsSubscribed(false)
      setPermission('default')
    } finally {
      setLoading(false)
    }
  }, [isSupported, supabase])

  return { permission, isSubscribed, isSupported, isIos, loading, subscribe, unsubscribe }
}

function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const pad = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const buffer = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    buffer[i] = raw.charCodeAt(i)
  }
  return buffer.buffer as ArrayBuffer
}