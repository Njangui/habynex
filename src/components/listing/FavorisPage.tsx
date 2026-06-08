'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, CheckCircle2, XCircle, Loader2, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'next/navigation'
import { ListingCard, ListingCardSkeleton } from './ListingCard'
import { useListings } from '@/hooks/useListings'
import { cn, formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { Listing } from '@/types'

interface BookingWithListing {
  id: string
  status: string
  outcome: string | null
  scheduled_at: string | null
  nb_listings: number
  listing_ids: string[]
  chosen_listing_id: string | null
  listings?: Pick<Listing, 'id' | 'title' | 'price' | 'slug' | 'neighborhood' | 'media'>[]
}

export function FavorisPage() {
  const { user } = useAuthStore()
  const { setFavorites } = useListings()
  const router = useRouter()
  const supabase = createClient()

  const [listings, setListings] = useState<Listing[]>([])
  const [bookings, setBookings] = useState<BookingWithListing[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'favoris' | 'visites'>('favoris')

  useEffect(() => {
    if (!user) { router.push('/connexion'); return }
    loadAll()
  }, [user])

  async function loadAll() {
    if (!user) return
    setLoading(true)

    const [{ data: favData }, { data: bookData }] = await Promise.all([
      supabase
        .from('listing_favorites')
        .select(`listing:listings(
          id, slug, title, type, transaction, price, price_negotiable,
          neighborhood_id, lat, lng, bedrooms, bathrooms, surface_m2,
          furnished, view_count, favorite_count, published_at, amenities,
          neighborhood:neighborhoods(id, name, slug, city:cities(name)),
          media:listing_media(url, is_cover, display_order)
        )`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('visit_bookings')
        .select('id, status, outcome, scheduled_at, nb_listings, listing_ids, chosen_listing_id')
        .eq('client_id', user.id)
        .in('status', ['confirmed', 'completed', 'reminder_sent'])
        .order('scheduled_at', { ascending: false }),
    ])

    const favListings = (favData ?? []).map((f: any) => f.listing).filter(Boolean) as Listing[]
    setListings(favListings)
    setFavorites(favListings.map(l => l.id))

    // Enrichir les bookings avec les biens
    const enrichedBookings = await Promise.all((bookData ?? []).map(async (b: any) => {
      if (!b.listing_ids?.length) return b
      const { data: bListings } = await supabase
        .from('listings')
        .select('id, title, price, slug, neighborhood:neighborhoods(name), media:listing_media(url, is_cover)')
        .in('id', b.listing_ids)
      return { ...b, listings: bListings ?? [] }
    }))
    setBookings(enrichedBookings)

    setLoading(false)
  }

  // Confirmation côté client (après visite)
  async function handleClientOutcome(bookingId: string, outcome: 'success' | 'failure', chosenId?: string) {
    setProcessing(bookingId)
    try {
      await supabase
        .from('visit_bookings')
        .update({
          client_outcome: outcome,
          client_chosen_listing_id: chosenId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)

      if (outcome === 'success') {
        toast.success('Super ! L\'équipe Habynex va vous contacter pour finaliser. 🎉')
      } else {
        toast('Merci pour votre retour. Nous allons vous proposer d\'autres biens.', { icon: 'ℹ️' })
      }
      await loadAll()
    } finally {
      setProcessing(null)
    }
  }

  const pendingConfirmation = bookings.filter(b =>
    b.status === 'completed' && !b.outcome
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-hb-700 dark:text-white mb-6">Mes activités</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-hb-100 dark:bg-hb-700 rounded-2xl p-1 mb-8 w-fit">
        {[
          { key: 'favoris', label: `❤️ Favoris (${listings.length})` },
          { key: 'visites', label: `📅 Mes visites (${bookings.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={cn('px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-white dark:bg-hb-800 text-hb-700 dark:text-white shadow-card'
                : 'text-hb-500 dark:text-hb-400 hover:text-hb-700')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Onglet Favoris ── */}
      {activeTab === 'favoris' && (
        <>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <ListingCardSkeleton key={i} />)}
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <Heart size={40} className="text-hb-200 dark:text-hb-700 mb-4" />
              <h2 className="text-xl font-bold text-hb-700 dark:text-white mb-2">Aucun favori</h2>
              <p className="text-hb-400 text-sm mb-6">Cliquez sur ❤️ sur une annonce pour la sauvegarder</p>
              <Link href="/rechercher"
                className="px-6 py-3 bg-hb-700 dark:bg-white text-white dark:text-hb-700 font-semibold rounded-full text-sm hover:opacity-90 transition-opacity">
                Explorer les annonces
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {listings.map((listing, i) => (
                <ListingCard key={listing.id} listing={listing} priority={i < 4} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Onglet Visites ── */}
      {activeTab === 'visites' && (
        <div className="space-y-4">
          {/* Visites en attente de confirmation client */}
          {pendingConfirmation.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl mb-4">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">
                🔔 {pendingConfirmation.length} visite{pendingConfirmation.length > 1 ? 's' : ''} en attente de votre confirmation
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Indiquez si vous avez trouvé votre logement après votre visite terrain.
              </p>
            </div>
          )}

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)
          ) : bookings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-semibold text-hb-700 dark:text-white mb-2">Aucune visite réservée</p>
              <p className="text-sm text-hb-400 mb-5">Réservez une visite depuis une annonce</p>
              <Link href="/rechercher"
                className="px-6 py-3 bg-brand-500 text-white font-semibold rounded-full text-sm hover:bg-brand-600 transition-colors">
                Trouver un logement
              </Link>
            </div>
          ) : (
            bookings.map(booking => (
              <ClientVisitCard
                key={booking.id}
                booking={booking}
                processing={processing === booking.id}
                onOutcome={handleClientOutcome}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function ClientVisitCard({ booking, processing, onOutcome }: {
  booking: BookingWithListing
  processing: boolean
  onOutcome: (id: string, outcome: 'success' | 'failure', chosenId?: string) => void
}) {
  const [showChoose, setShowChoose] = useState(false)
  const needsConfirmation = booking.status === 'completed' && !booking.outcome

  const statusLabel: Record<string, string> = {
    confirmed: '✅ Confirmée', scheduled: '📅 Planifiée',
    completed: booking.outcome === 'success' ? '🎉 Logement trouvé !' :
               booking.outcome === 'failure' ? '🔄 Non conclu' : '🏁 Visite effectuée',
    reminder_sent: '🔔 Rappel envoyé',
  }

  return (
    <div className={cn(
      'bg-white dark:bg-hb-800 rounded-3xl border overflow-hidden shadow-card',
      needsConfirmation ? 'border-amber-200 dark:border-amber-800' : 'border-hb-100 dark:border-hb-700'
    )}>
      <div className="px-5 py-4 border-b border-hb-100 dark:border-hb-700">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-sm font-semibold text-hb-700 dark:text-white">
              {statusLabel[booking.status] ?? booking.status}
            </span>
            <p className="text-xs text-hb-400 mt-0.5">
              {booking.nb_listings} bien{booking.nb_listings > 1 ? 's' : ''} visité{booking.nb_listings > 1 ? 's' : ''}
              {booking.scheduled_at && ` · ${new Date(booking.scheduled_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
              })}`}
            </p>
          </div>
          <p className="text-[10px] text-hb-300 font-mono">#{booking.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* Biens visités */}
      {booking.listings && booking.listings.length > 0 && (
        <div className="px-5 py-3 border-b border-hb-100 dark:border-hb-700 space-y-1.5">
          {booking.listings.map((l: any) => {
            const cover = l.media?.find((m: any) => m.is_cover)?.url ?? l.media?.[0]?.url
            const isChosen = booking.chosen_listing_id === l.id
            return (
              <Link key={l.id} href={`/bien/${l.slug}`}
                className={cn('flex items-center gap-3 p-2.5 rounded-xl transition-colors group',
                  isChosen ? 'bg-trust-50 dark:bg-trust-950/20' : 'hover:bg-hb-50 dark:hover:bg-hb-700')}>
                <div className="relative w-12 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-hb-100">
                  {cover && <Image src={cover} alt="" fill className="object-cover" sizes="48px" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-medium truncate',
                    isChosen ? 'text-trust-700 dark:text-trust-400' : 'text-hb-700 dark:text-hb-200')}>
                    {isChosen && '✓ '}{l.title}
                  </p>
                  <p className="text-[10px] text-hb-400">{formatPrice(l.price)}</p>
                </div>
                <ChevronRight size={14} className="text-hb-300 group-hover:text-hb-500 flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}

      {/* ── Confirmation client — Succès / Échec ── */}
      {needsConfirmation && (
        <div className="px-5 py-4 bg-amber-50 dark:bg-amber-950/20">
          <p className="text-sm font-semibold text-hb-700 dark:text-white mb-1">
            Votre visite s&apos;est bien passée ?
          </p>
          <p className="text-xs text-hb-400 mb-3">
            Votre retour aide Habynex à finaliser la transaction et récompenser l&apos;agent.
          </p>

          {showChoose ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-hb-600 dark:text-hb-300 mb-2">
                Quel bien avez-vous choisi ?
              </p>
              {booking.listings?.map((l: any) => (
                <button key={l.id}
                  onClick={() => onOutcome(booking.id, 'success', l.id)}
                  disabled={processing}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-white dark:bg-hb-800 border-2 border-trust-300 dark:border-trust-700 rounded-2xl text-sm text-left hover:border-trust-500 transition-colors disabled:opacity-50">
                  <CheckCircle2 size={15} className="text-trust-500 flex-shrink-0" />
                  <span className="flex-1 text-hb-700 dark:text-white truncate">{l.title}</span>
                  {processing && <Loader2 size={14} className="animate-spin text-hb-400 flex-shrink-0" />}
                </button>
              ))}
              <button onClick={() => setShowChoose(false)}
                className="w-full py-2 text-xs text-hb-400 hover:text-hb-600 transition-colors">
                ← Annuler
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if ((booking.listings?.length ?? 0) > 1) setShowChoose(true)
                  else onOutcome(booking.id, 'success', booking.listings?.[0]?.id)
                }}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-trust-500 hover:bg-trust-600 text-white font-semibold rounded-2xl text-sm transition-colors disabled:opacity-50">
                {processing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                J&apos;ai trouvé ! ✓
              </button>
              <button
                onClick={() => onOutcome(booking.id, 'failure')}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-hb-300 dark:border-hb-600 text-hb-600 dark:text-hb-400 font-semibold rounded-2xl text-sm hover:bg-hb-100 dark:hover:bg-hb-700 transition-colors disabled:opacity-50">
                {processing ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Pas concluant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
