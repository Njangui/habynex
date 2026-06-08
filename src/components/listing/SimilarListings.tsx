'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Sparkles, Shuffle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatPrice, listingTypeLabel } from '@/lib/utils'
import type { Listing } from '@/types'

// Requête minimale — seulement ce dont ListingCard a besoin
const SELECT = `
  id, slug, title, description, type, transaction, price, price_negotiable,
  neighborhood_id, furnished, ai_generated, view_count, favorite_count,
  bedrooms, bathrooms, surface_m2, published_at, created_at,
  neighborhood:neighborhoods(id, name, slug, city_id, city:cities(id, name, slug)),
  media:listing_media(id, url, type, is_cover, display_order)
`.trim()

interface Props { listing: Listing }

type RawListing = {
  id: string; slug: string; title: string; description: string | null
  type: string; transaction: string; price: number; price_negotiable: boolean
  neighborhood_id: string | null; furnished: boolean; ai_generated: boolean
  view_count: number; favorite_count: number; bedrooms: number | null
  bathrooms: number | null; surface_m2: number | null
  published_at: string | null; created_at: string
  neighborhood: { id: string; name: string; slug: string; city_id: string; city: { id: string; name: string; slug: string }[] }[] | null
  media: { id: string; url: string; type: string; is_cover: boolean; display_order: number }[]
}

// Mini carte annonce sans WatermarkedImage — image next/image directe
function MiniCard({ item }: { item: { listing: RawListing; kind: 'similar' | 'random' } }) {
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
  const supabase = createClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<{ listing: RawListing; kind: 'similar' | 'random' }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [listing.id])

  async function load() {
    setLoading(true)
    const pMin = Math.round(listing.price * 0.65)
    const pMax = Math.round(listing.price * 1.35)

    // 60% similaires
    let { data: sim } = await supabase
      .from('listings').select(SELECT)
      .eq('status', 'published').eq('type', listing.type)
      .eq('transaction', listing.transaction)
      .neq('id', listing.id)
      .gte('price', pMin).lte('price', pMax)
      .order('view_count', { ascending: false }).limit(6)

    if (!sim || sim.length < 3) {
      const { data: ext } = await supabase
        .from('listings').select(SELECT)
        .eq('status', 'published').eq('type', listing.type)
        .neq('id', listing.id)
        .order('view_count', { ascending: false }).limit(6)
      sim = ext ?? []
    }

    // 40% aléatoires
    const { data: pool } = await supabase
      .from('listings').select(SELECT)
      .eq('status', 'published').neq('id', listing.id)
      .neq('type', listing.type)
      .order('published_at', { ascending: false }).limit(20)

    const simIds = new Set(((sim ?? []) as any[]).map((l) => l.id))
    const rnd = shuffle(((pool ?? []) as any[]).filter((l) => !simIds.has(l.id))).slice(0, 4)

    // Intercaler 3 similaires + 2 aléatoires
    const mixed: { listing: RawListing; kind: 'similar' | 'random' }[] = []
    const s = ((sim ?? []) as any[]) as RawListing[]
    const r = (rnd as any[]) as RawListing[]
    let si = 0, ri = 0, pi = 0
    const pattern = ['S','S','S','R','R'] as const
    while (si < s.length || ri < r.length) {
      const slot = pattern[pi++ % pattern.length]
      if (slot === 'S' && si < s.length) mixed.push({ listing: s[si++] as RawListing, kind: 'similar' })
      else if (slot === 'R' && ri < r.length) mixed.push({ listing: r[ri++] as RawListing, kind: 'random' })
      else if (si < s.length) mixed.push({ listing: s[si++] as RawListing, kind: 'similar' })
      else if (ri < r.length) mixed.push({ listing: r[ri++] as RawListing, kind: 'random' })
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
            : items.map((item, i) => (
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
