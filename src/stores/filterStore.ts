import { create } from "zustand"

export interface FilterValues {
  stars: number[]
  colors: number[]
  rejectedOnly: boolean
}

interface FilterState extends FilterValues {
  setStars: (stars: number[]) => void
  setColors: (colors: number[]) => void
  setRejectedOnly: (v: boolean) => void
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
}))
