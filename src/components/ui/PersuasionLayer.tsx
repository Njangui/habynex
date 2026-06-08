'use client'

/**
 * HABYNEX — Couche de persuasion & influence psychologique
 * Techniques : Urgence, Rareté, Preuve sociale, FOMO, Ancrage prix,
 * Réciprocité, Engagement, Autorité, Cohérence, Biais de perte
 */

import { useState, useEffect, useRef } from 'react'
import { Eye, Heart, Users, Clock, TrendingUp, Star, Zap, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── 1. BADGE URGENCE — Compteur visiteurs en temps réel ──────────
export function LiveViewersBadge({ listingId, className }: { listingId: string; className?: string }) {
  const [count, setCount] = useState(() => Math.floor(Math.random() * 8) + 3)

  useEffect(() => {
    // Simuler les allées et venues de visiteurs (crédible)
    const interval = setInterval(() => {
      setCount(prev => {
        const delta = Math.random() < 0.4 ? 1 : Math.random() < 0.3 ? -1 : 0
        return Math.max(1, Math.min(20, prev + delta))
      })
    }, 7000)
    return () => clearInterval(interval)
  }, [listingId])

  return (
    <div className={cn('flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-950/30 rounded-full', className)}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      <span className="text-xs font-bold text-red-600 dark:text-red-400">
        {count} {count === 1 ? 'personne' : 'personnes'} regardent en ce moment
      </span>
    </div>
  )
}

// ── 2. URGENCE — Dernier bien disponible ─────────────────────────
export function ScarcityBadge({ total = 1, className }: { total?: number; className?: string }) {
  if (total > 3) return null
  return (
    <div className={cn('flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl', className)}>
      <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
        {total === 1 ? '⚡ Dernier bien disponible dans ce quartier !' : `⚡ Seulement ${total} biens comme celui-ci disponibles`}
      </span>
    </div>
  )
}

// ── 3. PREUVE SOCIALE — Compteur favoris et vues ─────────────────
export function SocialProofBar({
  favoriteCount, viewCount, className
}: { favoriteCount: number; viewCount: number; className?: string }) {
  if (favoriteCount < 3 && viewCount < 50) return null
  return (
    <div className={cn('flex items-center gap-4 text-xs text-hb-400', className)}>
      {favoriteCount >= 3 && (
        <span className="flex items-center gap-1">
          <Heart size={12} className="text-red-400 fill-red-400" />
          <strong className="text-hb-600 dark:text-hb-300">{favoriteCount}</strong> personnes ont sauvegardé ce bien
        </span>
      )}
      {viewCount >= 50 && (
        <span className="flex items-center gap-1">
          <Eye size={12} />
          <strong className="text-hb-600 dark:text-hb-300">{viewCount}</strong> vues cette semaine
        </span>
      )}
    </div>
  )
}

// ── 4. FOMO — Notification dernière réservation ──────────────────
export function RecentBookingToast({ neighborhood }: { neighborhood: string }) {
  const [show, setShow] = useState(false)
  const names = ['Rodrigue', 'Marie-Claire', 'Patrick', 'Clarisse', 'Jean-Baptiste', 'Emmanuella', 'Thierry', 'Vanessa']
  const [name] = useState(() => names[Math.floor(Math.random() * names.length)])
  const [minutesAgo] = useState(() => Math.floor(Math.random() * 45) + 5)

  useEffect(() => {
    const t = setTimeout(() => { setShow(true) }, 4000)
    const t2 = setTimeout(() => { setShow(false) }, 10000)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-24 left-4 z-50 animate-slide-up max-w-xs">
      <div className="bg-white dark:bg-hb-800 rounded-2xl shadow-2xl border border-hb-100 dark:border-hb-700 p-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-brand-100 dark:bg-brand-900/40 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-brand-600">
          {name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-hb-700 dark:text-white">
            {name} a réservé une visite à {neighborhood}
          </p>
          <p className="text-xs text-hb-400">Il y a {minutesAgo} minutes</p>
        </div>
        <button onClick={() => setShow(false)} className="text-hb-300 flex-shrink-0 text-lg leading-none">×</button>
      </div>
    </div>
  )
}

// ── 5. ANCRAGE PRIX — Afficher le prix vs marché ─────────────────
export function PriceAnchorBadge({
  price, marketAvg, className
}: { price: number; marketAvg: number; className?: string }) {
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

// ── 6. COMPTE À REBOURS — Offre limitée dans le temps ────────────
export function CountdownOffer({
  hoursLeft = 24, label = "Cette offre expire dans :", className
}: { hoursLeft?: number; label?: string; className?: string }) {
  const [timeLeft, setTimeLeft] = useState(hoursLeft * 3600)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const h = Math.floor(timeLeft / 3600)
  const m = Math.floor((timeLeft % 3600) / 60)
  const s = timeLeft % 60

  if (timeLeft === 0) return null

  return (
    <div className={cn('flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl', className)}>
      <Clock size={16} className="text-red-500 flex-shrink-0 animate-pulse" />
      <div>
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">{label}</p>
        <div className="flex gap-1 mt-1">
          {[
            { val: h, unit: 'h' },
            { val: m, unit: 'm' },
            { val: s, unit: 's' },
          ].map(({ val, unit }) => (
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

// ── 7. BADGE AGENCE CERTIFIÉE — Autorité et confiance ────────────
export function TrustBadges({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {[
        { icon: Star, label: 'Annonces vérifiées', color: 'text-yellow-500' },
        { icon: Users, label: 'Agents certifiés', color: 'text-blue-500' },
        { icon: Zap, label: 'Réponse en 2h', color: 'text-green-500' },
      ].map(b => (
        <div key={b.label} className="flex items-center gap-1.5 px-2.5 py-1 bg-hb-50 dark:bg-hb-700 rounded-full border border-hb-100 dark:border-hb-600">
          <b.icon size={12} className={b.color} />
          <span className="text-xs text-hb-500 dark:text-hb-300 font-medium">{b.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── 8. PROGRESSION ENGAGEMENT — Gamification ─────────────────────
export function ProfileCompletionBar({
  steps, className
}: { steps: { label: string; done: boolean }[]; className?: string }) {
  const done = steps.filter(s => s.done).length
  const pct = Math.round((done / steps.length) * 100)
  if (pct === 100) return null

  return (
    <div className={cn('p-4 bg-brand-50 dark:bg-brand-950/20 rounded-2xl border border-brand-100 dark:border-brand-900/30', className)}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-brand-700 dark:text-brand-300">
          Complétez votre profil — {pct}%
        </p>
        <span className="text-xs text-brand-500">{done}/{steps.length}</span>
      </div>
      <div className="w-full bg-brand-100 dark:bg-brand-900/40 rounded-full h-2 mb-3">
        <div
          className="bg-gradient-to-r from-brand-400 to-brand-600 h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-brand-600 dark:text-brand-400">
        ✓ Un profil complet = <strong>3× plus de chances</strong> d'être contacté par un agent
      </p>
      <div className="mt-3 space-y-1.5">
        {steps.filter(s => !s.done).slice(0, 2).map(s => (
          <div key={s.label} className="flex items-center gap-2 text-xs text-brand-500">
            <div className="w-4 h-4 rounded-full border-2 border-brand-300 flex-shrink-0" />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 9. NOTIFICATION FAVORIS — Réciprocité ────────────────────────
export function FavoriteNudge({ count, className }: { count: number; className?: string }) {
  if (count < 5) return null
  return (
    <div className={cn('flex items-center gap-2 p-3 bg-pink-50 dark:bg-pink-950/20 rounded-xl border border-pink-100 dark:border-pink-900/30', className)}>
      <Heart size={14} className="text-pink-500 fill-pink-500 flex-shrink-0" />
      <p className="text-xs text-pink-700 dark:text-pink-400">
        <strong>{count} personnes</strong> ont aussi sauvegardé ce bien. Réservez avant qu'il ne disparaisse !
      </p>
    </div>
  )
}

// ── 10. BIAIS DE PERTE — Ce que vous perdez si vous attendez ─────
export function LossBiasPrompt({ pricePerDay, className }: { pricePerDay: number; className?: string }) {
  return (
    <div className={cn('p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800', className)}>
      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">💸 Chaque jour d'attente vous coûte</p>
      <p className="text-xs text-amber-600 dark:text-amber-300">
        Rester dans un logement plus cher vous coûte environ <strong>{pricePerDay.toLocaleString()} FCFA/jour</strong> de plus.
        En réservant aujourd'hui, vous économisez.
      </p>
    </div>
  )
}
