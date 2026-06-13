'use client'

import { useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useListingsStore } from '@/stores/listings'
import type {
  Listing,
  ListingFilters,
  RecommendationBlock,
} from '@/types'

// ─────────────────────────────────────────────────────────────
// Sélection minimale pour les cards
// ─────────────────────────────────────────────────────────────
const LISTING_CARD_SELECT = `
  id,
  slug,
  title,
  description,
  type,
  transaction,
  price,
  price_negotiable,
  neighborhood_id,
  address_hint,
  lat,
  lng,
  bedrooms,
  bathrooms,
  surface_m2,
  furnished,
  ai_generated,
  view_count,
  favorite_count,
  published_at,
  created_at,

  neighborhood:neighborhoods!inner(
    id,
    name,
    slug,
    city_id,
    city:cities!inner(
      id,
      name,
      slug
    )
  ),

  media:listing_media(
    id,
    url,
    type,
    is_cover,
    display_order
  )
`

// ─────────────────────────────────────────────────────────────
// Cache mémoire
// ─────────────────────────────────────────────────────────────
const blockCache = new Map<
  string,
  {
    data: Listing[]
    ts: number
  }
>()

const CACHE_TTL = 5 * 60 * 1000 // 5 min

export function useListings() {
  const supabase = createClient()
  const store = useListingsStore()

  const pendingRef = useRef<Set<string>>(new Set())

  // ───────────────────────────────────────────────────────────
  // LOAD BLOCKS
  // ───────────────────────────────────────────────────────────
  const loadBlock = useCallback(
    async (
      block: RecommendationBlock,
      cityId?: string,
      forceRefresh = false
    ) => {
      const cacheKey = `${block}:${cityId ?? 'all'}`

      // éviter doublons
      if (pendingRef.current.has(cacheKey)) {
        // Déjà en cours — attendre max 8s puis forcer loading=false
        const timeout = setTimeout(() => {
          store.setBlockLoading(block, false)
        }, 8000)
        return
      }

      // cache
      if (!forceRefresh) {
        const cached = blockCache.get(cacheKey)

        if (cached && Date.now() - cached.ts < CACHE_TTL) {
          store.setBlock(block, cached.data)
          return
        }
      }

      pendingRef.current.add(cacheKey)
      store.setBlockLoading(block, true)

      try {
        let query = supabase
          .from('listings')
          .select(LISTING_CARD_SELECT)
          .eq('status', 'published')

        // filtre ville
        if (cityId) {
          query = query.eq('neighborhoods.city_id', cityId)
        }

        switch (block) {
          case 'popular':
            query = query
              .order('view_count', { ascending: false })
              .limit(8)
            break

          case 'good_deal':
            query = query
              .eq('transaction', 'rent')
              .order('price', { ascending: true })
              .limit(8)
            break

          case 'discover':
            query = query
              .order('published_at', { ascending: false })
              .limit(8)
            break

          case 'for_you': {
            // Récupérer les critères du profil utilisateur via auth store
            // On importe useAuthStore de façon isolée pour ne pas créer de dépendance circulaire
            // → On passe les critères via le store Zustand déjà chargé
            const storeState = (await import('@/stores/auth')).useAuthStore.getState()
            const criteria = (storeState.profile as any)?.criteria ?? {}

            const types: string[] = criteria?.types ?? []
            const transaction: string = criteria?.transaction ?? ''
            const budgetMax: number = criteria?.budget_max ?? 0
            const budgetMin: number = criteria?.budget_min ?? 0
            const neighborhoodIds: string[] = criteria?.neighborhood_ids ?? []
            const furnished: boolean | undefined = criteria?.furnished

            // Construire la requête avec les critères utilisateur
            let forYouQ = supabase
              .from('listings')
              .select(LISTING_CARD_SELECT)
              .eq('status', 'published')

            // Appliquer les critères (du moins contraignant au plus)
            if (transaction) forYouQ = forYouQ.eq('transaction', transaction)
            if (types.length > 0) forYouQ = forYouQ.in('type', types)
            if (budgetMax > 0) forYouQ = forYouQ.lte('price', budgetMax * 1.2) // +20% tolérance
            if (budgetMin > 0) forYouQ = forYouQ.gte('price', budgetMin * 0.8)
            if (furnished !== undefined) forYouQ = forYouQ.eq('furnished', furnished)
            if (neighborhoodIds.length > 0) forYouQ = forYouQ.in('neighborhood_id', neighborhoodIds)

            // Trier par popularité dans les critères
            forYouQ = forYouQ.order('view_count', { ascending: false }).limit(12)

            const { data: forYouData, error: forYouError } = await forYouQ

            if (forYouError || !forYouData?.length) {
              // Fallback : si aucun résultat avec critères stricts, élargir
              const { data: fallback } = await supabase
                .from('listings')
                .select(LISTING_CARD_SELECT)
                .eq('status', 'published')
                .order('favorite_count', { ascending: false })
                .limit(8)
              query = supabase.from('listings').select(LISTING_CARD_SELECT).eq('status', 'published').limit(0) // dummy
              const listings = (fallback ?? []) as unknown as Listing[]
              blockCache.set(cacheKey, { data: listings, ts: Date.now() })
              store.setBlock(block, listings)
              return
            }

            const listings = (forYouData ?? []) as unknown as Listing[]
            blockCache.set(cacheKey, { data: listings, ts: Date.now() })
            store.setBlock(block, listings)
            return
          }
        }

        const { data, error } = await query

        if (error) {
          console.error(error)
          return
        }

        // ✅ correction TypeScript
        const listings = (data ?? []) as unknown as Listing[]

        blockCache.set(cacheKey, {
          data: listings,
          ts: Date.now(),
        })

        store.setBlock(block, listings)
      } finally {
        store.setBlockLoading(block, false)
        pendingRef.current.delete(cacheKey)
      }
    },
    [supabase, store]
  )

  // ───────────────────────────────────────────────────────────
  // SEARCH
  // ───────────────────────────────────────────────────────────
  const search = useCallback(
    async (
      filters: ListingFilters,
      offset = 0
    ) => {
      store.setSearchLoading(true)

      try {
        let query = supabase
          .from('listings')
          .select(LISTING_CARD_SELECT, {
            count: 'exact',
          })
          .eq('status', 'published')

        // ville
        if (filters.city_id) {
          query = query.eq(
            'neighborhoods.city_id',
            filters.city_id
          )
        }

        // filtres
        if (filters.type) {
          query = query.eq('type', filters.type)
        }

        if (filters.transaction) {
          query = query.eq(
            'transaction',
            filters.transaction
          )
        }

        if (filters.neighborhood_id) {
          query = query.eq(
            'neighborhood_id',
            filters.neighborhood_id
          )
        }

        if (filters.min_price) {
          query = query.gte(
            'price',
            filters.min_price
          )
        }

        if (filters.max_price) {
          query = query.lte(
            'price',
            filters.max_price
          )
        }

        if (filters.bedrooms) {
          query = query.gte(
            'bedrooms',
            filters.bedrooms
          )
        }

        if (filters.furnished !== undefined) {
          query = query.eq(
            'furnished',
            filters.furnished
          )
        }

        if (filters.query) {
          query = query.ilike(
            'title',
            `%${filters.query}%`
          )
        }

        const {
          data,
          count,
          error,
        } = await query
          .order('published_at', {
            ascending: false,
          })
          .range(offset, offset + 19)

        if (error) {
          console.error(error)
          return
        }

        // ✅ correction TypeScript
        const listings = (data ?? []) as unknown as Listing[]

        // infinite scroll
        if (offset === 0) {
          store.setSearchResults(
            listings,
            count ?? 0
          )
        } else {
          store.appendSearchResults(listings)
        }
      } finally {
        store.setSearchLoading(false)
      }
    },
    [supabase, store]
  )

  // ───────────────────────────────────────────────────────────
  // FAVORITES
  // ───────────────────────────────────────────────────────────
  const toggleFavorite = useCallback(
    async (
      listingId: string,
      userId: string
    ) => {
      const isFav =
        store.favoriteIds.has(listingId)

      // optimistic UI
      store.toggleFavorite(listingId)

      if (isFav) {
        await supabase
          .from('listing_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('listing_id', listingId)
      } else {
        await supabase
          .from('listing_favorites')
          .insert({
            user_id: userId,
            listing_id: listingId,
          })
      }
    },
    [supabase, store]
  )

  // ───────────────────────────────────────────────────────────
  // LOAD FAVORITES
  // ───────────────────────────────────────────────────────────
  const loadFavorites = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('listing_favorites')
        .select('listing_id')
        .eq('user_id', userId)

      if (error) {
        console.error(error)
        return
      }

      if (data) {
        store.setFavorites(
          data.map(
            (f: { listing_id: string }) =>
              f.listing_id
          )
        )
      }
    },
    [supabase, store]
  )

  // Extraire toggleFavorite du store pour éviter le conflit avec la version locale
  const { toggleFavorite: _storeFav, ...restStore } = store

  return {
    loadBlock,
    search,
    toggleFavorite,   // version locale (avec userId) qui remplace celle du store
    loadFavorites,
    ...restStore,
  }
}
