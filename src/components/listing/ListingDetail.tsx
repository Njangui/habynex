'use client'
import { useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft, Share2, Heart, BedDouble, Bath, Maximize2, Wifi, ParkingCircle,
  ShieldCheck, Droplets, Zap, BatteryCharging, ChevronLeft, ChevronRight, X,
  Star, MapPin, MessageSquare, Calendar, ChevronDown, Award, Send, Grid3X3, User
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatPrice, listingTypeLabel, transactionLabel, cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useListings } from '@/hooks/useListings'
import { ChatBox } from '@/components/messaging/ChatBox'
import { BookingModal } from '@/components/booking/BookingModal'
import { MapView } from '@/components/map/MapView'
import { SimilarListings } from '@/components/listing/SimilarListings'
import {
  LiveViewersBadge, ScarcityBadge, SocialProofBar,
  RecentBookingToast, PriceAnchorBadge, CountdownOffer,
  TrustBadges, FavoriteNudge, LossBiasPrompt
} from '@/components/ui/PersuasionLayer'
import type { Listing } from '@/types'

interface ListingDetailProps {
  listing: Listing & { virtual_tour?: { is_active: boolean; scenes: unknown } | null }
}

function VisitCalendar({ onDateSelect }: { onDateSelect: (d: string) => void }) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<string | null>(null)
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const adjustedFirst = (firstDay + 6) % 7
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  const dayNames = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

  function isPast(day: number) {
    const d = new Date(year, month, day); d.setHours(0,0,0,0)
    const t = new Date(); t.setHours(0,0,0,0)
    return d < t
  }

  function selectDate(day: number) {
    if (isPast(day)) return
    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    setSelected(iso); onDateSelect(iso)
  }

  return (
    <div className="border border-hb-200 dark:border-hb-600 rounded-2xl p-4 bg-white dark:bg-hb-800">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hb-50 dark:hover:bg-hb-700">
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-sm text-hb-700 dark:text-white">{monthNames[month]} {year}</span>
        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hb-50 dark:hover:bg-hb-700">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map(d => <div key={d} className="text-center text-[11px] font-medium text-hb-400 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: adjustedFirst }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const past = isPast(day); const isSel = selected === iso
          return (
            <button key={day} onClick={() => selectDate(day)} disabled={past}
              className={cn('aspect-square flex items-center justify-center rounded-full text-sm transition-all',
                past ? 'text-hb-200 dark:text-hb-600 cursor-not-allowed' :
                isSel ? 'bg-hb-700 text-white font-semibold' :
                'hover:bg-hb-100 dark:hover:bg-hb-700 text-hb-700 dark:text-hb-200 cursor-pointer')}>
              {day}
            </button>
          )
        })}
      </div>
      {selected && (
        <div className="mt-3 p-2.5 bg-brand-50 dark:bg-brand-950/20 rounded-xl text-center">
          <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">
            ✓ Visite le {new Date(selected + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
          </p>
        </div>
      )}
    </div>
  )
}

function CommentsSection({ listingId }: { listingId: string }) {
  const { user } = useAuthStore()
  const [comments, setComments] = useState<{ id: string; author: string; text: string; date: string }[]>([])
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    setTimeout(() => {
      setComments(prev => [{
        id: Date.now().toString(),
        author: user?.email?.split('@')[0] ?? 'Visiteur',
        text: text.trim(),
        date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      }, ...prev])
      setText(''); setSubmitting(false)
    }, 400)
  }

  return (
    <div className="pb-5 border-b border-hb-100 dark:border-hb-700">
      <h2 className="text-lg font-semibold text-hb-700 dark:text-white mb-4 flex items-center gap-2">
        <Star size={18} className="text-brand-500 fill-brand-500" />
        Avis & Commentaires {comments.length > 0 && <span className="text-hb-400 font-normal text-sm">({comments.length})</span>}
      </h2>
      {user ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-brand-600 dark:text-brand-400" />
            </div>
            <div className="flex-1 border border-hb-200 dark:border-hb-600 rounded-2xl overflow-hidden focus-within:border-hb-400 transition-colors">
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Partagez votre avis…" rows={3}
                className="w-full px-4 pt-3 pb-2 text-sm text-hb-600 dark:text-hb-200 bg-transparent outline-none resize-none placeholder:text-hb-300" />
              <div className="px-3 pb-2 flex justify-end">
                <button type="submit" disabled={!text.trim() || submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-hb-700 dark:bg-white text-white dark:text-hb-700 font-semibold text-xs rounded-full disabled:opacity-40 hover:opacity-80">
                  <Send size={12} /> Publier
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-hb-50 dark:bg-hb-700 rounded-2xl text-center">
          <p className="text-sm text-hb-400 mb-3">Connectez-vous pour laisser un avis</p>
          <Link href="/connexion" className="px-5 py-2 bg-hb-700 dark:bg-white text-white dark:text-hb-700 font-semibold text-sm rounded-full hover:opacity-80">Se connecter</Link>
        </div>
      )}
      {comments.length === 0 ? (
        <p className="text-sm text-hb-300 text-center py-4">Aucun commentaire. Soyez le premier !</p>
      ) : (
        <div className="space-y-4">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-9 h-9 bg-hb-100 dark:bg-hb-700 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={15} className="text-hb-400" />
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold text-hb-700 dark:text-white capitalize">{c.author}</span>
                  <span className="text-xs text-hb-300">{c.date}</span>
                </div>
                <p className="text-sm text-hb-500 dark:text-hb-300 leading-relaxed">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const short = text.slice(0, 280), hasMore = text.length > 280
  return (
    <div>
      <p className="text-sm text-hb-500 dark:text-hb-300 leading-relaxed whitespace-pre-line">
        {expanded ? text : (hasMore ? short + '…' : text)}
      </p>
      {hasMore && (
        <button onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-sm font-semibold text-hb-700 dark:text-white underline hover:text-brand-500">
          {expanded ? 'Réduire' : 'Afficher plus'}
          <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>
      )}
    </div>
  )
}

function PricingCard({ listing, onChat, onBook, isFav, onFav, visitDate, onVisitDateSelect }: {
  listing: Listing; onChat: () => void; onBook: () => void
  isFav: boolean; onFav: () => void; visitDate: string | null; onVisitDateSelect: (d: string) => void
}) {
  const marketAvg = Math.round(listing.price * 1.18)
  return (
    <div className="border border-hb-200 dark:border-hb-600 rounded-3xl shadow-airbnb p-6 bg-white dark:bg-hb-800 space-y-4">
      {/* Prix + ancrage */}
      <div>
        <p className="text-2xl font-semibold text-hb-700 dark:text-white">
          {formatPrice(listing.price)}
          {listing.transaction === 'rent' && <span className="text-base font-normal text-hb-400 ml-1">/ mois</span>}
        </p>
        {listing.price_negotiable && <p className="text-xs text-trust-500 mt-0.5">✓ Prix négociable</p>}
        <PriceAnchorBadge price={listing.price} marketAvg={marketAvg} className="mt-2" />
      </div>

      {/* Preuve sociale */}
      <SocialProofBar favoriteCount={listing.favorite_count} viewCount={listing.view_count} />

      {/* Calendrier */}
      <div>
        <p className="text-sm font-semibold text-hb-700 dark:text-white mb-2 flex items-center gap-1.5">
          <Calendar size={14} className="text-brand-500" /> Date de visite
        </p>
        <VisitCalendar onDateSelect={onVisitDateSelect} />
      </div>

      {/* Biais de perte */}
      <LossBiasPrompt pricePerDay={Math.round((marketAvg - listing.price) / 30)} />

      {/* CTAs */}
      <div className="space-y-3">
        <button onClick={onBook}
          className="w-full py-3.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
          <Calendar size={17} />
          {visitDate ? 'Confirmer la visite' : 'Réserver une visite'}
        </button>
        <button onClick={onChat}
          className="w-full py-3.5 border-2 border-hb-700 dark:border-hb-300 text-hb-700 dark:text-hb-300 font-semibold rounded-2xl hover:bg-hb-50 dark:hover:bg-hb-700 flex items-center justify-center gap-2">
          <MessageSquare size={17} /> Contacter / Questions
        </button>
        <div className="flex gap-2">
          <button onClick={onFav}
            className={cn('flex-1 py-3 rounded-2xl border-2 font-medium text-sm flex items-center justify-center gap-2',
              isFav ? 'border-brand-500 bg-brand-50 dark:bg-brand-950 text-brand-600' : 'border-hb-200 dark:border-hb-600 text-hb-600 dark:text-hb-400 hover:border-hb-300')}>
            <Heart size={15} fill={isFav ? '#f95d1e' : 'none'} className={isFav ? 'text-brand-500' : ''} />
            {isFav ? 'Sauvegardé' : 'Sauvegarder'}
          </button>
          <button onClick={async () => { const u = `https://habynex.com/bien/${listing.slug}`; if (navigator.share) await navigator.share({ title: listing.title, url: u }); else await navigator.clipboard.writeText(u) }}
            className="flex-1 py-3 rounded-2xl border-2 border-hb-200 dark:border-hb-600 text-hb-600 dark:text-hb-400 font-medium text-sm flex items-center justify-center gap-2">
            <Share2 size={15} /> Partager
          </button>
        </div>
      </div>

      {/* Badges de confiance */}
      <TrustBadges />

      {/* Garantie */}
      <div className="p-3.5 bg-trust-50 dark:bg-trust-950/20 rounded-2xl">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={15} className="text-trust-500" />
          <p className="text-xs font-semibold text-trust-700 dark:text-trust-400">Annonce vérifiée Habynex</p>
        </div>
        <p className="text-xs text-trust-600 dark:text-trust-500">Remboursé intégralement en cas d&apos;arnaque prouvée.</p>
      </div>
      <p className="text-center text-xs text-hb-300">Vous ne serez pas encore débité</p>
    </div>
  )
}

export function ListingDetail({ listing }: ListingDetailProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { toggleFavorite, favoriteIds } = useListings()
  const isFav = favoriteIds.has(listing.id)
  const [imgIdx, setImgIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [lightboxAll, setLightboxAll] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [visitDate, setVisitDate] = useState<string | null>(null)

  const images = listing.media?.sort((a, b) => (b.is_cover ? 1 : 0) - (a.is_cover ? 1 : 0)).filter(m => m.type === 'image') ?? []
  const neighborhood = Array.isArray(listing.neighborhood) ? listing.neighborhood[0] : listing.neighborhood
  const city = Array.isArray(neighborhood?.city) ? neighborhood?.city[0] : neighborhood?.city
  const amenityList = [
    { key: 'wifi', label: 'Wi-Fi', icon: Wifi }, { key: 'parking', label: 'Parking', icon: ParkingCircle },
    { key: 'security', label: 'Sécurité', icon: ShieldCheck }, { key: 'water_24h', label: 'Eau 24h/24', icon: Droplets },
    { key: 'electricity', label: 'Électricité', icon: Zap }, { key: 'generator', label: 'Groupe élec.', icon: BatteryCharging },
  ].filter(a => listing.amenities?.[a.key as keyof typeof listing.amenities])

  const handleFav = useCallback(async () => {
    if (!user) { router.push('/connexion'); return }
    await toggleFavorite(listing.id, user.id)
  }, [user, listing.id, toggleFavorite, router])

  return (
    <>
      {/* FOMO toast — visiteurs récents */}
      {neighborhood?.name && <RecentBookingToast neighborhood={neighborhood.name} />}

      <div className="relative">
        {/* Actions flottantes */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-airbnb hover:shadow-airbnb-hover">
            <ArrowLeft size={18} className="text-hb-700" />
          </button>
          <div className="flex gap-2">
            <button onClick={async () => { const u = `https://habynex.com/bien/${listing.slug}`; if (navigator.share) await navigator.share({ title: listing.title, url: u }); else await navigator.clipboard.writeText(u) }}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-airbnb">
              <Share2 size={16} className="text-hb-700" />
            </button>
            <button onClick={handleFav} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-airbnb">
              <Heart size={16} className={isFav ? 'text-brand-500' : 'text-hb-700'} fill={isFav ? '#f95d1e' : 'none'} />
            </button>
          </div>
        </div>

        {/* Mobile slider */}
        <div className="relative bg-black md:hidden">
          <div className="relative aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => setLightbox(true)}>
            {images.length > 0 ? <Image src={images[imgIdx].url} alt={listing.title} fill className="object-cover" priority sizes="100vw" quality={85} />
              : <div className="absolute inset-0 bg-hb-100 flex items-center justify-center text-6xl">🏠</div>}
            {images.length > 1 && <div className="absolute bottom-4 right-4 bg-white/90 rounded-lg px-3 py-1.5 text-xs font-semibold text-hb-700">{imgIdx + 1} / {images.length}</div>}
          </div>
          {images.length > 1 && <>
            <button onClick={() => setImgIdx(i => Math.max(0, i - 1))} disabled={imgIdx === 0} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-airbnb disabled:opacity-30"><ChevronLeft size={18} /></button>
            <button onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))} disabled={imgIdx === images.length - 1} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-airbnb disabled:opacity-30"><ChevronRight size={18} /></button>
          </>}
        </div>

        {/* Desktop Airbnb grid */}
        <div className="hidden md:block relative px-6 md:px-10 pt-14 max-w-[1120px] mx-auto">
          {images.length === 0 ? <div className="w-full h-[460px] bg-hb-100 rounded-3xl flex items-center justify-center text-7xl">🏠</div>
            : images.length === 1 ? <div className="relative w-full h-[460px] rounded-3xl overflow-hidden cursor-pointer" onClick={() => setLightbox(true)}><Image src={images[0].url} alt={listing.title} fill className="object-cover" priority sizes="100vw" quality={85} /></div>
            : <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[460px] rounded-3xl overflow-hidden">
                <div className="col-span-2 row-span-2 relative cursor-pointer" onClick={() => { setImgIdx(0); setLightbox(true) }}>
                  <Image src={images[0].url} alt={listing.title} fill className="object-cover hover:brightness-95 transition-all" priority sizes="50vw" quality={85} />
                </div>
                {[1,2,3,4].map(i => (
                  <div key={i} className="relative cursor-pointer" onClick={() => { setImgIdx(i); setLightbox(true) }}>
                    {images[i] ? <Image src={images[i].url} alt="" fill className="object-cover hover:brightness-95 transition-all" sizes="25vw" quality={80} />
                      : <div className="absolute inset-0 bg-hb-100" />}
                  </div>
                ))}
              </div>
          }
          {images.length > 1 && <button onClick={() => setLightboxAll(true)} className="absolute bottom-4 right-14 flex items-center gap-2 px-4 py-2 bg-white border border-hb-300 rounded-xl text-sm font-semibold text-hb-700 shadow hover:shadow-airbnb"><Grid3X3 size={14} /> Afficher toutes les photos</button>}
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-[1120px] mx-auto px-4 md:px-6 pb-32 md:pb-10">
        <div className="grid md:grid-cols-[1fr_380px] gap-10 pt-6">
          <div className="space-y-6">
            {/* Badges persuasion — en haut */}
            <div className="space-y-2">
              <LiveViewersBadge listingId={listing.id} />
              <ScarcityBadge total={1} />
              <FavoriteNudge count={listing.favorite_count} />
            </div>

            {/* Titre */}
            <div className="pb-5 border-b border-hb-100 dark:border-hb-700">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-3 py-1 bg-brand-50 text-brand-600 text-xs font-semibold rounded-full">{transactionLabel(listing.transaction)}</span>
                <span className="px-3 py-1 bg-hb-100 dark:bg-hb-700 text-hb-600 dark:text-hb-300 text-xs rounded-full">{listingTypeLabel(listing.type)}</span>
                {listing.furnished && <span className="px-3 py-1 bg-trust-50 text-trust-600 text-xs font-semibold rounded-full">🛋️ Meublé</span>}
                {listing.ai_generated && <span className="px-3 py-1 bg-purple-50 text-purple-600 text-xs font-semibold rounded-full">✨ Générée par IA</span>}
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold text-hb-700 dark:text-white mb-2 leading-tight">{listing.title}</h1>
              <div className="flex items-center gap-1.5 text-sm text-hb-500">
                <MapPin size={14} />
                <span>{neighborhood?.name ?? 'Yaoundé'}{city ? `, ${city.name}` : ''}, Cameroun</span>
              </div>
              {listing.favorite_count > 5 && (
                <div className="flex items-center gap-1 mt-3">
                  <Star size={13} className="text-brand-500 fill-brand-500" />
                  <span className="text-sm font-semibold text-hb-700 dark:text-white">{(listing.favorite_count / 10).toFixed(1)}</span>
                  <span className="text-sm text-hb-400">({listing.favorite_count} favoris)</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="pb-5 border-b border-hb-100 dark:border-hb-700">
              <h2 className="text-lg font-semibold text-hb-700 dark:text-white mb-4">{listingTypeLabel(listing.type)} · {neighborhood?.name}</h2>
              <div className="grid grid-cols-3 gap-4">
                {listing.bedrooms != null && <div className="text-center p-4 bg-hb-50 dark:bg-hb-700 rounded-2xl"><BedDouble size={22} className="text-brand-500 mx-auto mb-1.5" /><p className="text-xl font-bold text-hb-700 dark:text-white">{listing.bedrooms}</p><p className="text-xs text-hb-400 mt-0.5">Chambre{listing.bedrooms > 1 ? 's' : ''}</p></div>}
                {listing.bathrooms != null && <div className="text-center p-4 bg-hb-50 dark:bg-hb-700 rounded-2xl"><Bath size={22} className="text-brand-500 mx-auto mb-1.5" /><p className="text-xl font-bold text-hb-700 dark:text-white">{listing.bathrooms}</p><p className="text-xs text-hb-400 mt-0.5">Sdb</p></div>}
                {listing.surface_m2 != null && <div className="text-center p-4 bg-hb-50 dark:bg-hb-700 rounded-2xl"><Maximize2 size={22} className="text-brand-500 mx-auto mb-1.5" /><p className="text-xl font-bold text-hb-700 dark:text-white">{listing.surface_m2}</p><p className="text-xs text-hb-400 mt-0.5">m²</p></div>}
              </div>
            </div>

            {listing.description && <div className="pb-5 border-b border-hb-100 dark:border-hb-700"><h2 className="text-lg font-semibold text-hb-700 dark:text-white mb-3">Description</h2><ExpandableText text={listing.description} /></div>}

            {amenityList.length > 0 && <div className="pb-5 border-b border-hb-100 dark:border-hb-700"><h2 className="text-lg font-semibold text-hb-700 dark:text-white mb-4">Ce que propose ce logement</h2><div className="grid grid-cols-2 gap-3">{amenityList.map(a => <div key={a.key} className="flex items-center gap-3 text-sm text-hb-600 dark:text-hb-300"><a.icon size={18} className="text-hb-500 flex-shrink-0" />{a.label}</div>)}</div></div>}

            {/* ── Infos complètes mobile (visibles uniquement sur mobile) ── */}
            <div className="md:hidden pb-5 border-b border-hb-100 dark:border-hb-700 space-y-4">
              {/* Prix + badges */}
              <div className="bg-hb-50 dark:bg-hb-700 rounded-2xl p-4">
                <div className="flex items-end justify-between gap-3 mb-3">
                  <div>
                    <p className="text-2xl font-bold text-hb-700 dark:text-white">
                      {formatPrice(listing.price)}
                      {listing.transaction === 'rent' && <span className="text-base font-normal text-hb-400"> / mois</span>}
                    </p>
                    {listing.price_negotiable && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-trust-50 dark:bg-trust-950/30 text-trust-600 dark:text-trust-400 text-xs font-semibold rounded-full">
                        💬 Prix négociable
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleFav}
                    className={cn(
                      'w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all flex-shrink-0',
                      isFav
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'border-hb-200 dark:border-hb-600 text-hb-400 hover:border-brand-400'
                    )}
                    aria-label="Favoris"
                  >
                    <Star size={16} className={isFav ? 'fill-white' : ''} />
                  </button>
                </div>

                {/* Infos supplémentaires */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {listing.floor != null && (
                    <div className="flex items-center gap-2 text-hb-600 dark:text-hb-300">
                      <span className="text-base">🏢</span>
                      <span>Étage {listing.floor}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-hb-600 dark:text-hb-300">
                    <span className="text-base">{listing.furnished ? '🛋️' : '🏠'}</span>
                    <span>{listing.furnished ? 'Meublé' : 'Non meublé'}</span>
                  </div>
                  {listing.surface_m2 != null && (
                    <div className="flex items-center gap-2 text-hb-600 dark:text-hb-300">
                      <Maximize2 size={14} className="text-hb-400" />
                      <span>{listing.surface_m2} m²</span>
                    </div>
                  )}
                  {listing.address_hint && (
                    <div className="flex items-center gap-2 text-hb-600 dark:text-hb-300 col-span-2">
                      <MapPin size={14} className="text-hb-400 flex-shrink-0" />
                      <span className="line-clamp-1">{listing.address_hint}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Boutons action */}
              <div className="flex gap-3">
                <button
                  onClick={() => setChatOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-hb-700 dark:border-hb-300 text-hb-700 dark:text-hb-300 font-semibold rounded-2xl text-sm"
                >
                  <MessageSquare size={16} /> Contacter
                </button>
                <button
                  onClick={() => setBookingOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-2xl text-sm"
                >
                  <Calendar size={16} /> Réserver
                </button>
              </div>
            </div>

            {/* Calendrier mobile */}
            <div className="md:hidden pb-5 border-b border-hb-100 dark:border-hb-700">
              <h2 className="text-lg font-semibold text-hb-700 dark:text-white mb-4 flex items-center gap-2"><Calendar size={18} className="text-brand-500" />Choisir une date de visite</h2>
              <VisitCalendar onDateSelect={setVisitDate} />
              {visitDate && <button onClick={() => setBookingOpen(true)} className="w-full mt-3 py-3.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold rounded-2xl flex items-center justify-center gap-2"><Calendar size={17} />Confirmer la visite</button>}
            </div>

            {listing.lat && listing.lng && <div><h2 className="text-lg font-semibold text-hb-700 dark:text-white mb-3">Où se situe ce logement</h2><MapView lat={listing.lat} lng={listing.lng} title={listing.title} neighborhoodName={neighborhood?.name} height="300px" />{listing.address_hint && <p className="text-sm text-hb-400 mt-2 flex items-center gap-1"><MapPin size={13} /> {listing.address_hint}</p>}</div>}

            <CommentsSection listingId={listing.id} />
          </div>

          {/* Sidebar */}
          <div className="hidden md:block">
            <div className="sticky top-[92px]">
              <PricingCard listing={listing} onChat={() => setChatOpen(true)} onBook={() => setBookingOpen(true)} isFav={isFav} onFav={handleFav} visitDate={visitDate} onVisitDateSelect={setVisitDate} />
            </div>
          </div>
        </div>
      </div>

      {/* Biens similaires */}
      <SimilarListings listing={listing} />

      {/* Barre mobile fixe — simplifiée car les boutons sont déjà dans le contenu */}
      <div className="fixed bottom-16 md:hidden left-0 right-0 z-40 bg-white/95 dark:bg-hb-800/95 backdrop-blur border-t border-hb-100 dark:border-hb-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-hb-700 dark:text-white">{formatPrice(listing.price)}{listing.transaction === 'rent' && <span className="text-sm font-normal text-hb-400"> / mois</span>}</p>
            {listing.price_negotiable && <p className="text-xs text-hb-400">Négociable</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setChatOpen(true)} className="flex items-center gap-2 px-4 py-2.5 border-2 border-hb-700 dark:border-hb-300 text-hb-700 dark:text-hb-300 font-semibold rounded-full text-sm"><MessageSquare size={15} />Contacter</button>
            <button onClick={() => setBookingOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-full text-sm"><Calendar size={15} />Réserver</button>
          </div>
        </div>
      </div>

      {chatOpen && <ChatBox listingId={listing.id} listingTitle={listing.title} listingContext={{ title: listing.title, price: listing.price, neighborhood: neighborhood?.name, type: listing.type }} onClose={() => setChatOpen(false)} />}
      {bookingOpen && <BookingModal listing={listing} onClose={() => setBookingOpen(false)} />}

      {lightbox && images.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white z-10"><X size={28} /></button>
          <div className="relative w-full max-w-5xl aspect-video px-4" onClick={e => e.stopPropagation()}>
            <Image src={images[imgIdx].url} alt="" fill className="object-contain" sizes="100vw" />
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='130'%3E%3Cg transform='rotate(-22 110 65)' opacity='0.15'%3E%3Ctext x='10' y='55' font-family='Arial' font-size='15' font-weight='bold' fill='white' letter-spacing='3'%3EHABYNEX%3C/text%3E%3C/g%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '220px 130px' }} />
          </div>
          {images.length > 1 && <>
            <button onClick={e => { e.stopPropagation(); setImgIdx(i => Math.max(0, i - 1)) }} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2"><ChevronLeft size={40} /></button>
            <button onClick={e => { e.stopPropagation(); setImgIdx(i => Math.min(images.length - 1, i + 1)) }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2"><ChevronRight size={40} /></button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">{imgIdx + 1} / {images.length}</div>
          </>}
        </div>
      )}

      {lightboxAll && images.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-white dark:bg-hb-800 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-hb-700 dark:text-white">Toutes les photos ({images.length})</h2>
              <button onClick={() => setLightboxAll(false)} className="w-10 h-10 rounded-full border border-hb-200 dark:border-hb-600 flex items-center justify-center hover:bg-hb-50"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {images.map((img, i) => (
                <div key={img.id} className={cn('relative rounded-2xl overflow-hidden cursor-pointer', i === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square')}
                  onClick={() => { setImgIdx(i); setLightboxAll(false); setLightbox(true) }}>
                  <Image src={img.url} alt="" fill className="object-cover hover:scale-105 transition-transform duration-300" sizes="600px" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}