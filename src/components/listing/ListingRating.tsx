'use client'

/**
 * ListingRating.tsx — Notation d'un bien immobilier
 * Accessible depuis la page de détail d'une annonce
 * Un utilisateur ne peut noter qu'une seule fois (modifiable)
 */

import { useState, useEffect } from 'react'
import { Star, Loader2, Check, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface ListingRatingProps {
  listingId: string
  className?: string
}

interface RatingSummary {
  avg: number
  count: number
  distribution: Record<number, number> // { 5: 10, 4: 5, 3: 2, ... }
}

const CRITERIA = [
  { key: 'location', label: 'Localisation' },
  { key: 'value', label: 'Rapport qualité/prix' },
  { key: 'accuracy', label: 'Conformité à l\'annonce' },
  { key: 'cleanliness', label: 'Propreté & état' },
]

export function ListingRating({ listingId, className }: ListingRatingProps) {
  const { user } = useAuthStore()
  const supabase = createClient()

  const [summary, setSummary] = useState<RatingSummary | null>(null)
  const [userRating, setUserRating] = useState<any>(null)
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)
  const [draft, setDraft] = useState({
    overall: 0,
    location: 0,
    value: 0,
    accuracy: 0,
    cleanliness: 0,
    comment: '',
  })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadRatings() }, [listingId])

  async function loadRatings() {
    setLoading(true)
    // Charger le résumé global
    const { data: ratings } = await supabase
      .from('listing_ratings')
      .select('overall, location, value, accuracy, cleanliness, comment, created_at, user_id')
      .eq('listing_id', listingId)

    if (ratings?.length) {
      const avg = ratings.reduce((s, r) => s + r.overall, 0) / ratings.length
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      ratings.forEach(r => { distribution[r.overall] = (distribution[r.overall] ?? 0) + 1 })
      setSummary({ avg: Math.round(avg * 10) / 10, count: ratings.length, distribution })

      // Notation de l'utilisateur courant
      if (user) {
        const mine = ratings.find(r => r.user_id === user.id)
        if (mine) {
          setUserRating(mine)
          setDraft({
            overall: mine.overall,
            location: mine.location ?? 0,
            value: mine.value ?? 0,
            accuracy: mine.accuracy ?? 0,
            cleanliness: mine.cleanliness ?? 0,
            comment: mine.comment ?? '',
          })
        }
      }
    }
    setLoading(false)
  }

  async function submitRating() {
    if (!user) { toast.error('Connectez-vous pour noter ce bien'); return }
    if (draft.overall === 0) { toast.error('Choisissez une note globale'); return }
    setSaving(true)
    try {
      if (userRating) {
        await supabase.from('listing_ratings').update({
          overall: draft.overall,
          location: draft.location || null,
          value: draft.value || null,
          accuracy: draft.accuracy || null,
          cleanliness: draft.cleanliness || null,
          comment: draft.comment || null,
        }).eq('listing_id', listingId).eq('user_id', user.id)
        toast.success('Note mise à jour ✅')
      } else {
        await supabase.from('listing_ratings').insert({
          listing_id: listingId,
          user_id: user.id,
          overall: draft.overall,
          location: draft.location || null,
          value: draft.value || null,
          accuracy: draft.accuracy || null,
          cleanliness: draft.cleanliness || null,
          comment: draft.comment || null,
        })
        toast.success('Merci pour votre note ! 🌟')
      }
      setShowForm(false)
      await loadRatings()
    } catch {
      toast.error('Erreur lors de la soumission')
    } finally {
      setSaving(false)
    }
  }

  function StarRow({
    value, onChange, label, readOnly = false,
  }: { value: number; onChange?: (v: number) => void; label?: string; readOnly?: boolean }) {
    const [hover, setHover] = useState(0)
    return (
      <div className="flex items-center gap-2">
        {label && <span className="text-xs text-hb-500 dark:text-hb-400 w-32 flex-shrink-0">{label}</span>}
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(star => (
            <button key={star}
              disabled={readOnly}
              onClick={() => !readOnly && onChange?.(star)}
              onMouseEnter={() => !readOnly && setHover(star)}
              onMouseLeave={() => !readOnly && setHover(0)}
              className={cn('transition-transform', !readOnly && 'hover:scale-110 cursor-pointer')}>
              <Star
                size={label ? 16 : 20}
                className={cn(
                  'transition-colors',
                  star <= (hover || value)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-hb-200 dark:text-hb-700'
                )}
              />
            </button>
          ))}
        </div>
        {!readOnly && value > 0 && (
          <span className="text-xs text-amber-500 font-semibold">
            {['', 'Mauvais', 'Passable', 'Bien', 'Très bien', 'Excellent !'][value]}
          </span>
        )}
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-4">
      <Loader2 size={16} className="animate-spin text-hb-300" />
      <span className="text-sm text-hb-400">Chargement des avis…</span>
    </div>
  )

  return (
    <div className={cn('space-y-4', className)}>
      <h2 className="text-lg font-semibold text-hb-700 dark:text-white flex items-center gap-2">
        <Star size={18} className="text-amber-400 fill-amber-400" />
        Notes & Avis
      </h2>

      {/* Résumé global */}
      {summary && summary.count > 0 ? (
        <div className="bg-white dark:bg-hb-800 rounded-2xl border border-hb-100 dark:border-hb-700 p-5">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Note centrale */}
            <div className="text-center">
              <p className="text-5xl font-bold text-hb-700 dark:text-white">{summary.avg}</p>
              <div className="flex justify-center mt-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={14}
                    className={cn(s <= Math.round(summary.avg) ? 'fill-amber-400 text-amber-400' : 'text-hb-200 dark:text-hb-700')} />
                ))}
              </div>
              <p className="text-xs text-hb-400 mt-1">{summary.count} avis</p>
            </div>

            {/* Distribution */}
            <div className="flex-1 min-w-[140px] space-y-1">
              {[5, 4, 3, 2, 1].map(star => {
                const count = summary.distribution[star] ?? 0
                const pct = summary.count > 0 ? (count / summary.count) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-hb-400 w-4 text-right">{star}</span>
                    <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                    <div className="flex-1 bg-hb-100 dark:bg-hb-700 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-hb-400 w-4">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 bg-hb-50 dark:bg-hb-800/50 rounded-2xl border border-dashed border-hb-200 dark:border-hb-700">
          <Star size={28} className="text-hb-200 dark:text-hb-700 mx-auto mb-2" />
          <p className="text-sm font-medium text-hb-500 dark:text-hb-400">Aucun avis pour ce bien</p>
          <p className="text-xs text-hb-400 mt-0.5">Soyez le premier à noter ce logement !</p>
        </div>
      )}

      {/* Bouton laisser un avis */}
      {user ? (
        <>
          <button onClick={() => setShowForm(!showForm)}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border-2 transition-all',
              showForm
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20 text-brand-600'
                : 'border-hb-200 dark:border-hb-700 text-hb-600 dark:text-hb-300 hover:border-brand-300'
            )}>
            <MessageSquare size={15} />
            {userRating ? 'Modifier mon avis' : 'Laisser un avis'}
          </button>

          {showForm && (
            <div className="bg-white dark:bg-hb-800 rounded-2xl border border-hb-100 dark:border-hb-700 p-5 space-y-4">
              <p className="text-sm font-bold text-hb-700 dark:text-white">
                {userRating ? '✏️ Modifier mon avis' : '⭐ Votre avis sur ce bien'}
              </p>

              {/* Note globale */}
              <div>
                <p className="text-xs font-semibold text-hb-500 uppercase tracking-wide mb-2">Note globale *</p>
                <StarRow value={draft.overall} onChange={v => setDraft(d => ({ ...d, overall: v }))} />
              </div>

              {/* Critères détaillés */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-hb-500 uppercase tracking-wide">Critères détaillés (optionnel)</p>
                {CRITERIA.map(c => (
                  <StarRow
                    key={c.key}
                    label={c.label}
                    value={draft[c.key as keyof typeof draft] as number}
                    onChange={v => setDraft(d => ({ ...d, [c.key]: v }))}
                  />
                ))}
              </div>

              {/* Commentaire */}
              <div>
                <label className="text-xs font-semibold text-hb-500 uppercase tracking-wide block mb-2">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={draft.comment}
                  onChange={e => setDraft(d => ({ ...d, comment: e.target.value }))}
                  placeholder="Décrivez votre expérience avec ce bien…"
                  rows={3}
                  className="w-full px-4 py-3 border border-hb-200 dark:border-hb-600 rounded-2xl text-sm bg-white dark:bg-hb-700 text-hb-600 dark:text-white outline-none focus:border-brand-400 resize-none placeholder:text-hb-300"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-3 border-2 border-hb-200 dark:border-hb-600 text-hb-500 rounded-2xl text-sm font-semibold hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors">
                  Annuler
                </button>
                <button onClick={submitRating} disabled={saving || draft.overall === 0}
                  className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving ? 'Envoi…' : userRating ? 'Mettre à jour' : 'Publier mon avis'}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-4 bg-hb-50 dark:bg-hb-800/50 rounded-2xl">
          <p className="text-xs text-hb-400">
            <a href="/connexion" className="text-brand-500 font-semibold hover:underline">Connectez-vous</a>
            {' '}pour laisser un avis sur ce bien
          </p>
        </div>
      )}
    </div>
  )
}
