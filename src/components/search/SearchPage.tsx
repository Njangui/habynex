'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X, Map, LayoutGrid, Loader2, ChevronDown } from 'lucide-react'
import { ListingCard, ListingCardSkeleton } from '@/components/listing/ListingCard'
import { MapView } from '@/components/map/MapView'
import { useListings } from '@/hooks/useListings'
import { cn, listingTypeLabel, transactionLabel } from '@/lib/utils'
import type { ListingFilters } from '@/types'

const TYPES = [
  { value: '', label: 'Tous', emoji: '🏘️' },
  { value: 'apartment', label: 'Appartements', emoji: '🏢' },
  { value: 'studio', label: 'Studios', emoji: '🛏️' },
  { value: 'room', label: 'Chambres', emoji: '🚪' },
  { value: 'villa', label: 'Villas', emoji: '🏡' },
  { value: 'duplex', label: 'Duplex', emoji: '🏠' },
  { value: 'commercial', label: 'Commerces', emoji: '🏪' },
]

const TRANSACTIONS = [
  { value: '', label: 'Tous' },
  { value: 'rent', label: 'Location' },
  { value: 'sale', label: 'Vente' },
  { value: 'coliving', label: 'Colocation' },
  { value: 'short_stay', label: 'Court séjour' },
  { value: 'furnished', label: 'Meublé' },
]

const SORT_OPTIONS = [
  { value: 'recent', label: 'Les plus récents' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'popular', label: 'Les plus populaires' },
]

interface Props {
  neighborhoods: { id: string; name: string; slug: string; city?: { name: string } | null }[]
  initialParams: Record<string, string | undefined>
}

export function SearchPage({ neighborhoods, initialParams }: Props) {
  const { searchResults, searchLoading, searchTotal, search } = useListings()
  const [query, setQuery] = useState(initialParams.q ?? '')
  const [filters, setFilters] = useState<ListingFilters>({
    type: initialParams.type as any,
    transaction: initialParams.transaction as any,
    neighborhood_id: initialParams.quartier,
  })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [sort, setSort] = useState('recent')
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  const [offset, setOffset] = useState(0)
  const observerRef = useRef<HTMLDivElement>(null)

  // Lancer recherche
  useEffect(() => {
    setOffset(0)
    search({ ...filters, query }, 0)
  }, [filters, query])

  // Infinite scroll
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !searchLoading && searchResults.length < searchTotal) {
        const next = offset + 20
        setOffset(next)
        search({ ...filters, query }, next)
      }
    }, { threshold: 0.5 })
    if (observerRef.current) obs.observe(observerRef.current)
    return () => obs.disconnect()
  }, [searchLoading, searchResults.length, searchTotal, offset, filters, query])

  const activeCount = Object.values(filters).filter(Boolean).length + (query ? 1 : 0)

  return (
    <div className="min-h-screen bg-white dark:bg-hb-800">
      {/* ── Barre de recherche sticky ── */}
      <div className="sticky top-[76px] z-30 bg-white dark:bg-hb-800 border-b border-hb-100 dark:border-hb-700 shadow-nav">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 md:px-10 py-3">
          {/* Ligne 1 : input + boutons */}
          <div className="flex items-center gap-3">
            {/* Champ recherche */}
            <div className="flex-1 flex items-center gap-2.5 border border-hb-200 dark:border-hb-600 rounded-full px-4 py-2.5 bg-white dark:bg-hb-700 hover:border-hb-400 transition-colors">
              <Search size={15} className="text-hb-400 flex-shrink-0" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Ville, quartier, type de bien…"
                className="flex-1 text-sm text-hb-700 dark:text-white placeholder:text-hb-300 outline-none bg-transparent" />
              {query && (
                <button onClick={() => setQuery('')} className="text-hb-300 hover:text-hb-500 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtres */}
            <button onClick={() => setFiltersOpen(!filtersOpen)}
              className={cn('flex items-center gap-2 px-4 py-2.5 border rounded-full text-sm font-medium transition-all relative whitespace-nowrap',
                filtersOpen || activeCount > 0
                  ? 'bg-hb-700 dark:bg-white text-white dark:text-hb-700 border-hb-700 dark:border-white'
                  : 'border-hb-200 dark:border-hb-600 text-hb-600 dark:text-hb-300 hover:border-hb-400 bg-white dark:bg-hb-700')}>
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">Filtres</span>
              {activeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>

            {/* Tri */}
            <div className="relative hidden md:block">
              <button onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-4 py-2.5 border border-hb-200 dark:border-hb-600 rounded-full text-sm font-medium text-hb-600 dark:text-hb-300 hover:border-hb-400 bg-white dark:bg-hb-700 transition-colors whitespace-nowrap">
                {SORT_OPTIONS.find(s => s.value === sort)?.label}
                <ChevronDown size={14} />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 top-12 z-20 w-52 bg-white dark:bg-hb-800 rounded-2xl shadow-airbnb-lg border border-hb-100 dark:border-hb-700 overflow-hidden animate-slide-down py-1">
                    {SORT_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => { setSort(opt.value); setSortOpen(false) }}
                        className={cn('w-full text-left px-4 py-2.5 text-sm transition-colors',
                          sort === opt.value ? 'font-semibold text-hb-700 dark:text-white bg-hb-50 dark:bg-hb-700' : 'text-hb-500 dark:text-hb-400 hover:bg-hb-50 dark:hover:bg-hb-700')}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Vue grille/carte */}
            <button onClick={() => setViewMode(v => v === 'grid' ? 'map' : 'grid')}
              className="hidden md:flex items-center gap-2 px-4 py-2.5 border border-hb-200 dark:border-hb-600 rounded-full text-sm font-medium text-hb-600 dark:text-hb-300 hover:border-hb-400 bg-white dark:bg-hb-700 transition-colors whitespace-nowrap">
              {viewMode === 'grid' ? <><Map size={15} /> Carte</> : <><LayoutGrid size={15} /> Grille</>}
            </button>
          </div>

          {/* Types de bien — style Airbnb avec icônes */}
          <div className="flex gap-0 overflow-x-auto no-scrollbar mt-3 border-b border-hb-100 dark:border-hb-700 -mx-4 sm:-mx-6 md:-mx-10 px-4 sm:px-6 md:px-10">
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setFilters(f => ({ ...f, type: t.value as any || undefined }))}
                className={cn('flex flex-col items-center gap-1 px-4 py-2.5 border-b-2 flex-shrink-0 transition-all',
                  (filters.type ?? '') === t.value
                    ? 'border-hb-700 dark:border-white text-hb-700 dark:text-white'
                    : 'border-transparent text-hb-400 dark:text-hb-500 hover:text-hb-600 dark:hover:text-hb-300 hover:border-hb-200')}>
                <span className="text-lg">{t.emoji}</span>
                <span className="text-[11px] font-medium whitespace-nowrap">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Modalités */}
          <div className="flex gap-2 mt-2.5 overflow-x-auto no-scrollbar pb-1">
            {TRANSACTIONS.map(t => (
              <button key={t.value} onClick={() => setFilters(f => ({ ...f, transaction: t.value as any || undefined }))}
                className={cn('flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all',
                  (filters.transaction ?? '') === t.value
                    ? 'bg-hb-700 dark:bg-white text-white dark:text-hb-700 border-hb-700 dark:border-white'
                    : 'border-hb-200 dark:border-hb-600 text-hb-500 dark:text-hb-400 hover:border-hb-400 bg-white dark:bg-hb-700')}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panel filtres avancés ── */}
      {filtersOpen && (
        <>
          <div className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 md:absolute md:top-auto md:bottom-auto md:left-4 md:right-auto md:w-[400px] z-30 bg-white dark:bg-hb-800 rounded-t-3xl md:rounded-3xl shadow-airbnb-xl border border-hb-100 dark:border-hb-700 p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-hb-700 dark:text-white">Filtres</h3>
              <button onClick={() => setFiltersOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hb-100 dark:hover:bg-hb-700 text-hb-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Budget */}
              <div>
                <p className="text-xs font-semibold text-hb-500 dark:text-hb-400 uppercase tracking-wider mb-2">Budget (FCFA/mois)</p>
                <div className="flex gap-3 items-center">
                  <input type="number" placeholder="Min" value={filters.min_price ?? ''}
                    onChange={e => setFilters(f => ({ ...f, min_price: e.target.value ? +e.target.value : undefined }))}
                    className="flex-1 px-3 py-2.5 border border-hb-200 dark:border-hb-600 rounded-xl text-sm text-hb-700 dark:text-white bg-white dark:bg-hb-700 outline-none focus:border-hb-500" />
                  <span className="text-hb-300">—</span>
                  <input type="number" placeholder="Max" value={filters.max_price ?? ''}
                    onChange={e => setFilters(f => ({ ...f, max_price: e.target.value ? +e.target.value : undefined }))}
                    className="flex-1 px-3 py-2.5 border border-hb-200 dark:border-hb-600 rounded-xl text-sm text-hb-700 dark:text-white bg-white dark:bg-hb-700 outline-none focus:border-hb-500" />
                </div>
              </div>

              {/* Quartier */}
              <div>
                <p className="text-xs font-semibold text-hb-500 dark:text-hb-400 uppercase tracking-wider mb-2">Quartier</p>
                <select value={filters.neighborhood_id ?? ''}
                  onChange={e => setFilters(f => ({ ...f, neighborhood_id: e.target.value || undefined }))}
                  className="w-full px-3 py-2.5 border border-hb-200 dark:border-hb-600 rounded-xl text-sm text-hb-700 dark:text-white bg-white dark:bg-hb-700 outline-none focus:border-hb-500">
                  <option value="">Tous les quartiers</option>
                  {neighborhoods.map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>

              {/* Chambres */}
              <div>
                <p className="text-xs font-semibold text-hb-500 dark:text-hb-400 uppercase tracking-wider mb-2">Chambres minimum</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setFilters(f => ({ ...f, bedrooms: f.bedrooms === n ? undefined : n }))}
                      className={cn('flex-1 py-2 rounded-xl border text-sm font-medium transition-all',
                        filters.bedrooms === n ? 'bg-hb-700 dark:bg-white text-white dark:text-hb-700 border-hb-700 dark:border-white' : 'border-hb-200 dark:border-hb-600 text-hb-600 dark:text-hb-300 hover:border-hb-400')}>
                      {n}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Meublé */}
              <button onClick={() => setFilters(f => ({ ...f, furnished: f.furnished ? undefined : true }))}
                className={cn('w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all',
                  filters.furnished ? 'border-hb-700 dark:border-white bg-hb-50 dark:bg-hb-700' : 'border-hb-200 dark:border-hb-600 hover:border-hb-400')}>
                <span className="text-sm font-medium text-hb-700 dark:text-white">🛋️ Meublé uniquement</span>
                <div className={cn('w-11 h-6 rounded-full transition-colors flex items-center',
                  filters.furnished ? 'bg-hb-700 dark:bg-white' : 'bg-hb-200 dark:bg-hb-600')}>
                  <div className={cn('w-4 h-4 bg-white dark:bg-hb-700 rounded-full shadow mx-1 transition-transform',
                    filters.furnished ? 'translate-x-5' : 'translate-x-0')} />
                </div>
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setFilters({})}
                className="flex-1 py-3 border-2 border-hb-700 dark:border-hb-300 text-hb-700 dark:text-hb-300 font-semibold rounded-2xl text-sm hover:bg-hb-50 dark:hover:bg-hb-700 transition-colors">
                Réinitialiser
              </button>
              <button onClick={() => setFiltersOpen(false)}
                className="flex-1 py-3 bg-hb-700 dark:bg-white text-white dark:text-hb-700 font-semibold rounded-2xl text-sm hover:opacity-90 transition-opacity">
                Afficher {searchTotal} résultat{searchTotal > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Résultats ── */}
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 md:px-10 py-6">
        {/* Compteur */}
        <p className="text-sm text-hb-500 dark:text-hb-400 mb-5">
          {searchLoading && searchResults.length === 0
            ? 'Recherche en cours…'
            : `${searchTotal.toLocaleString()} annonce${searchTotal > 1 ? 's' : ''} trouvée${searchTotal > 1 ? 's' : ''}`}
        </p>

        {viewMode === 'map' && searchResults.length > 0 && searchResults[0].lat && (
          <div className="mb-6 rounded-3xl overflow-hidden">
            <MapView
              lat={searchResults[0].lat!}
              lng={searchResults[0].lng!}
              title="Résultats de recherche"
              height="400px"
              zoom={13}
            />
          </div>
        )}

        {/* Grille style Airbnb */}
        {searchResults.length === 0 && !searchLoading ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="text-6xl mb-5">🔍</div>
            <h2 className="text-xl font-bold text-hb-700 dark:text-white mb-2">Aucune annonce trouvée</h2>
            <p className="text-hb-400 text-sm mb-6 max-w-xs">
              Essayez d&apos;élargir vos critères ou de changer de quartier
            </p>
            <button onClick={() => { setFilters({}); setQuery('') }}
              className="px-6 py-3 bg-hb-700 dark:bg-white text-white dark:text-hb-700 font-semibold rounded-full text-sm hover:opacity-90 transition-opacity">
              Réinitialiser la recherche
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-5 gap-y-8">
            {searchLoading && searchResults.length === 0
              ? Array.from({ length: 12 }).map((_, i) => <ListingCardSkeleton key={i} />)
              : searchResults.map((listing, i) => (
                  <ListingCard key={listing.id} listing={listing} priority={i < 6} />
                ))
            }
            {/* Skeleton pour chargement supplémentaire */}
            {searchLoading && searchResults.length > 0 && (
              Array.from({ length: 4 }).map((_, i) => <ListingCardSkeleton key={`more-${i}`} />)
            )}
          </div>
        )}

        {/* Sentinel infinite scroll */}
        {searchResults.length < searchTotal && (
          <div ref={observerRef} className="flex justify-center mt-10 py-4">
            {searchLoading && <Loader2 size={24} className="animate-spin text-hb-400" />}
          </div>
        )}
      </div>
    </div>
  )
}
