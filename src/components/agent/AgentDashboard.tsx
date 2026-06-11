'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Calendar, MapPin, Clock, Star, TrendingUp, Loader2, FileText, ClipboardList, AlertCircle } from 'lucide-react'
import { AgentContract } from '@/components/agent/AgentContract'
import { AgentListingsOverview } from '@/components/agent/AgentListingsOverview'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { cn, formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.habynex.com'

type MissionStatus = 'confirmed' | 'completed' | 'cancelled'

interface Mission {
  id: string
  status: MissionStatus
  scheduled_at: string | null
  nb_listings: number
  amount_paid: number
  listing_ids: string[]
  outcome?: 'success' | 'failure' | null
  chosen_listing_id?: string | null
  client?: { full_name: string | null; phone: string | null }
  listings?: { id: string; title: string; price: number; slug: string }[]
}

export function AgentDashboard() {
  const { user, profile, roles } = useAuthStore()
  const router = useRouter()
  const supabase = createClient()

  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'done'>('upcoming')
  const [stats, setStats] = useState({ total: 0, success: 0, pending: 0, earnings: 0 })
  const [contractSigned, setContractSigned] = useState<boolean | null>(null)
  const [todayReportSubmitted, setTodayReportSubmitted] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/connexion'); return }
    if (!roles.includes('agent')) { router.push('/'); return }
    checkContract()
    checkTodayReport()
    loadMissions()
  }, [user, roles])

  async function checkContract() {
    if (!user) return
    const { data } = await supabase.from('agent_contracts').select('id').eq('agent_id', user.id).eq('status', 'signed').single()
    setContractSigned(!!data)
  }

  async function checkTodayReport() {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('field_reports').select('id').eq('agent_id', user.id).eq('report_date', today).single()
    setTodayReportSubmitted(!!data)
  }

  async function loadMissions() {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('visit_bookings')
      .select(`
        id, status, scheduled_at, nb_listings, amount_paid,
        listing_ids, outcome, chosen_listing_id,
        client:profiles!visit_bookings_client_id_fkey(full_name, phone)
      `)
      .eq('agent_id', user.id)
      .order('scheduled_at', { ascending: false })

    // Supabase retourne les relations comme tableaux — on normalise client
    const missions: Mission[] = (data ?? []).map((d: any) => ({
      ...d,
      client: Array.isArray(d.client) ? (d.client[0] ?? null) : d.client,
    }))
    setMissions(missions)

    // Charger les détails des biens
    const enriched = await Promise.all(missions.map(async m => {
      if (!m.listing_ids?.length) return m
      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, price, slug')
        .in('id', m.listing_ids)
      return { ...m, listings: listings ?? [] }
    }))
    setMissions(enriched)

    // Stats
    const done = enriched.filter(m => m.outcome === 'success').length
    const pending = enriched.filter(m => m.status === 'confirmed').length
    setStats({
      total: enriched.length,
      success: done,
      pending,
      earnings: done * 50000, // simplifié
    })

    setLoading(false)
  }

  async function handleOutcome(
    bookingId: string,
    outcome: 'success' | 'failure',
    chosenListingId?: string
  ) {
    setProcessing(bookingId)
    try {
      // Mettre à jour le booking
      await supabase
        .from('visit_bookings')
        .update({
          outcome,
          chosen_listing_id: chosenListingId ?? null,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)

      if (outcome === 'success' && chosenListingId) {
        // Archiver l'annonce concernée (retirer de l'interface)
        await supabase
          .from('listings')
          .update({ status: 'rented', updated_at: new Date().toISOString() })
          .eq('id', chosenListingId)

        // Notifier l'admin pour créer la commission
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'super_admin'])

        if (admins?.length) {
          await supabase.from('notifications').insert(
            admins.map((a: { user_id: string }) => ({
              user_id: a.user_id,
              title: '🎉 Mission réussie — Commission à créer',
              body: `L'agent a conclu une location. Créez la commission dans le dashboard.`,
              action_url: `${ADMIN_URL}/commissions`,
              channel: 'in_app',
            }))
          )
        }

        // Notifier le client
        const mission = missions.find(m => m.id === bookingId)
        if (mission) {
          await supabase.from('notifications').insert({
            user_id: mission.client ? (mission as any).client_id : null,
            title: '🏠 Félicitations !',
            body: 'Votre demande de logement a été retenue. L\'équipe Habynex vous contacte.',
            channel: 'in_app',
          })
        }

        toast.success('Mission marquée comme réussie ! 🎉')
      } else {
        toast('Mission enregistrée comme non conclue.', { icon: 'ℹ️' })
      }

      await loadMissions()
    } finally {
      setProcessing(null)
    }
  }

  const upcoming = missions.filter(m => m.status === 'confirmed' && !m.outcome)
  const done = missions.filter(m => m.status === 'completed' || m.outcome)

  if (loading || contractSigned === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    )
  }

  // ── CONTRAT NON SIGNÉ : bloquer l'accès aux missions ──
  if (!contractSigned) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/30 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-hb-700 dark:text-white mb-2">Signez votre contrat</h1>
          <p className="text-hb-400 text-sm">
            Avant de recevoir vos premières missions, vous devez signer votre contrat de prestation Habynex.
          </p>
        </div>
        <AgentContract
          agentName={profile?.full_name ?? 'Agent'}
          agentId={user!.id}
          roleType="agent"
          onSigned={() => setContractSigned(true)}
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-hb-700 dark:text-white mb-1">
          Bonjour {profile?.full_name?.split(' ')[0] ?? 'Agent'} 👋
        </h1>
        <p className="text-hb-400">Dashboard agent Habynex</p>

        {/* Bouton rapport du jour */}
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={() => router.push('/agent-dashboard/nouvelle-annonce')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-trust-500 hover:bg-trust-600 text-white rounded-2xl text-sm font-semibold shadow-sm shadow-trust-500/25 transition-colors">
            🏠 Publier une annonce
          </button>
          {todayReportSubmitted ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 rounded-2xl text-sm font-medium">
              <CheckCircle2 size={15} /> Rapport du jour envoyé ✓
            </div>
          ) : (
            <button onClick={() => router.push('/rapport-journalier')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-sm font-semibold shadow-sm shadow-brand-500/25 transition-colors">
              <ClipboardList size={15} /> Soumettre mon rapport du jour
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Missions totales', value: stats.total, icon: Calendar, color: 'text-blue-500' },
          { label: 'En attente', value: stats.pending, icon: Clock, color: 'text-amber-500' },
          { label: 'Réussies', value: stats.success, icon: Star, color: 'text-trust-500' },
          { label: 'Gains estimés', value: formatPrice(stats.earnings), icon: TrendingUp, color: 'text-brand-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-hb-800 rounded-2xl border border-hb-100 dark:border-hb-700 p-4 shadow-card">
            <stat.icon size={18} className={cn('mb-2', stat.color)} />
            <p className="text-lg font-bold text-hb-700 dark:text-white">{stat.value}</p>
            <p className="text-xs text-hb-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Mes annonces */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-hb-700 dark:text-white mb-3">Mes annonces</h2>
        <AgentListingsOverview />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-hb-100 dark:bg-hb-700 rounded-2xl p-1 mb-6">
        {[
          { key: 'upcoming', label: `📅 À venir (${upcoming.length})` },
          { key: 'done', label: `✅ Terminées (${done.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={cn('flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-white dark:bg-hb-800 text-hb-700 dark:text-white shadow-card'
                : 'text-hb-500 dark:text-hb-400 hover:text-hb-700 dark:hover:text-hb-200')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Liste missions */}
      <div className="space-y-4">
        {(activeTab === 'upcoming' ? upcoming : done).length === 0 ? (
          <div className="text-center py-16 text-hb-400">
            <p className="text-4xl mb-3">{activeTab === 'upcoming' ? '📭' : '📋'}</p>
            <p className="font-medium">
              {activeTab === 'upcoming' ? 'Aucune mission planifiée' : 'Aucune mission terminée'}
            </p>
          </div>
        ) : (
          (activeTab === 'upcoming' ? upcoming : done).map(mission => (
            <MissionCard
              key={mission.id}
              mission={mission}
              processing={processing === mission.id}
              onOutcome={handleOutcome}
            />
          ))
        )}
      </div>
    </div>
  )
}

function MissionCard({ mission, processing, onOutcome }: {
  mission: Mission
  processing: boolean
  onOutcome: (id: string, outcome: 'success' | 'failure', chosenId?: string) => void
}) {
  const [showSuccess, setShowSuccess] = useState(false)
  const isDone = !!mission.outcome
  const client = Array.isArray(mission.client) ? mission.client[0] : mission.client

  return (
    <div className={cn(
      'bg-white dark:bg-hb-800 rounded-3xl border shadow-card overflow-hidden',
      mission.outcome === 'success' ? 'border-trust-200 dark:border-trust-800' :
      mission.outcome === 'failure' ? 'border-hb-200 dark:border-hb-700' :
      'border-hb-100 dark:border-hb-700'
    )}>
      {/* En-tête mission */}
      <div className="px-5 py-4 border-b border-hb-100 dark:border-hb-700 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {mission.outcome === 'success' && (
              <span className="flex items-center gap-1 text-xs font-semibold text-trust-600 bg-trust-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> Réussie
              </span>
            )}
            {mission.outcome === 'failure' && (
              <span className="flex items-center gap-1 text-xs font-semibold text-hb-500 bg-hb-100 dark:bg-hb-700 px-2 py-0.5 rounded-full">
                <XCircle size={12} /> Non conclue
              </span>
            )}
            {!mission.outcome && (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <Clock size={12} /> Planifiée
              </span>
            )}
          </div>
          <p className="font-semibold text-hb-700 dark:text-white">
            Visite de {mission.nb_listings} bien{mission.nb_listings > 1 ? 's' : ''}
          </p>
          {client && (
            <p className="text-sm text-hb-400 mt-0.5">
              Client : {client.full_name ?? 'Anonyme'}
              {client.phone && ` · ${client.phone}`}
            </p>
          )}
        </div>
        <div className="text-right">
          {mission.scheduled_at && (
            <p className="text-sm font-medium text-hb-700 dark:text-white">
              {new Date(mission.scheduled_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          )}
          <p className="text-xs text-hb-400 mt-0.5 font-mono">
            #{mission.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Biens à visiter */}
      {mission.listings && mission.listings.length > 0 && (
        <div className="px-5 py-3 border-b border-hb-100 dark:border-hb-700">
          <p className="text-xs text-hb-400 mb-2 font-semibold uppercase tracking-wide">Biens à visiter</p>
          <div className="space-y-1.5">
            {mission.listings.map(l => (
              <div key={l.id} className={cn(
                'flex items-center justify-between px-3 py-2 rounded-xl text-sm',
                mission.chosen_listing_id === l.id
                  ? 'bg-trust-50 dark:bg-trust-950/20 text-trust-700 dark:text-trust-400 font-medium'
                  : 'bg-hb-50 dark:bg-hb-700 text-hb-600 dark:text-hb-300'
              )}>
                <span className="flex items-center gap-1.5">
                  <MapPin size={12} />
                  {l.title.slice(0, 40)}{l.title.length > 40 ? '…' : ''}
                </span>
                <span className="font-semibold text-xs">{formatPrice(l.price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION MISSION TERMINÉE — boutons Succès / Échec ── */}
      {!isDone && (
        <div className="px-5 py-4 bg-hb-50 dark:bg-hb-700/50">
          <p className="text-sm font-semibold text-hb-700 dark:text-white mb-3">
            🏁 Mission terminée ?
          </p>

          {/* Succès → choisir le bien retenu */}
          {showSuccess ? (
            <div className="space-y-2">
              <p className="text-xs text-hb-500 dark:text-hb-400 mb-2">
                Quel bien le client a-t-il choisi ?
              </p>
              {mission.listings?.map(l => (
                <button key={l.id}
                  onClick={() => onOutcome(mission.id, 'success', l.id)}
                  disabled={processing}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-hb-800 border-2 border-trust-200 dark:border-trust-800 rounded-2xl text-sm text-left hover:border-trust-400 transition-colors disabled:opacity-50">
                  <CheckCircle2 size={16} className="text-trust-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-hb-700 dark:text-white">{l.title.slice(0, 50)}</p>
                    <p className="text-xs text-hb-400">{formatPrice(l.price)} / mois</p>
                  </div>
                  {processing && <Loader2 size={14} className="animate-spin text-hb-400" />}
                </button>
              ))}
              <button onClick={() => setShowSuccess(false)}
                className="w-full py-2 text-xs text-hb-400 hover:text-hb-600 transition-colors">
                ← Annuler
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              {/* Bouton Succès */}
              <button
                onClick={() => {
                  if ((mission.listings?.length ?? 0) > 1) {
                    setShowSuccess(true)
                  } else {
                    onOutcome(mission.id, 'success', mission.listings?.[0]?.id)
                  }
                }}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-trust-500 hover:bg-trust-600 text-white font-semibold rounded-2xl text-sm transition-colors disabled:opacity-50">
                {processing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Succès ✓
              </button>

              {/* Bouton Échec */}
              <button
                onClick={() => onOutcome(mission.id, 'failure')}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-hb-300 dark:border-hb-600 text-hb-600 dark:text-hb-400 font-semibold rounded-2xl text-sm hover:bg-hb-100 dark:hover:bg-hb-700 transition-colors disabled:opacity-50">
                {processing ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                Échec ✗
              </button>
            </div>
          )}

          <p className="text-xs text-hb-300 dark:text-hb-500 mt-2 text-center">
            La commission sera calculée automatiquement après confirmation
          </p>
        </div>
      )}
    </div>
  )
}