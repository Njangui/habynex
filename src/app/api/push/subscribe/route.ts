import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, endpoint, p256dh, auth } = await req.json()

    if (!userId || !endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          user_agent: req.headers.get('user-agent')?.slice(0, 200) ?? null,
        },
        {
          onConflict: 'user_id,endpoint',
        }
      )

    if (error) {
      console.error('Erreur insertion push subscription:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Abonnement enregistré',
    })
  } catch (err: any) {
    console.error('Erreur API push subscribe:', err)

    return NextResponse.json(
      {
        error: err?.message || 'Erreur interne',
      },
      {
        status: 500,
      }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json()

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint manquant' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
    })
  } catch (err: any) {
    console.error('Erreur suppression push subscription:', err)

    return NextResponse.json(
      {
        error: err?.message || 'Erreur interne',
      },
      {
        status: 500,
      }
    )
  }
}