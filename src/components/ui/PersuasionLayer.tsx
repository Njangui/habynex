'use client'

/**
 * HABYNEX — Couche de persuasion
 * COLONNES CORRIGÉES :
 *   favorite_count  (pas favorites_count)
 *   view_count      (pas views_count)
 *   type            (pas property_type)
 */

import { useState, useEffect } from 'react'
import { Eye, Heart, Clock, TrendingUp, Star, Zap, AlertCircle, Percent, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ── 1. VISITEURS EN TEMPS RÉEL ──────────────────────────────────────
export function LiveViewersBadge({ listingId, className }: { listingId: string; className?: string }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`listing-presence:${listingId}`, {
      config: { presence: { key: listingId } },
    })
    channel
      .on('presence', { event: 'sync' }, () => {
        setCount(Object.keys(channel.presenceState()).length)
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') await channel.track({ listing_id: listingId, joined_at: Date.now() })
      })
    return () => { supabase.removeChannel(channel) }
  }, [listingId])
  if (count < 2) return null
  return (
    <div className={cn('flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-950/30 rounded-full', className)}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      <span className="text-xs font-bold text-red-600 dark:text-red-400">{count} personnes regardent en ce moment</span>
    </div>
  )
}

// ── 2. RARETÉ ────────────────────────────────────────────────────────
export function ScarcityBadge({ listingId, neighborhoodId, propertyType, className }: {
  listingId: string; neighborhoodId?: string; propertyType?: string; className?: string
}) {
  const [total, setTotal] = useState<number | null>(null)
  useEffect(() => {
    if (!neighborhoodId && !propertyType) return
    const supabase = createClient()
    let q = supabase.from('listings').select('id', { count: 'exact', head: true })
      .eq('status', 'published').neq('id', listingId)
    if (neighborhoodId) q = q.eq('neighborhood_id', neighborhoodId)
    if (propertyType) q = q.eq('type', propertyType) // ← corrigé
    q.then(({ count }) => setTotal(count ?? 0))
  }, [listingId, neighborhoodId, propertyType])
  if (total === null || total > 3) return null
  return (
    <div className={cn('flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl', className)}>
      <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
        {total === 0 ? '⚡ Seul bien disponible dans ce quartier !' : `⚡ Seulement ${total} bien${total > 1 ? 's' : ''} similaire${total > 1 ? 's' : ''} disponible${total > 1 ? 's' : ''}`}
      </span>
    </div>
  )
}

// ── 3. PREUVE SOCIALE ────────────────────────────────────────────────
export function SocialProofBar({ listingId, className }: { listingId: string; className?: string }) {
  const [data, setData] = useState<{ favorites: number; views: number } | null>(null)
  useEffect(() => {
    const supabase = createClient()
    supabase.from('listings')
      .select('favorite_count, view_count') // ← corrigé
      .eq('id', listingId).single()
      .then(({ data: l }) => {
        if (l) setData({ favorites: l.favorite_count ?? 0, views: l.view_count ?? 0 })
      })
  }, [listingId])
  if (!data || (data.favorites < 3 && data.views < 20)) return null
  return (
    <div className={cn('flex items-center gap-4 flex-wrap text-xs text-hb-400', className)}>
      {data.favorites >= 3 && (
        <span className="flex items-center gap-1">
          <Heart size={12} className="text-red-400 fill-red-400" />
          <strong className="text-hb-600 dark:text-hb-300">{data.favorites}</strong> personnes ont sauvegardé ce bien
        </span>
      )}
      {data.views >= 20 && (
        <span className="flex items-center gap-1">
          <Eye size={12} />
          <strong className="text-hb-600 dark:text-hb-300">{data.views}</strong> vues
        </span>
      )}
    </div>
  )
}

// ── 4. FOMO ──────────────────────────────────────────────────────────
export function RecentBookingToast({ neighborhoodId }: { neighborhoodId?: string }) {
  const [booking, setBooking] = useState<{ name: string; minutesAgo: number } | null>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!neighborhoodId) return
    const supabase = createClient()
    supabase.from('visit_bookings')
      .select('created_at, client:profiles!visit_bookings_client_id_fkey(full_name)')
      .eq('status', 'paid').order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (!data?.length) return
        const item = data[0] as any
        const profile = Array.isArray(item.client) ? item.client[0] : item.client
        const firstName = profile?.full_name?.split(' ')[0] ?? 'Un client'
        const minutesAgo = Math.round((Date.now() - new Date(item.created_at).getTime()) / 60000)
        if (minutesAgo > 240) return
        setBooking({ name: firstName, minutesAgo })
        setTimeout(() => setShow(true), 4000)
        setTimeout(() => setShow(false), 10000)
      })
  }, [neighborhoodId])
  if (!show || !booking) return null
  return (
    <div className="fixed bottom-24 left-4 z-50 animate-slide-up max-w-xs">
      <div className="bg-white dark:bg-hb-800 rounded-2xl shadow-2xl border border-hb-100 dark:border-hb-700 p-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-brand-100 dark:bg-brand-900/40 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-brand-600">
          {booking.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-hb-700 dark:text-white">
            {booking.name} a réservé une visite dans ce quartier
          </p>
          <p className="text-xs text-hb-400">
            Il y a {booking.minutesAgo < 60 ? `${booking.minutesAgo} min` : `${Math.round(booking.minutesAgo / 60)}h`}
          </p>
        </div>
        <button onClick={() => setShow(false)} className="text-hb-300 flex-shrink-0 text-xl leading-none">×</button>
      </div>
    </div>
  )
}

// ── 5. ANCRAGE PRIX ──────────────────────────────────────────────────
export function PriceAnchorBadge({ price, neighborhoodId, propertyType, className }: {
  price: number; neighborhoodId?: string; propertyType?: string; className?: string
}) {
  const [marketAvg, setMarketAvg] = useState<number | null>(null)
  useEffect(() => {
    if (!neighborhoodId) return
    const supabase = createClient()
    let q = supabase.from('listings').select('price').eq('status', 'published').eq('neighborhood_id', neighborhoodId)
    if (propertyType) q = q.eq('type', propertyType) // ← corrigé
    q.then(({ data }) => {
      if (!data?.length) return
      setMarketAvg(Math.round(data.reduce((s, l) => s + l.price, 0) / data.length))
    })
  }, [neighborhoodId, propertyType])
  if (!marketAvg) return null
  const diff = Math.round(((marketAvg - price) / marketAvg) * 100)
  if (diff <= 5) return null
  return (
    <div className={cn('inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-full', className)}>
      <TrendingUp size={13} className="text-green-500" />
      <span className="text-xs font-bold text-green-700 dark:text-green-400">
        {diff}% moins cher que les biens similaires dans ce quartier
      </span>
    </div>
  )
}

// ── 6. COMPTE À REBOURS ──────────────────────────────────────────────
export function CountdownOffer({ listingId, label = "Cette offre expire dans :", className }: {
  listingId?: string; label?: string; className?: string
}) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  useEffect(() => {
    if (!listingId) return
    const supabase = createClient()
    supabase.from('listings').select('expires_at').eq('id', listingId).single()
      .then(({ data }) => {
        if (!data?.expires_at) return
        const diff = Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000)
        if (diff > 0) setSecondsLeft(diff)
      })
  }, [listingId])
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return
    const interval = setInterval(() => setSecondsLeft(s => s !== null ? Math.max(0, s - 1) : null), 1000)
    return () => clearInterval(interval)
  }, [secondsLeft])
  if (!secondsLeft || secondsLeft <= 0) return null
  const h = Math.floor(secondsLeft / 3600)
  const m = Math.floor((secondsLeft % 3600) / 60)
  const s = secondsLeft % 60
  return (
    <div className={cn('flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl', className)}>
      <Clock size={16} className="text-red-500 flex-shrink-0 animate-pulse" />
      <div>
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">{label}</p>
        <div className="flex gap-1 mt-1">
          {[{ val: h, unit: 'h' }, { val: m, unit: 'm' }, { val: s, unit: 's' }].map(({ val, unit }) => (
            <div key={unit} className="flex items-center gap-0.5">
              <span className="bg-red-600 text-white text-sm font-bold px-1.5 py-0.5 rounded-lg min-w-[28px] text-center tabular-nums">
                {String(val).padStart(2, '0')}
              </span>
              <span className="text-xs text-red-400">{unit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 7. BADGES DE CONFIANCE ───────────────────────────────────────────
export function TrustBadges({ listingId, className }: { listingId?: string; className?: string }) {
  const [agentRating, setAgentRating] = useState<number | null>(null)
  useEffect(() => {
    if (!listingId) return
    const supabase = createClient()
    supabase.from('listings')
      .select('agent:profiles!listings_submitted_by_agent_fkey(rating_avg)')
      .eq('id', listingId).single()
      .then(({ data }) => {
        const agent = Array.isArray(data?.agent) ? (data as any).agent[0] : (data as any)?.agent
        if (agent?.rating_avg) setAgentRating(Math.round(agent.rating_avg * 10) / 10)
      })
  }, [listingId])
  const badges = [
    { icon: Star, label: agentRating ? `Agent noté ${agentRating}/5` : 'Annonce vérifiée', color: 'text-yellow-500' },
    { icon: Users, label: 'Agents certifiés Habynex', color: 'text-blue-500' },
    { icon: Zap, label: 'Réponse rapide garantie', color: 'text-green-500' },
  ]
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {badges.map(b => (
        <div key={b.label} className="flex items-center gap-1.5">
          <b.icon size={13} className={b.color} />
          <span className="text-xs font-medium text-hb-500 dark:text-hb-300">{b.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── 8. BADGE RÉDUCTION ───────────────────────────────────────────────
export function DiscountBadge({ originalPrice, currentPrice, className }: {
  originalPrice: number; currentPrice: number; className?: string
}) {
  if (!originalPrice || originalPrice <= currentPrice) return null
  const pct = Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
  if (pct < 2) return null
  return (
    <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-sm', className)}>
      <Percent size={9} />−{pct}%
    </div>
  )
}

// ── 9b. NUDGE FAVORIS ────────────────────────────────────────────────
export function FavoriteNudge({ count, className }: { count: number; className?: string }) {
  if (!count || count < 3) return null
  return (
    <div className={cn('flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl', className)}>
      <Heart size={13} className="text-rose-500 fill-rose-500 flex-shrink-0" />
      <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
        {count} personnes ont sauvegardé ce bien — très demandé !
      </span>
    </div>
  )
}

// ── 9c. BIAIS DE PERTE ───────────────────────────────────────────────
export function LossBiasPrompt({ pricePerDay, className }: { pricePerDay: number; className?: string }) {
  if (!pricePerDay || pricePerDay <= 0) return null
  return (
    <div className={cn('flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl', className)}>
      <Clock size={14} className="text-amber-500 flex-shrink-0" />
      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
        En attendant, vous perdez environ{' '}
        <strong>{pricePerDay.toLocaleString('fr-FR')} FCFA/jour</strong>{' '}
        par rapport au prix du marché.
      </p>
    </div>
  )
}

// ── 9. BANNIÈRE VALEUR HABYNEX ───────────────────────────────────────
export function HabynexValueBanner({ className }: { className?: string }) {
  const [totalVisits, setTotalVisits] = useState<number | null>(null)
  useEffect(() => {
    const supabase = createClient()
    supabase.from('visit_bookings').select('id', { count: 'exact', head: true }).eq('status', 'paid')
      .then(({ count }) => setTotalVisits(count ?? 0))
  }, [])
  return (
    <div className={cn('bg-gradient-to-r from-brand-500/10 to-amber-500/10 dark:from-brand-500/5 dark:to-amber-500/5 border border-brand-200 dark:border-brand-800/40 rounded-2xl px-5 py-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🏆</span>
        <p className="font-bold text-sm text-hb-700 dark:text-white">Pourquoi choisir Habynex ?</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '💰', value: '3 000 FCFA', label: 'Visite terrain', sub: 'Prix fixe par bien (pas de surprise)', highlight: true },
          { icon: '📉', value: '−50%', label: 'Commission réduite', sub: 'Moitié moins cher que le marché traditionnel', highlight: true },
          { icon: '✅', value: totalVisits !== null ? `+${totalVisits.toLocaleString()}` : '...', label: 'Visites réalisées', sub: 'Clients satisfaits à Yaoundé', highlight: false },
        ].map(item => (
          <div key={item.label} className={cn('rounded-xl p-3 text-center', item.highlight ? 'bg-white dark:bg-gray-900 border border-brand-200 dark:border-brand-800/40 shadow-sm' : 'bg-white/60 dark:bg-gray-900/60')}>
            <p className="text-xl mb-1">{item.icon}</p>
            <p className={cn('text-base font-bold', item.highlight ? 'text-brand-500' : 'text-hb-700 dark:text-white')}>{item.value}</p>
            <p className="text-xs font-semibold text-hb-600 dark:text-hb-300">{item.label}</p>
            <p className="text-[10px] text-hb-400 mt-0.5 leading-tight">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}