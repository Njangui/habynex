import { NextRequest, NextResponse } from 'next/server'
import { getDeepSeek, AI_MODEL } from '@/lib/ai/client'
import { createAdminClient } from '@/lib/supabase/server'

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.habynex.com'

// Appelé par Vercel Cron chaque jour à 22h
// vercel.json → { "crons": [{ "path": "/api/cron/daily-report", "schedule": "0 22 * * *" }] }
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  try {
    const [
      { count: newUsers },
      { count: messages },
      { count: bookings },
      { count: listings },
      { count: visitsCompleted },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`),
      supabase.from('messages').select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`),
      supabase.from('visit_bookings').select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`),
      supabase.from('listings').select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
      supabase.from('visit_bookings').select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', `${today}T00:00:00`),
    ])

    const kpi = {
      new_users: newUsers ?? 0,
      messages_sent: messages ?? 0,
      bookings: bookings ?? 0,
      published_listings: listings ?? 0,
      visits_completed: visitsCompleted ?? 0,
    }

    const response = await getDeepSeek().chat.completions.create({
      model: AI_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: `Tu es l'assistant analytique de Habynex, une agence immobilière à Yaoundé, Cameroun.
Tu génères un rapport quotidien concis et actionnable pour les administrateurs.
Réponds uniquement en JSON avec les champs: summary (string markdown), suggestions (array de {type, title, description, priority}).`,
        },
        {
          role: 'user',
          content: `Génère le rapport quotidien du ${today} pour Habynex.\n\nKPIs du jour: ${JSON.stringify(kpi, null, 2)}\n\nFournis une analyse courte et 3-5 suggestions concrètes adaptées au marché immobilier camerounais.`,
        },
      ],
    })

    let reportContent = ''
    let suggestions = []

    try {
      const text = response.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      reportContent = parsed.summary ?? ''
      suggestions = parsed.suggestions ?? []
    } catch {
      reportContent = response.choices[0]?.message?.content ?? ''
    }

    await supabase.from('daily_reports').upsert({
      report_date: today,
      content: reportContent,
      suggestions,
      kpi_snapshot: kpi,
      generated_at: new Date().toISOString(),
    }, { onConflict: 'report_date' })

    const { data: admins } = await supabase
      .from('user_roles').select('user_id').in('role', ['admin', 'super_admin'])

    if (admins?.length) {
      await supabase.from('notifications').insert(
        admins.map((a: { user_id: string }) => ({
          user_id: a.user_id,
          title: `📊 Rapport du ${today}`,
          body: `${kpi.new_users} nouveaux utilisateurs · ${kpi.bookings} réservations · ${kpi.visits_completed} visites`,
          action_url: `${ADMIN_URL}/rapports`,
          channel: 'in_app',
        }))
      )
    }

    return NextResponse.json({ success: true, date: today, kpi })
  } catch (error) {
    console.error('Daily report error:', error)
    return NextResponse.json({ error: 'Report generation failed' }, { status: 500 })
  }
}