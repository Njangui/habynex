'use client'

import { useState, useEffect } from 'react'
import { Star, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface AgentRatingProps {
  agentId: string
  agentName: string
  bookingId: string
  onClose?: () => void
}

interface RatingSummary {
  average: number
  total: number
  breakdown: { stars: number; count: number }[]
}

export function AgentRatingModal({ agentId, agentName, bookingId, onClose }: AgentRatingProps) {
  const { user } = useAuthStore()
  const supabase = createClient()
  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!user || stars === 0) { toast.error('Veuillez choisir une note'); return }
    setLoading(true)
    try {
      const { error } = await supabase.from('agent_ratings').upsert({
        agent_id: agentId,
        client_id: user.id,
        booking_id: bookingId,
        stars,
        comment: comment.trim() || null,
      }, { onConflict: 'booking_id' })

      if (error) throw error
      setDone(true)
      toast.success('Merci pour votre évaluation !')
      setTimeout(() => onClose?.(), 2000)
    } catch {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setLoading(false)
    }
  }

  const labels = ['', 'Mauvais', 'Passable', 'Bien', 'Très bien', 'Excellent']

  if (done) {
    return (
      <div className="p-8 text-center">
        <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
        <p className="font-semibold text-hb-700 dark:text-white">Merci pour votre avis !</p>
        <p className="text-sm text-hb-400 mt-1">Votre évaluation aide toute la communauté Habynex.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="text-center">
        <p className="text-lg font-bold text-hb-700 dark:text-white">Évaluer l'agent</p>
        <p className="text-sm text-hb-400 mt-1">Comment s'est passée votre visite avec <strong>{agentName}</strong> ?</p>
      </div>

      {/* Étoiles */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setStars(i)}
            className="transition-transform hover:scale-110">
            <Star size={36}
              className={cn('transition-colors', (hover || stars) >= i
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-hb-200 dark:text-hb-600'
              )} />
          </button>
        ))}
      </div>

      {(hover || stars) > 0 && (
        <p className="text-center text-sm font-medium text-hb-600 dark:text-hb-300">
          {labels[hover || stars]}
        </p>
      )}

      {/* Commentaire */}
      <div>
        <label className="text-sm font-medium text-hb-600 dark:text-hb-300 mb-2 block">
          Commentaire (optionnel)
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Partagez votre expérience avec cet agent..."
          rows={3}
          maxLength={500}
          className="w-full px-4 py-3 text-sm border border-hb-200 dark:border-hb-600 rounded-2xl bg-white dark:bg-hb-800 outline-none focus:border-brand-400 resize-none text-hb-600 dark:text-hb-200 placeholder:text-hb-300"
        />
        <p className="text-xs text-hb-300 text-right mt-1">{comment.length}/500</p>
      </div>

      <button onClick={submit} disabled={loading || stars === 0}
        className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} className="fill-white" />}
        Envoyer mon évaluation
      </button>
    </div>
  )
}

// Affichage résumé des notes d'un agent
export function AgentRatingSummary({ agentId }: { agentId: string }) {
  const supabase = createClient()
  const [summary, setSummary] = useState<RatingSummary | null>(null)
  const [reviews, setReviews] = useState<{ stars: number; comment: string | null; created_at: string; client: { full_name: string | null } | null }[]>([])

  useEffect(() => {
    load()
  }, [agentId])

  async function load() {
    const { data } = await supabase
      .from('agent_ratings')
      .select('stars, comment, created_at, client:profiles!client_id(full_name)')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!data || data.length === 0) return

    const avg = data.reduce((s, r) => s + r.stars, 0) / data.length
    const breakdown = [5, 4, 3, 2, 1].map(s => ({
      stars: s,
      count: data.filter(r => r.stars === s).length,
    }))

    setSummary({ average: avg, total: data.length, breakdown })
    setReviews(data as any)
  }

  if (!summary) return null

  return (
    <div className="space-y-4">
      {/* Note globale */}
      <div className="flex items-center gap-4 p-4 bg-hb-50 dark:bg-hb-700 rounded-2xl">
        <div className="text-center flex-shrink-0">
          <p className="text-4xl font-bold text-hb-700 dark:text-white">{summary.average.toFixed(1)}</p>
          <div className="flex gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} size={14} className={cn(summary.average >= i ? 'text-yellow-400 fill-yellow-400' : 'text-hb-200')} />
            ))}
          </div>
          <p className="text-xs text-hb-400 mt-1">{summary.total} avis</p>
        </div>
        <div className="flex-1 space-y-1">
          {summary.breakdown.map(b => (
            <div key={b.stars} className="flex items-center gap-2">
              <span className="text-xs text-hb-400 w-3">{b.stars}</span>
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              <div className="flex-1 bg-hb-200 dark:bg-hb-600 rounded-full h-1.5">
                <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${summary.total ? (b.count / summary.total) * 100 : 0}%` }} />
              </div>
              <span className="text-xs text-hb-400 w-4">{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Avis récents */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {reviews.filter(r => r.comment).map((r, i) => (
          <div key={i} className="p-3 bg-white dark:bg-hb-800 border border-hb-100 dark:border-hb-700 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-hb-600 dark:text-hb-300">
                {(r.client as any)?.full_name ?? 'Utilisateur'}
              </span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} size={10} className={cn(r.stars >= i ? 'text-yellow-400 fill-yellow-400' : 'text-hb-200')} />
                ))}
              </div>
            </div>
            <p className="text-xs text-hb-500 dark:text-hb-300">{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
