import { create } from "zustand"

interface FilterState {
  stars: number[]
  colors: number[]
  rejectedOnly: boolean
  setStars: (stars: number[]) => void
  setColors: (colors: number[]) => void
  setRejectedOnly: (v: boolean) => void
  resetAll: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  stars: [],
  colors: [],
  rejectedOnly: false,

  setStars(stars: number[]) {
    set({ stars })
  },

  setColors(colors: number[]) {
    set({ colors })
  },

  setRejectedOnly(v: boolean) {
    set({ rejectedOnly: v })
  },

  resetAll() {
    set({ stars: [], colors: [], rejectedOnly: false })
  },
}))
