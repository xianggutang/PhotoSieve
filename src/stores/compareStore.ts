import { create } from "zustand"

interface CompareState {
  isComparing: boolean
  orientation: "horizontal" | "vertical"
  enterCompare: () => void
  exitCompare: () => void
  toggleOrientation: () => void
}

export const useCompareStore = create<CompareState>((set) => ({
  isComparing: false,
  orientation: "horizontal",
  enterCompare: () => set({ isComparing: true }),
  exitCompare: () => set({ isComparing: false, orientation: "horizontal" }),
  toggleOrientation: () =>
    set((s) => ({ orientation: s.orientation === "horizontal" ? "vertical" : "horizontal" })),
}))
