'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'

const VISITOR_COOKIE = 'hbx_visitor_id'
const VISITOR_COOKIE_DAYS = 400

function getOrCreateVisitorId(): string {
  if (typeof document === 'undefined') return ''

  const existing = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${VISITOR_COOKIE}=`))
    ?.split('=')[1]

  if (existing) return existing

  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `v_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const expires = new Date(Date.now() + VISITOR_COOKIE_DAYS * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${VISITOR_COOKIE}=${id}; expires=${expires}; path=/; SameSite=Lax`
  return id
}

function getDeviceType(): string {
  const ua = navigator.userAgent.toLowerCase()
  if (/ipad|tablet|playbook|silk/.test(ua)) return 'tablet'
  if (/mobi|android|iphone/.test(ua)) return 'mobile'
  return 'desktop'
}

export function useVisitorTracking() {
  const pathname = usePathname()
  const { user } = useAuthStore()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (pathname?.startsWith('/admin')) return

    const visitorId = getOrCreateVisitorId()
    const params = new URLSearchParams(window.location.search)

    fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitor_id: visitorId,
        user_id: user?.id ?? null,
        path: pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        device_type: getDeviceType(),
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
      }),
    }).catch(err => console.error('Erreur tracking visite:', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, user?.id])
}