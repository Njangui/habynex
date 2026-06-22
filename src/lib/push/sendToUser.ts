/**
 * lib/push/sendToUser.ts — Helper serveur pour déclencher une notification push
 * directement (sans passer par un appel HTTP interne à /api/push/send).
 *
 * À utiliser dans toutes les routes API serveur (webhooks, cron, etc.)
 * En Afrique beaucoup de gens ne lisent jamais leurs emails — le push est le
 * canal PRINCIPAL. L'email est réservé aux événements importants seulement
 * (bienvenue, paiement confirmé, annonce publiée/rejetée, agent validé, suppression compte).
 */

import { createAdminClient } from '@/lib/supabase/server'

type NotifType = 'new_listing' | 'message' | 'booking' | 'agent_assigned' | 'promo' | 'system'

interface SendPushParams {
  userId: string
  type: NotifType
  title: string
  message: string
  url?: string
  tag?: string
  requireInteraction?: boolean
}

export async function sendPushToUser({
  userId, type, title, message, url = '/', tag, requireInteraction,
}: SendPushParams): Promise<{ sent: number; failed: number }> {
  const supabase = createAdminClient()

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subscriptions?.length) return { sent: 0, failed: 0 }

  const payload = JSON.stringify({
    title,
    body: message,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    data: { url, type },
    tag: tag ?? type,
    requireInteraction: requireInteraction ?? false,
    vibrate: [200, 100, 200],
  })

  let webpush: any = null
  try {
    webpush = require('web-push')
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL ?? 'support@habynex.com'}`,
      process.env.NEXT_PUBLIC_VAPID_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )
  } catch {
    console.warn('[Push] web-push non installé — notification non envoyée')
    return { sent: 0, failed: subscriptions.length }
  }

  let sent = 0
  let failed = 0
  const expired: string[] = []

  await Promise.allSettled(
    subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 3600 }
        )
        sent++
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expired.push(sub.endpoint)
        } else {
          failed++
        }
      }
    })
  )

  if (expired.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expired)
  }

  return { sent, failed }
}
