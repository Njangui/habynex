'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Sparkles, Shuffle } from 'lucide-react'
import { cn, formatPrice, listingTypeLabel, BLUR_DATA_URL } from '@/lib/utils'
import { useRecommendations } from '@/hooks/useRecommendations'
import type { Listing } from '@/types'

interface Props { listing: Listing }

// Mini carte annonce sans WatermarkedImage — image next/image directe
function MiniCard({ item }: { item: { listing: Listing; kind: 'similar' | 'random' } }) {
  const { listing, kind } = item
  const cover = listing.media?.find(m => m.is_cover)?.url ?? listing.media?.[0]?.url
  const neighborhood = Array.isArray(listing.neighborhood) ? listing.neighborhood[0] : listing.neighborhood

  return (
    <Link href={`/bien/${listing.slug}`} className="block group">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-hb-100 mb-2">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, 240px"
            quality={70}
            loading="lazy"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl">🏠</div>
        )}

        {/* Watermark CSS */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='24'%3E%3Ctext x='3' y='17' font-family='Arial' font-size='9' font-weight='bold' fill='white' opacity='0.5' letter-spacing='1'%3EHABYNEX%3C/text%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom 6px right 6px',
          backgroundSize: '80px 20px',
        }} />

        {/* Badge */}
        <div className={cn(
          'absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow',
          kind === 'similar' ? 'bg-brand-500' : 'bg-hb-600'
        )}>
          {kind === 'similar' ? '✦ Similaire' : '✦ Découverte'}
        </div>

        {/* Favori */}
        {listing.ai_generated && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-semibold text-hb-600 flex items-center gap-1">
            ✨ IA
          </div>
        )}
      </div>

      {/* Infos */}
      <div>
        <p className="text-sm font-semibold text-hb-700 dark:text-white truncate">
          {listingTypeLabel(listing.type)} · {neighborhood?.name ?? 'Yaoundé'}
        </p>
        <p className="text-xs text-hb-400 truncate mt-0.5 line-clamp-1">{listing.description ?? ''}</p>
        <p className="text-sm font-bold text-hb-700 dark:text-white mt-1">
          {formatPrice(listing.price)}
          {listing.transaction === 'rent' && <span className="text-xs font-normal text-hb-400"> / mois</span>}
        </p>
      </div>
    </Link>
  )
}

export function SimilarListings({ listing }: Props) {
  const { loadRecommendations, preloadListings } = useRecommendations()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<{ listing: Listing; kind: 'similar' | 'random' }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [listing.id])

  async function load() {
    setLoading(true)

    // ── Similaires + personnalisées ────────────────────────────────
    // loadRecommendations combine la similarité avec le bien consulté
    // (type, transaction, quartier, prix, chambres...) ET les critères
    // du profil de l'utilisateur connecté s'il y en a. Le pool sous-jacent
    // est mis en cache (localStorage 30min + Zustand) donc les visites
    // suivantes ne refont pas de requête Supabase.
    const sim = await loadRecommendations(listing.id, 6)

    // ── 40% découvertes aléatoires ──────────────────────────────────
    // On réutilise le même pool en cache plutôt que de relancer une
    // requête dédiée : on exclut le bien actuel et les similaires déjà
    // choisis, puis on mélange.
    const pool = await preloadListings()
    const excludeIds = new Set([listing.id, ...sim.map(l => l.id)])
    const rnd = shuffle(pool.filter(l => !excludeIds.has(l.id))).slice(0, 4)

    // Intercaler 3 similaires + 2 aléatoires
    const mixed: { listing: Listing; kind: 'similar' | 'random' }[] = []
    let si = 0, ri = 0, pi = 0
    const pattern = ['S', 'S', 'S', 'R', 'R'] as const
    while (si < sim.length || ri < rnd.length) {
      const slot = pattern[pi++ % pattern.length]
      if (slot === 'S' && si < sim.length) mixed.push({ listing: sim[si++], kind: 'similar' })
      else if (slot === 'R' && ri < rnd.length) mixed.push({ listing: rnd[ri++], kind: 'random' })
      else if (si < sim.length) mixed.push({ listing: sim[si++], kind: 'similar' })
      else if (ri < rnd.length) mixed.push({ listing: rnd[ri++], kind: 'random' })
      else break
    }

    setItems(mixed)
    setLoading(false)
  }

  function scroll(dir: 'l' | 'r') {
    scrollRef.current?.scrollBy({ left: dir === 'l' ? -260 : 260, behavior: 'smooth' })
  }

  if (!loading && items.length === 0) return null

  return (
    <section className="max-w-[1120px] mx-auto px-4 md:px-6 py-10 border-t border-hb-100 dark:border-hb-700">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-hb-700 dark:text-white flex items-center gap-2">
            <Sparkles size={20} className="text-brand-500" />
            Vous pourriez aussi aimer
          </h2>
          <p className="text-sm text-hb-400 mt-0.5 flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-brand-500 rounded-full" />Biens similaires</span>
            <span className="text-hb-200">·</span>
            <span className="flex items-center gap-1"><Shuffle size={12} />Nouvelles opportunités</span>
          </p>
        </div>
      </div>

      <div className="relative group">
        <button onClick={() => scroll('l')}
          className="hidden md:flex absolute -left-5 top-[40%] -translate-y-1/2 z-10 w-9 h-9 bg-white dark:bg-hb-700 border border-hb-200 dark:border-hb-600 rounded-full shadow-airbnb items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronLeft size={18} />
        </button>

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-[240px] snap-start">
                  <div className="aspect-square rounded-2xl bg-hb-100 animate-pulse mb-2" />
                  <div className="h-3 bg-hb-100 rounded animate-pulse mb-1 w-3/4" />
                  <div className="h-3 bg-hb-100 rounded animate-pulse w-1/2" />
                </div>
              ))
            : items.map((item) => (
                <div key={item.listing.id} className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-[240px] snap-start">
                  <MiniCard item={item} />
                </div>
              ))
          }
        </div>

        <button onClick={() => scroll('r')}
          className="hidden md:flex absolute -right-5 top-[40%] -translate-y-1/2 z-10 w-9 h-9 bg-white dark:bg-hb-700 border border-hb-200 dark:border-hb-600 rounded-full shadow-airbnb items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
