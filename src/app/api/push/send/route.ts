import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * API envoi de notifications push
 *
 * SETUP (une seule fois) :
 * 1. npm install web-push
 * 2. npx web-push generate-vapid-keys  → copier les 2 clés
 * 3. Ajouter dans .env.local :
 *    NEXT_PUBLIC_VAPID_KEY=Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *    VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *    VAPID_EMAIL=support@habynex.com
 *
 * Types de notifications supportés :
 * - "new_listing"     : Nouvelle annonce dans le quartier favori
 * - "message"         : Nouveau message reçu
 * - "booking"         : Visite confirmée / rappel
 * - "agent_assigned"  : Agent assigné à une visite
 * - "promo"           : Annonce promotionnelle globale
 * - "system"          : Notification système admin
 */

type NotifType = 'new_listing' | 'message' | 'booking' | 'agent_assigned' | 'promo' | 'system'

interface PushSubscription {
  endpoint: string
  p256dh: string
  auth: string
  user_id?: string
}

interface NotifPayload {
  type: NotifType
  userId?: string           // null = envoyer à tous
  title: string
  message: string
  url?: string
  tag?: string
  image?: string
  requireInteraction?: boolean
  actions?: { action: string; title: string }[]
}

export async function POST(req: NextRequest) {
  try {
    // Auth admin via secret key dans le header
    const auth = req.headers.get('x-admin-key')
    if (auth !== process.env.ADMIN_SECRET_KEY && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body: NotifPayload = await req.json()
    const { userId, title, message, url = '/', tag, image, requireInteraction, actions, type } = body

    const supabase = createAdminClient()

    // Récupérer les abonnements
    let query = supabase.from('push_subscriptions').select('*')
    if (userId) query = query.eq('user_id', userId)
    const { data: subscriptions, error: dbErr } = await query as { data: PushSubscription[] | null, error: unknown }

    if (dbErr) throw dbErr
    if (!subscriptions?.length) {
      return NextResponse.json({ sent: 0, message: 'Aucun abonnement trouvé' })
    }

    // Payload de notification
    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      image: image ?? null,
      data: { url, type },
      tag: tag ?? type,
      requireInteraction: requireInteraction ?? false,
      vibrate: [200, 100, 200],
      actions: actions ?? getDefaultActions(type),
    })

    // Initialiser web-push
    let webpush: any = null
    try {
      webpush = require('web-push')
      webpush.setVapidDetails(
        `mailto:${process.env.VAPID_EMAIL ?? 'support@habynex.com'}`,
        process.env.NEXT_PUBLIC_VAPID_KEY!,
        process.env.VAPID_PRIVATE_KEY!
      )
    } catch {
      // web-push non installé — mode simulation
      console.warn('[Push] web-push non installé. Exécutez: npm install web-push')
      return NextResponse.json({
        sent: 0,
        simulated: subscriptions.length,
        warning: 'web-push non installé. Exécutez: npm install web-push',
        payload,
      })
    }

    let sent = 0
    let failed = 0
    const expired: string[] = []

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
            { TTL: 3600 } // Conserver 1h si offline
          )
          sent++
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            expired.push(sub.endpoint)
          } else {
            failed++
            console.error('[Push] Échec:', sub.endpoint.slice(0, 40), err.message)
          }
        }
      })
    )

    // Supprimer les abonnements expirés
    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expired)
    }

    // Logger la notification en base
    await supabase.from('push_logs').insert({
      type,
      title,
      message,
      url,
      target_user_id: userId ?? null,
      sent_count: sent,
      failed_count: failed,
      expired_count: expired.length,
    }).then(() => {}) // Silencieux si la table n'existe pas encore

    return NextResponse.json({
      success: true,
      sent,
      failed,
      expired: expired.length,
      total: subscriptions.length,
    })
  } catch (err: any) {
    console.error('[Push API] Error:', err)
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 })
  }
}

function getDefaultActions(type: NotifType) {
  switch (type) {
    case 'new_listing':
      return [
        { action: 'view', title: '👁️ Voir l\'annonce' },
        { action: 'save', title: '❤️ Sauvegarder' },
      ]
    case 'message':
      return [{ action: 'reply', title: '💬 Répondre' }]
    case 'booking':
      return [
        { action: 'confirm', title: '✅ Confirmer' },
        { action: 'reschedule', title: '📅 Reporter' },
      ]
    default:
      return []
  }
}