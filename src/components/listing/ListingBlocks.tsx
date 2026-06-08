'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, ChevronLeft, TrendingUp, Sparkles, Tag, Compass } from 'lucide-react'
import { ListingCard, ListingCardSkeleton } from './ListingCard'
import { useListings } from '@/hooks/useListings'
import { useAuthStore } from '@/stores/auth'
import { useFiltersStore } from '@/stores/filters'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Listing, RecommendationBlock } from '@/types'

const BLOCKS: { key: RecommendationBlock; label: string; icon: React.ElementType }[] = [
  { key: 'popular',   label: 'Populaires près de chez vous',    icon: TrendingUp },
  { key: 'for_you',   label: 'Sélection IA pour vous',          icon: Sparkles },
  { key: 'good_deal', label: 'Bonnes affaires dans votre budget', icon: Tag },
  { key: 'discover',  label: 'À découvrir',                     icon: Compass },
]

const LISTING_CARD_SELECT = `
  id, slug, title, description, type, transaction, price, price_negotiable,
  neighborhood_id, address_hint, lat, lng, bedrooms, bathrooms, surface_m2,
  furnished, ai_generated, view_count, favorite_count, published_at, created_at,
  neighborhood:neighborhoods!inner(id, name, slug, city_id, city:cities!inner(id, name, slug)),
  media:listing_media(id, url, type, is_cover, display_order)
`

// Quartiers voisins (à compléter selon ta base)
const NEIGHBORS: Record<string, string[]> = {
  'simbock':      ['biyem-assi', 'melen', 'etoudi'],
  'biyem-assi':   ['simbock', 'jouvence', 'melen'],
  'jouvence':     ['biyem-assi', 'bastos', 'nlongkak'],
  'bastos':       ['jouvence', 'nlongkak', 'etoudi'],
  'tkc':          ['mvan', 'nsam', 'mvog-ada'],
  'mvan':         ['tkc', 'nsam', 'nkol-eton'],
  'nlongkak':     ['bastos', 'jouvence', 'etoudi'],
  'etoudi':       ['bastos', 'nlongkak', 'simbock'],
  'mvog-ada':     ['tkc', 'mvan', 'nsam'],
  'nsam':         ['tkc', 'mvan', 'mvog-ada'],
  'awae':         ['nsam', 'mvan', 'nkol-eton'],
  'nkol-eton':    ['mvan', 'mvog-ada', 'awae'],
}

interface ListingBlocksProps {
  popularListings: Listing[]
  goodDeals: Listing[]
}

export function ListingBlocks({ popularListings, goodDeals }: ListingBlocksProps) {
  const { user, profile } = useAuthStore()
  const { blocks, blocksLoading, setBlock, loadBlock, loadFavorites } = useListings()
  const supabase = createClient()
  const { activeType, activeTransaction } = useFiltersStore()

  const [filteredBlocks, setFilteredBlocks] = useState<Record<string, Listing[]>>({})
  const [filteredLoading, setFilteredLoading] = useState<Record<string, boolean>>({})

  // Extraire les critères utilisateur
  const criteria = (profile as any)?.criteria ?? {}
  const userNeighborhood: string = criteria?.neighborhood_names?.[0]?.toLowerCase().replace(/\s+/g, '-') ?? ''
  const userTransaction: string = criteria?.transaction ?? ''
  const userTypes: string[] = criteria?.types ?? []
  const userBudgetMax: number = criteria?.budget_max ?? 0

  // Sous-titre dynamique selon le quartier utilisateur
  function getSubtitle(key: string): string {
    if (key === 'popular' && userNeighborhood) return `${criteria?.neighborhood_names?.[0]} & alentours`
    if (key === 'for_you') return 'Basée sur vos critères IA'
    if (key === 'good_deal' && userBudgetMax) return `Budget ≤ ${userBudgetMax.toLocaleString()} FCFA`
    if (key === 'discover') return 'Nouveaux biens à travers le Cameroun'
    return 'Yaoundé'
  }

  useEffect(() => {
    loadBlock('discover')
    if (user) { loadBlock('for_you'); loadFavorites(user.id) }
  }, [user])

  // Charger blocs populaires et bonnes affaires personnalisés
  useEffect(() => {
    loadPersonalizedBlocks()
  }, [user, profile, activeType, activeTransaction])

  async function loadPersonalizedBlocks() {
    const neighborSlugs = userNeighborhood ? (NEIGHBORS[userNeighborhood] ?? []) : []
    const hasUserData = userNeighborhood || userTransaction

    // --- POPULAIRES : 50% quartier utilisateur + 50% voisins ---
    let popularQ = supabase.from('listings').select(LISTING_CARD_SELECT)
      .eq('status', 'published').order('view_count', { ascending: false })

    if (activeType) popularQ = popularQ.eq('type', activeType)
    if (activeTransaction) popularQ = popularQ.eq('transaction', activeTransaction)
    else if (userTransaction && !activeTransaction) popularQ = popularQ.eq('transaction', userTransaction)

    const { data: allPop } = await popularQ.limit(20)
    let finalPopular: Listing[] = []

    if (hasUserData && userNeighborhood && allPop) {
      const inNeighborhood = (allPop as any[]).filter((l: any) =>
        l.neighborhood?.slug === userNeighborhood
      )
      const inNeighbors = (allPop as any[]).filter((l: any) =>
        neighborSlugs.includes(l.neighborhood?.slug ?? '')
      )
      const others = (allPop as any[]).filter((l: any) =>
        l.neighborhood?.slug !== userNeighborhood &&
        !neighborSlugs.includes(l.neighborhood?.slug ?? '')
      )
      // 50% quartier, 50% voisins
      const half = 4
      finalPopular = [
        ...inNeighborhood.slice(0, half),
        ...inNeighbors.slice(0, half),
        ...others.slice(0, 2),
      ] as unknown as Listing[]
    } else {
      finalPopular = (allPop ?? popularListings) as unknown as Listing[]
    }

    setBlock('popular', finalPopular.slice(0, 8))

    // --- BONNES AFFAIRES : budget utilisateur ---
    let dealsQ = supabase.from('listings').select(LISTING_CARD_SELECT)
      .eq('status', 'published').order('price', { ascending: true })

    if (activeType) dealsQ = dealsQ.eq('type', activeType)
    if (activeTransaction) dealsQ = dealsQ.eq('transaction', activeTransaction)
    else if (userTransaction) dealsQ = dealsQ.eq('transaction', userTransaction)
    if (userBudgetMax) dealsQ = dealsQ.lte('price', userBudgetMax)
    if (userTypes.length > 0 && !activeType) dealsQ = dealsQ.in('type', userTypes)

    const { data: deals } = await dealsQ.limit(8)
    setBlock('good_deal', (deals ?? goodDeals) as unknown as Listing[])
  }

  // Filtres actifs — recharger
  useEffect(() => {
    const hasFilter = activeType || activeTransaction
    if (!hasFilter) { setFilteredBlocks({}); return }
    reloadWithFilters()
  }, [activeType, activeTransaction])

  async function reloadWithFilters() {
    const keys: RecommendationBlock[] = ['popular', 'good_deal', 'discover']
    const loading: Record<string, boolean> = {}
    keys.forEach(k => { loading[k] = true })
    setFilteredLoading(loading)
    const results: Record<string, Listing[]> = {}
    await Promise.all(keys.map(async (block) => {
      let q = supabase.from('listings').select(LISTING_CARD_SELECT).eq('status', 'published')
      if (activeType) q = q.eq('type', activeType)
      if (activeTransaction) q = q.eq('transaction', activeTransaction)
      if (block === 'popular') q = q.order('view_count', { ascending: false })
      else if (block === 'good_deal') q = q.order('price', { ascending: true })
      else q = q.order('published_at', { ascending: false })
      const { data } = await q.limit(8)
      results[block] = (data ?? []) as unknown as Listing[]
    }))
    setFilteredBlocks(results)
    setFilteredLoading({})
  }

  const hasFilter = activeType || activeTransaction

  const TYPE_LABELS: Record<string, string> = {
    apartment: 'Appartements', studio: 'Studios', room: 'Chambres',
    villa: 'Villas', duplex: 'Duplex', commercial: 'Commerces',
  }
  const TRANS_LABELS: Record<string, string> = {
    rent: 'Location', sale: 'Vente', coliving: 'Colocation',
    short_stay: 'Court séjour', furnished: 'Meublé',
  }
  const filterLabel = [
    activeType ? TYPE_LABELS[activeType] : '',
    activeTransaction ? TRANS_LABELS[activeTransaction] : '',
  ].filter(Boolean).join(' · ')

  return (
    <div className="max-w-[1760px] mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-14">
      {hasFilter && (
        <div className="flex items-center gap-2 -mb-6">
          <span className="text-sm text-hb-400">Filtres actifs :</span>
          <span className="px-3 py-1 bg-brand-500 text-white text-xs font-semibold rounded-full">{filterLabel}</span>
        </div>
      )}

      {BLOCKS.map(block => {
        if (block.key === 'for_you' && !user) return <ForYouGuest key="for_you" />

        const isForYou = block.key === 'for_you'
        const listings = isForYou
          ? blocks[block.key]
          : (hasFilter ? filteredBlocks[block.key] : blocks[block.key]) ?? []
        const loading = isForYou
          ? blocksLoading[block.key]
          : (hasFilter ? !!filteredLoading[block.key] : blocksLoading[block.key])

        if (!loading && listings.length === 0) return null

        return (
          <AirbnbBlock
            key={block.key}
            blockKey={block.key}
            label={block.label}
            subtitle={isForYou ? getSubtitle('for_you') : (hasFilter && filterLabel ? filterLabel : getSubtitle(block.key))}
            Icon={block.icon}
            listings={listings}
            loading={loading}
          />
        )
      })}

      <HabynexAdvantages />
    </div>
  )
}

function AirbnbBlock({ blockKey, label, subtitle, Icon, listings, loading }: {
  blockKey: RecommendationBlock; label: string; subtitle: string
  Icon: React.ElementType; listings: Listing[]; loading: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  function scroll(dir: 'l' | 'r') {
    scrollRef.current?.scrollBy({ left: dir === 'l' ? -280 : 280, behavior: 'smooth' })
  }

  return (
    <section>
      <div className="flex items-end justify-between mb-5">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-hb-600 dark:text-hb-300" />
          <h2 className="text-xl md:text-2xl font-semibold text-hb-700 dark:text-white">
            {label}
            <span className="text-hb-400 font-normal text-base"> · {subtitle}</span>
          </h2>
        </div>
      </div>

      <div className="relative group">
        <button onClick={() => scroll('l')}
          className="hidden md:flex absolute -left-5 top-[40%] -translate-y-1/2 z-10 w-9 h-9 bg-white dark:bg-hb-700 border border-hb-200 dark:border-hb-600 rounded-full shadow-airbnb items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronLeft size={18} />
        </button>

        <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-[240px] snap-start">
                  <ListingCardSkeleton />
                </div>
              ))
            : listings.slice(0, 8).map((listing, i) => (
                <div key={listing.id} className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-[240px] snap-start">
                  <ListingCard listing={listing} priority={i < 4} />
                </div>
              ))
          }

          {!loading && listings.length > 0 && (
            <div className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-[240px] snap-start">
              <Link href={`/rechercher?block=${blockKey}`} className="block group/ta">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-hb-100 mb-2">
                  <div className="grid grid-cols-2 gap-0.5 h-full">
                    {listings.slice(0, 4).map((l, i) => {
                      const cover = (Array.isArray(l.media) ? l.media : [])
                        .find((m: any) => m.is_cover)?.url ?? (Array.isArray(l.media) ? (l.media as any[])[0]?.url : null)
                      return (
                        <div key={i} className={`relative overflow-hidden ${i === 0 ? 'col-span-2' : ''}`}>
                          {cover
                            ? <Image src={cover} alt="" fill className="object-cover" sizes="100px" />
                            : <div className="absolute inset-0 bg-hb-200 flex items-center justify-center text-2xl">🏠</div>
                          }
                        </div>
                      )
                    })}
                  </div>
                  <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-2 group-hover/ta:bg-black/40 transition-colors">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <ChevronRight size={20} className="text-hb-700" />
                    </div>
                    <span className="text-white text-sm font-bold drop-shadow">Tout afficher</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-hb-500 dark:text-hb-400 text-center">Voir toutes les annonces →</p>
              </Link>
            </div>
          )}
        </div>

        <button onClick={() => scroll('r')}
          className="hidden md:flex absolute -right-5 top-[40%] -translate-y-1/2 z-10 w-9 h-9 bg-white dark:bg-hb-700 border border-hb-200 dark:border-hb-600 rounded-full shadow-airbnb items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  )
}

function ForYouGuest() {
  return (
    <section className="rounded-3xl border-2 border-dashed border-hb-200 dark:border-hb-600 p-10 text-center">
      <div className="text-5xl mb-4">✨</div>
      <h2 className="text-xl font-semibold text-hb-700 dark:text-white mb-2">Sélection personnalisée</h2>
      <p className="text-hb-400 text-sm mb-5">Connectez-vous pour voir les biens recommandés selon vos critères.</p>
      <Link href="/connexion" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 text-white font-semibold rounded-full hover:bg-brand-600 transition-colors text-sm">
        Se connecter
      </Link>
    </section>
  )
}

function HabynexAdvantages() {
  const scrollRef = useRef<HTMLDivElement>(null)
  function scroll(dir: 'l' | 'r') {
    scrollRef.current?.scrollBy({ left: dir === 'l' ? -280 : 280, behavior: 'smooth' })
  }

  const advantages = [
    { emoji: '🛡️', title: 'Annonces vérifiées', desc: 'Chaque bien est visité et validé par notre équipe avant publication.', tag: 'Zéro arnaque', color: 'from-trust-50 to-trust-100 dark:from-trust-950/40 dark:to-trust-900/20', tagColor: 'bg-trust-100 text-trust-700 dark:bg-trust-900/40 dark:text-trust-400', border: 'border-trust-100 dark:border-trust-900/40' },
    { emoji: '🤖', title: 'IA intégrée', desc: 'Notre assistant IA répond à vos questions 24h/24 et planifie vos visites.', tag: '24h/24', color: 'from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/20', tagColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-900/40' },
    { emoji: '👷', title: 'Agents certifiés', desc: 'Des agents terrain Habynex vous accompagnent lors des visites dans votre quartier.', tag: 'Terrain', color: 'from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/20', tagColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-900/40' },
    { emoji: '💳', title: 'Paiement sécurisé', desc: "MTN Money et Orange Money intégrés. Remboursé en cas d'arnaque prouvée.", tag: 'Remboursé', color: 'from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/20', tagColor: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400', border: 'border-green-100 dark:border-green-900/40' },
    { emoji: '📍', title: 'Lancement Yaoundé', desc: 'Simbock, Jouvence, Biyem-Assi, TKC, Awae — et bientôt tout le Cameroun.', tag: 'Cameroun', color: 'from-brand-50 to-brand-100 dark:from-brand-950/40 dark:to-brand-900/20', tagColor: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400', border: 'border-brand-100 dark:border-brand-900/40' },
    { emoji: '🎁', title: 'Programme parrainage', desc: '5 amis inscrits = 1 visite terrain gratuite offerte. Partagez votre code !', tag: 'Gratuit', color: 'from-pink-50 to-pink-100 dark:from-pink-950/40 dark:to-pink-900/20', tagColor: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400', border: 'border-pink-100 dark:border-pink-900/40' },
  ]

  return (
    <div className="pt-8 border-t border-hb-100 dark:border-hb-700">
      <div className="flex items-end justify-between mb-5">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-brand-500" />
          <h2 className="text-xl md:text-2xl font-semibold text-hb-700 dark:text-white">Pourquoi choisir Habynex ?</h2>
        </div>
      </div>

      <div className="relative group mb-12">
        <button onClick={() => scroll('l')} className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white dark:bg-hb-700 border border-hb-200 dark:border-hb-600 rounded-full shadow-airbnb items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronLeft size={18} />
        </button>
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2">
          {advantages.map((adv) => (
            <div key={adv.title} className={cn('flex-shrink-0 w-[220px] md:w-[260px] snap-start rounded-2xl border p-5 bg-gradient-to-br transition-transform hover:-translate-y-0.5 hover:shadow-airbnb cursor-default', adv.color, adv.border)}>
              <div className="text-4xl mb-4">{adv.emoji}</div>
              <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full', adv.tagColor)}>{adv.tag}</span>
              <h3 className="font-semibold text-sm text-hb-700 dark:text-white mt-3 mb-1.5">{adv.title}</h3>
              <p className="text-xs text-hb-400 dark:text-hb-300 leading-relaxed">{adv.desc}</p>
            </div>
          ))}
        </div>
        <button onClick={() => scroll('r')} className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white dark:bg-hb-700 border border-hb-200 dark:border-hb-600 rounded-full shadow-airbnb items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Avertissement paiement — bien visible */}
      <div className="mb-8 p-5 bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-2xl flex gap-4 items-start">
        <span className="text-2xl flex-shrink-0">⚠️</span>
        <div>
          <p className="font-bold text-red-700 dark:text-red-400 text-sm mb-1">Important — Sécurité des paiements</p>
          <p className="text-sm text-red-600 dark:text-red-300 leading-relaxed">
            <strong>Ne remettez jamais d'argent directement à un agent Habynex.</strong> Tous les paiements s'effectuent uniquement via la plateforme (MTN Money ou Orange Money). Si vous souhaitez motiver un agent pour sa qualité de service, vous pouvez lui donner un pourboire volontaire, mais ce n'est en aucun cas obligatoire. Habynex ne sera pas responsable des paiements effectués en dehors de la plateforme.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="p-8 bg-hb-700 dark:bg-hb-600 rounded-3xl text-white">
          <h3 className="text-xl font-bold mb-2">Vous cherchez un logement ?</h3>
          <p className="text-hb-200 text-sm mb-5">Des milliers d&apos;annonces vérifiées à Yaoundé. Trouvez en quelques minutes.</p>
          <Link href="/rechercher" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-hb-700 font-semibold rounded-full text-sm hover:bg-hb-50 transition-colors">
            <Sparkles size={14} className="text-brand-500" /> Commencer la recherche
          </Link>
        </div>
        <div className="p-8 border-2 border-hb-200 dark:border-hb-600 rounded-3xl">
          <h3 className="text-xl font-bold text-hb-700 dark:text-white mb-2">Vous êtes propriétaire ?</h3>
          <p className="text-hb-400 text-sm mb-5">Confiez votre bien à Habynex. Nous gérons photos, annonce, visites et locataire.</p>
          <a href="https://wa.me/237654888084?text=Bonjour%20Habynex%2C%20je%20souhaite%20confier%20mon%20bien." target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-hb-700 dark:border-hb-300 text-hb-700 dark:text-hb-300 font-semibold rounded-full text-sm hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors">
            📱 Nous contacter sur WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
