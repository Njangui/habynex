'use client'

import { useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useListingsStore } from '@/stores/listings'
import { useAuthStore } from '@/stores/auth'
import { useRecommendations, scoreListing } from '@/hooks/useRecommendations'
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
  const { profile } = useAuthStore()
  const { preloadListings } = useRecommendations()

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
            // ── Moteur unifié ────────────────────────────────────────
            // Avant : une requête SQL dédiée qui filtrait strictement sur
            // les critères du profil, avec un fallback séparé si vide.
            // Maintenant : on récupère le MÊME pool en cache (localStorage
            // 30min + Zustand, partagé avec SimilarListings / la page de
            // détail) et on le note avec le même algorithme (scoreListing)
            // — un seul moteur de recommandation, une seule requête
            // possible pour toute l'app au lieu de deux logiques + deux
            // jeux de requêtes différents.
            const criteria = (profile as any)?.criteria ?? null
            const pool = await preloadListings()

            const scored = pool
              .map(l => ({ listing: l, score: scoreListing(l, criteria, null) }))
              .sort((a, b) => b.score - a.score)

            const listings = scored.slice(0, 12).map(s => s.listing)

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
    [supabase, store, profile, preloadListings]
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
          // Full-text search PostgreSQL sur titre + description + adresse
          // Supabase textSearch utilise to_tsvector('french', ...) côté DB
          // Assure-toi d'avoir créé l'index GIN (voir migration SQL ci-dessous)
          const q = filters.query.trim()
          if (q.length > 0) {
            // On combine : textSearch sur le contenu + ilike en fallback sur le titre
            // pour les requêtes courtes (< 3 chars) ou avec accents
            if (q.length >= 3) {
              query = query.textSearch(
                'fts', // colonne générée : to_tsvector('french', title||' '||coalesce(description,'')||' '||coalesce(address_hint,''))
                q,
                { type: 'websearch', config: 'french' }
              )
            } else {
              // Fallback ilike pour les requêtes très courtes
              query = query.ilike('title', `%${q}%`)
            }
          }
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
