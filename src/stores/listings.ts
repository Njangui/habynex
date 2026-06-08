import { create } from 'zustand'
import type { Listing, ListingFilters, RecommendationBlock } from '@/types'

interface ListingsState {
  blocks: Record<RecommendationBlock, Listing[]>
  blocksLoading: Record<RecommendationBlock, boolean>
  searchResults: Listing[]
  searchLoading: boolean
  searchTotal: number
  filters: ListingFilters
  favoriteIds: Set<string>
  setBlock: (block: RecommendationBlock, listings: Listing[]) => void
  setBlockLoading: (block: RecommendationBlock, loading: boolean) => void
  setSearchResults: (results: Listing[], total: number) => void
  appendSearchResults: (results: Listing[]) => void
  setSearchLoading: (loading: boolean) => void
  setFilters: (filters: ListingFilters) => void
  toggleFavorite: (id: string) => void
  setFavorites: (ids: string[]) => void
}

export const useListingsStore = create<ListingsState>((set) => ({
  blocks: { popular: [], for_you: [], good_deal: [], discover: [] },
  blocksLoading: { popular: false, for_you: false, good_deal: false, discover: false },
  searchResults: [],
  searchLoading: false,
  searchTotal: 0,
  filters: {},
  favoriteIds: new Set(),

  setBlock: (block, listings) =>
    set(s => ({ blocks: { ...s.blocks, [block]: listings } })),
  setBlockLoading: (block, loading) =>
    set(s => ({ blocksLoading: { ...s.blocksLoading, [block]: loading } })),
  setSearchResults: (results, total) =>
    set({ searchResults: results, searchTotal: total }),
  appendSearchResults: (results) =>
    set(s => ({ searchResults: [...s.searchResults, ...results] })),
  setSearchLoading: loading => set({ searchLoading: loading }),
  setFilters: filters => set({ filters }),
  toggleFavorite: id =>
    set(s => {
      const next = new Set(s.favoriteIds)
      next.has(id) ? next.delete(id) : next.add(id)
      return { favoriteIds: next }
    }),
  setFavorites: ids => set({ favoriteIds: new Set(ids) }),
}))
