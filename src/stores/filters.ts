import { create } from 'zustand'

interface FiltersState {
  activeType: string
  activeTransaction: string
  setType: (type: string) => void
  setTransaction: (transaction: string) => void
}

export const useFiltersStore = create<FiltersState>((set) => ({
  activeType: '',
  activeTransaction: '',
  setType: (activeType) => set({ activeType }),
  setTransaction: (activeTransaction) => set({ activeTransaction }),
}))
