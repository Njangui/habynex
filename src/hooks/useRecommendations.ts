'use client'
// ================================================================
// useRecommendations.ts — Recommandations + Cache localStorage
// Utilise les vrais types Listing, UserCriteria depuis @/types
// ================================================================

import { useCallback } from 'react'
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import type { Listing, UserCriteria, ListingType, TransactionType } from '@/types'

const LS_POOL_KEY = 'hbx_pool'     // toutes les annonces récentes
const LS_RECO_KEY = 'hbx_reco'     // recommandations calculées
const POOL_TTL = 30 * 60 * 1000    // 30 min
const RECO_TTL = 10 * 60 * 1000    // 10 min

function lsGet<T>(key: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > ttl) { localStorage.removeItem(key); return null }
    return data as T
  } catch { return null }
}

function lsSet<T>(key: string, data: T) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

const LISTING_SELECT = `
  id, slug, title, description, type, transaction, price, price_negotiable,
  neighborhood_id, address_hint, lat, lng, bedrooms, bathrooms, surface_m2,
  floor, furnished, amenities, status, published_at, ai_generated,
  view_count, favorite_count, created_at, updated_at,
  neighborhood:neighborhoods!listings_neighborhood_id_fkey(
    id, name, slug, city_id,
    city:cities!neighborhoods_city_id_fkey(id, name, slug)
  ),
  media:listing_media(id, url, type, is_cover, display_order)
`

// ── Zustand store ─────────────────────────────────────────────────
interface RecoStore {
  recommendations: Listing[]
  recoLoading: boolean
  pool: Map<string, Listing>
  setRecommendations: (v: Listing[]) => void
  setRecoLoading: (v: boolean) => void
  addToPool: (items: Listing[]) => void
  getFromPool: (id: string) => Listing | undefined
  clearPool: () => void
}

export const useRecoStore = create<RecoStore>((set, get) => ({
  recommendations: [],
  recoLoading: false,
  pool: new Map(),
  setRecommendations: (recommendations) => set({ recommendations }),
  setRecoLoading: (recoLoading) => set({ recoLoading }),
  addToPool: (items) => set(s => {
    const next = new Map(s.pool)
    items.forEach(l => next.set(l.id, l))
    return { pool: next }
  }),
  getFromPool: (id) => get().pool.get(id),
  clearPool: () => set({ pool: new Map() }),
}))

// ── Algorithme de score ────────────────────────────────────────────
function scoreListing(
  listing: Listing,
  criteria: UserCriteria | null,
  currentListing: Listing | null,
): number {
  let score = 0

  // Sans critères → score basé sur popularité uniquement
  if (!criteria && !currentListing) {
    return (listing.view_count ?? 0) * 0.3 + (listing.favorite_count ?? 0) * 0.7
  }

  // Correspondance avec le bien actuel consulté
  if (currentListing) {
    if (listing.type === currentListing.type) score += 20
    if (listing.transaction === currentListing.transaction) score += 20
    if (listing.neighborhood_id === currentListing.neighborhood_id) score += 30
    const diff = currentListing.price > 0
      ? Math.abs(listing.price - currentListing.price) / currentListing.price : 1
    score += diff < 0.15 ? 20 : diff < 0.30 ? 10 : 0
    if (listing.bedrooms === currentListing.bedrooms) score += 10
    if (listing.furnished === currentListing.furnished) score += 5
  }

  // Correspondance avec le profil utilisateur
  if (criteria) {
    if (criteria.types?.includes(listing.type as ListingType)) score += 25
    if (criteria.transaction && listing.transaction === criteria.transaction) score += 20
    if (criteria.neighborhood_ids?.includes(listing.neighborhood_id ?? '')) score += 35
    if (criteria.city_id) {
      const nbh = Array.isArray(listing.neighborhood) ? listing.neighborhood[0] : listing.neighborhood as any
      const city = Array.isArray(nbh?.city) ? nbh?.city[0] : nbh?.city as any
      if (city?.id === criteria.city_id) score += 10
    }
    // Budget (tolérance ±20%)
    const minB = (criteria.budget_min ?? 0) * 0.8
    const maxB = (criteria.budget_max ?? Infinity) * 1.2
    if (listing.price >= minB && listing.price <= maxB) {
      score += 20
      // Bonus si exactement dans la fourchette
      if (listing.price >= (criteria.budget_min ?? 0) && listing.price <= (criteria.budget_max ?? Infinity)) score += 10
    }
    if (criteria.bedrooms_min && listing.bedrooms != null && listing.bedrooms >= criteria.bedrooms_min) score += 10
    if (criteria.furnished !== undefined && listing.furnished === criteria.furnished) score += 10
  }

  // Bonus popularité (léger, évite biais fort)
  score += Math.min((listing.view_count ?? 0) / 200, 5)
  score += Math.min((listing.favorite_count ?? 0) / 50, 5)

  return score
}

// ── Hook principal ─────────────────────────────────────────────────
export function useRecommendations() {
  const supabase = createClient()
  const { user, profile } = useAuthStore()
  const store = useRecoStore()

  // Précharger le pool d'annonces dans le cache local
  const preloadListings = useCallback(async (): Promise<Listing[]> => {
    const cached = lsGet<Listing[]>(LS_POOL_KEY, POOL_TTL)
    if (cached) {
      store.addToPool(cached)
      return cached
    }
    const { data } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(80)
    const listings = (data ?? []) as unknown as Listing[]
    lsSet(LS_POOL_KEY, listings)
    store.addToPool(listings)
    return listings
  }, [supabase, store])

  // Calculer les recommandations
  const loadRecommendations = useCallback(async (
    currentListingId?: string,
    limit = 6,
  ): Promise<Listing[]> => {
    const recoKey = `${LS_RECO_KEY}_${user?.id ?? 'anon'}_${currentListingId ?? 'none'}`
    const cached = lsGet<Listing[]>(recoKey, RECO_TTL)
    if (cached) {
      store.setRecommendations(cached)
      return cached
    }

    store.setRecoLoading(true)
    try {
      let pool = Array.from(store.pool.values())
      if (pool.length < 5) pool = await preloadListings()

      // Exclure le bien actuel
      const filtered = pool.filter(l => l.id !== currentListingId && l.status === 'published')

      // Récupérer le bien actuel pour comparaison
      let current: Listing | null = null
      if (currentListingId) {
        current = store.getFromPool(currentListingId) ?? null
        if (!current) {
          const { data } = await supabase
            .from('listings').select(LISTING_SELECT).eq('id', currentListingId).single()
          if (data) {
            current = data as unknown as Listing
            store.addToPool([current])
          }
        }
      }

      // Critères utilisateur depuis Profile.criteria (type UserCriteria | null)
      const criteria = (profile as any)?.criteria as UserCriteria | null

      const scored = filtered
        .map(l => ({ listing: l, score: scoreListing(l, criteria, current) }))
        .sort((a, b) => b.score - a.score)

      const recommendations = scored.slice(0, limit).map(s => s.listing)
      lsSet(recoKey, recommendations)
      store.setRecommendations(recommendations)
      return recommendations
    } finally {
      store.setRecoLoading(false)
    }
  }, [supabase, store, user, profile, preloadListings])

  // Accès direct au cache sans appel Supabase
  const getListingFromCache = useCallback(
    (id: string) => store.getFromPool(id),
    [store],
  )

  // Invalider tout le cache (après ajout d'une annonce)
  const invalidateCache = useCallback(() => {
    try {
      Object.keys(localStorage).filter(k => k.startsWith('hbx_')).forEach(k => localStorage.removeItem(k))
    } catch {}
    store.clearPool()
  }, [store])

  return {
    recommendations: store.recommendations,
    recoLoading: store.recoLoading,
    loadRecommendations,
    preloadListings,
    getListingFromCache,
    invalidateCache,
  }
}
