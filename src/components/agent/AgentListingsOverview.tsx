'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import {
  Eye, MapPin, BedDouble, Maximize2, CheckCircle2,
  Clock, XCircle, Loader2, Plus, ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react'
import { cn, formatPrice } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AgentListing {
  id: string
  title: string
  slug: string
  type: string
  transaction: string
  price: number
  price_negotiable: boolean
  status: 'pending_review' | 'published' | 'rejected' | 'archived'
  neighborhood_id: string | null
  address_hint: string | null
  bedrooms: number | null
  bathrooms: number | null
  surface_m2: number | null
  lat: number | null
  lng: number | null
  created_at: string
  published_at: string | null
  rejection_reason: string | null
  view_count: number | null
  neighborhood?: { name: string }
  media?: { url: string; is_cover: boolean }[]
}

const STATUS_CONFIG = {
  published:     { label: 'Publiée',          color: 'bg-green-100 text-green-600 dark:bg-green-950/30 dark:text-green-400', icon: CheckCircle2 },
  pending_review:{ label: 'En validation',    color: 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400', icon: Clock },
  rejected:      { label: 'Refusée',          color: 'bg-red-100 text-red-500 dark:bg-red-950/30 dark:text-red-400',         icon: XCircle },
  archived:      { label: 'Archivée',         color: 'bg-gray-100 text-gray-400 dark:bg-gray-800',                           icon: Clock },
}

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartement', studio: 'Studio', room: 'Chambre',
  villa: 'Villa', duplex: 'Duplex', commercial: 'Local commercial',
}
const TRANSACTION_LABELS: Record<string, string> = {
  rent: 'Location', sale: 'Vente', furnished: 'Meublé',
  coliving: 'Colocation', short_stay: 'Court séjour',
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function AgentListingsOverview() {
  const supabase = createClient()
  const { user } = useAuthStore()
  const router = useRouter()

  const [listings, setListings] = useState<AgentListing[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'published' | 'pending_review' | 'rejected'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('listings')
      .select(`
        id, title, slug, type, transaction, price, price_negotiable,
        status, neighborhood_id, address_hint, bedrooms, bathrooms,
        surface_m2, lat, lng, created_at, published_at, rejection_reason, view_count,
        neighborhood:neighborhoods(name),
        media:listing_media(url, is_cover)
      `)
      .eq('submitted_by_agent', user.id)
      .order('created_at', { ascending: false })

    setListings((data as AgentListing[]) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all' ? listings : listings.filter(l => l.status === filter)

  // KPIs
  const published = listings.filter(l => l.status === 'published').length
  const pending = listings.filter(l => l.status === 'pending_review').length
  const rejected = listings.filter(l => l.status === 'rejected').length
  const totalViews = listings.reduce((s, l) => s + (l.view_count ?? 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-hb-700 dark:text-white">Mes annonces</h2>
          <p className="text-sm text-hb-400 mt-0.5">{listings.length} annonce{listings.length > 1 ? 's' : ''} soumise{listings.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => router.push('/agent-dashboard/nouvelle-annonce')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-2xl text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20">
          <Plus size={15} /> Nouvelle annonce
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Publiées',       value: published,   color: 'text-green-600' },
          { label: 'En validation',  value: pending,     color: 'text-amber-500' },
          { label: 'Refusées',       value: rejected,    color: 'text-red-500' },
          { label: 'Vues totales',   value: totalViews,  color: 'text-blue-500' },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-hb-800 rounded-2xl border border-hb-100 dark:border-hb-700 p-4 text-center">
            <p className={cn('text-2xl font-bold', k.color)}>{k.value}</p>
            <p className="text-xs text-hb-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-1.5 flex-wrap">
        {([
          { key: 'all',           label: `Toutes (${listings.length})` },
          { key: 'published',     label: `Publiées (${published})` },
          { key: 'pending_review',label: `En attente (${pending})` },
          { key: 'rejected',      label: `Refusées (${rejected})` },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
              filter === f.key
                ? 'bg-hb-700 dark:bg-white text-white dark:text-hb-900'
                : 'bg-hb-100 dark:bg-hb-800 text-hb-500 dark:text-hb-400 hover:bg-hb-200 dark:hover:bg-hb-700')}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-hb-800 rounded-3xl border border-hb-100 dark:border-hb-700">
          <p className="text-4xl mb-3">🏠</p>
          <p className="text-hb-500 font-medium">Aucune annonce {filter !== 'all' ? 'dans cette catégorie' : ''}</p>
          <button onClick={() => router.push('/agent-dashboard/nouvelle-annonce')}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white rounded-2xl text-sm font-semibold hover:bg-brand-600 transition-colors">
            <Plus size={15} /> Ajouter une annonce
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(listing => {
            const cover = listing.media?.find(m => m.is_cover) ?? listing.media?.[0]
            const neighborhood = Array.isArray(listing.neighborhood) ? listing.neighborhood[0] : listing.neighborhood
            const cfg = STATUS_CONFIG[listing.status] ?? STATUS_CONFIG.archived
            const StatusIcon = cfg.icon
            const isExpanded = expandedId === listing.id

            return (
              <div key={listing.id}
                className="bg-white dark:bg-hb-800 rounded-3xl border border-hb-100 dark:border-hb-700 overflow-hidden">

                {/* Ligne principale */}
                <div className="flex gap-4 p-4">
                  {/* Photo */}
                  <div className="w-24 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-hb-100 dark:bg-hb-700">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover.url} alt={listing.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🏠</div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm text-hb-700 dark:text-white leading-tight line-clamp-1">{listing.title}</p>
                      <span className={cn('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0', cfg.color)}>
                        <StatusIcon size={10} />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-hb-400 mb-2">
                      {TYPE_LABELS[listing.type] ?? listing.type} · {TRANSACTION_LABELS[listing.transaction] ?? listing.transaction}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-hb-400">
                      <span className="font-bold text-hb-600 dark:text-hb-200">
                        {listing.price.toLocaleString()} FCFA{listing.price_negotiable ? ' 〜' : ''}
                      </span>
                      {neighborhood?.name && (
                        <span className="flex items-center gap-1"><MapPin size={10} />{neighborhood.name}</span>
                      )}
                      {listing.bedrooms != null && (
                        <span className="flex items-center gap-1"><BedDouble size={10} />{listing.bedrooms} ch.</span>
                      )}
                      {listing.surface_m2 != null && (
                        <span className="flex items-center gap-1"><Maximize2 size={10} />{listing.surface_m2}m²</span>
                      )}
                      {listing.view_count != null && (
                        <span className="flex items-center gap-1"><Eye size={10} />{listing.view_count} vues</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {listing.status === 'published' && (
                      <a href={`/bien/${listing.slug}`} target="_blank" rel="noopener noreferrer"
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-colors">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button onClick={() => setExpandedId(isExpanded ? null : listing.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-hb-400 hover:bg-hb-100 dark:hover:bg-hb-700 transition-colors">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Détails expandés */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-hb-100 dark:border-hb-700 pt-3 space-y-3 animate-fade-in">

                    {/* Message de refus */}
                    {listing.status === 'rejected' && listing.rejection_reason && (
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-3">
                        <p className="text-xs font-semibold text-red-500 mb-1">Raison du refus :</p>
                        <p className="text-sm text-red-600 dark:text-red-400">{listing.rejection_reason}</p>
                      </div>
                    )}

                    {/* Infos supplémentaires */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Soumise le',    value: new Date(listing.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' }) },
                        { label: 'Publiée le',    value: listing.published_at ? new Date(listing.published_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short' }) : '—' },
                        { label: 'Coordonnées',   value: listing.lat ? `${listing.lat.toFixed(4)}, ${listing.lng?.toFixed(4)}` : 'Non renseigné' },
                      ].map(d => (
                        <div key={d.label} className="bg-hb-50 dark:bg-hb-700 rounded-xl px-3 py-2">
                          <p className="text-xs text-hb-400 mb-0.5">{d.label}</p>
                          <p className="text-xs font-semibold text-hb-700 dark:text-hb-200">{d.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Minimap statique si coordonnées disponibles */}
                    {listing.lat && listing.lng && (
                      <div>
                        <p className="text-xs text-hb-400 mb-1.5 flex items-center gap-1">
                          <MapPin size={11} /> Position sur la carte
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://static-maps.yandex.ru/1.x/?lang=fr_FR&ll=${listing.lng},${listing.lat}&z=15&l=map&size=600,200&pt=${listing.lng},${listing.lat},pm2rdm`}
                          alt="Carte"
                          className="w-full h-32 object-cover rounded-2xl border border-hb-200 dark:border-hb-600"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                    )}

                    {/* Photos */}
                    {listing.media && listing.media.length > 0 && (
                      <div>
                        <p className="text-xs text-hb-400 mb-1.5">Photos ({listing.media.length})</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {listing.media.slice(0, 6).map((m, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={m.url} alt="" className="w-20 h-16 object-cover rounded-xl flex-shrink-0 border border-hb-100 dark:border-hb-600" />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Statut en attente */}
                    {listing.status === 'pending_review' && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-3 flex items-start gap-2">
                        <Clock size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Votre annonce est en cours de validation par l'équipe Habynex. Vous serez notifié dès qu'elle sera approuvée (généralement sous 24h).
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
