import { create } from "zustand"

export interface RatingInfo {
  stars: number | null
  color: number | null
  isRejected: boolean
}

interface RatingState {
  ratings: Record<string, RatingInfo>
  setStars: (key: string, stars: number) => void
  setColor: (key: string, color: number) => void
  toggleRejected: (key: string) => void
  clearAllMarks: (key: string) => void
  batchSetStars: (keys: string[], stars: number) => void
  batchSetColor: (keys: string[], color: number) => void
  batchToggleRejected: (keys: string[]) => void
  batchClearAllMarks: (keys: string[]) => void
  getRating: (key: string) => RatingInfo
}

const emptyRating = (): RatingInfo => ({ stars: null, color: null, isRejected: false })

function ensure(ratings: Record<string, RatingInfo>, key: string): RatingInfo {
  return ratings[key] ?? emptyRating()
}

export const useRatingStore = create<RatingState>((set, get) => ({
  ratings: {},

  setStars(key: string, stars: number) {
    set((s) => {
      const cur = ensure(s.ratings, key)
      if (cur.isRejected) return s
      return { ratings: { ...s.ratings, [key]: { ...cur, stars: cur.stars === stars ? 0 : stars } } }
    })
  },

  setColor(key: string, color: number) {
    set((s) => {
      const cur = ensure(s.ratings, key)
      if (cur.isRejected) return s
      return { ratings: { ...s.ratings, [key]: { ...cur, color: cur.color === color ? 0 : color } } }
    })
  },

  toggleRejected(key: string) {
    set((s) => {
      const cur = ensure(s.ratings, key)
      const next = !cur.isRejected
      return {
        ratings: {
          ...s.ratings,
          [key]: { ...cur, isRejected: next, stars: next ? null : cur.stars, color: next ? null : cur.color },
        },
      }
    })
  },

  clearAllMarks(key: string) {
    set((s) => ({ ratings: { ...s.ratings, [key]: emptyRating() } }))
  },

  batchSetStars(keys: string[], stars: number) {
    set((s) => {
      const next = { ...s.ratings }
      for (const k of keys) {
        const cur = ensure(next, k)
        if (cur.isRejected) continue
        next[k] = { ...cur, stars: cur.stars === stars ? 0 : stars }
      }
      return { ratings: next }
    })
  },

  batchSetColor(keys: string[], color: number) {
    set((s) => {
      const next = { ...s.ratings }
      for (const k of keys) {
        const cur = ensure(next, k)
        if (cur.isRejected) continue
        next[k] = { ...cur, color: cur.color === color ? 0 : color }
      }
      return { ratings: next }
    })
  },

  batchToggleRejected(keys: string[]) {
    set((s) => {
      const next = { ...s.ratings }
      for (const k of keys) {
        const cur = ensure(next, k)
        const nr = !cur.isRejected
        next[k] = { ...cur, isRejected: nr, stars: nr ? null : cur.stars, color: nr ? null : cur.color }
      }
      return { ratings: next }
    })
  },

  batchClearAllMarks(keys: string[]) {
    set((s) => {
      const next = { ...s.ratings }
      for (const k of keys) {
        next[k] = emptyRating()
      }
      return { ratings: next }
    })
  },

  getRating(key: string): RatingInfo {
    return ensure(get().ratings, key)
  },
}))

export const COLOR_LABELS: Record<number, { label: string; hex: string }> = {
  6: { label: "红色", hex: "#ef4444" },
  7: { label: "橙色", hex: "#f97316" },
  8: { label: "黄色", hex: "#eab308" },
  9: { label: "绿色", hex: "#22c55e" },
}
