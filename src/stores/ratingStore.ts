import { create } from "zustand"
import { invoke } from "@tauri-apps/api/core"

export interface RatingInfo {
  stars: number | null
  color: number | null
  isRejected: boolean
}

export interface RatingRow {
  base_name: string
  stars: number | null
  color: number | null
  is_rejected: boolean
}

interface RatingState {
  ratings: Record<string, RatingInfo>
  folderPath: string
  setStars: (key: string, stars: number) => void
  setColor: (key: string, color: number) => void
  toggleRejected: (key: string) => void
  clearAllMarks: (key: string) => void
  batchSetStars: (keys: string[], stars: number) => void
  batchSetColor: (keys: string[], color: number) => void
  batchToggleRejected: (keys: string[]) => void
  batchClearAllMarks: (keys: string[]) => void
  getRating: (key: string) => RatingInfo
  loadFromDb: (folderPath: string, rows: RatingRow[]) => void
  setFolder: (folderPath: string) => void
  flushPending: () => Promise<void>
  resetForNewFolder: () => void
}

const emptyRating = (): RatingInfo => ({ stars: null, color: null, isRejected: false })

function ensure(ratings: Record<string, RatingInfo>, key: string): RatingInfo {
  return ratings[key] ?? emptyRating()
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null
let pendingKeys = new Set<string>()

function scheduleFlush(get: () => RatingState) {
  if (pendingTimer) clearTimeout(pendingTimer)
  pendingTimer = setTimeout(async () => {
    pendingTimer = null
    const state = get()
    if (pendingKeys.size === 0 || !state.folderPath) return
    const rows: RatingRow[] = []
    for (const k of pendingKeys) {
      const r = state.ratings[k]
      if (!r) continue
      rows.push({ base_name: k, stars: r.stars, color: r.color, is_rejected: r.isRejected })
    }
    pendingKeys = new Set()
    try {
      await invoke("save_ratings_batch", { folderPath: state.folderPath, rows })
    } catch { /* silently fail */ }
  }, 300)
}

function markPending(key: string) {
  pendingKeys.add(key)
}

export const useRatingStore = create<RatingState>((set, get) => ({
  ratings: {},
  folderPath: "",

  setStars(key: string, stars: number) {
    set((s) => {
      const cur = ensure(s.ratings, key)
      if (cur.isRejected) return s
      return { ratings: { ...s.ratings, [key]: { ...cur, stars: cur.stars === stars ? 0 : stars } } }
    })
    markPending(key)
    scheduleFlush(get)
  },

  setColor(key: string, color: number) {
    set((s) => {
      const cur = ensure(s.ratings, key)
      if (cur.isRejected) return s
      return { ratings: { ...s.ratings, [key]: { ...cur, color: cur.color === color ? 0 : color } } }
    })
    markPending(key)
    scheduleFlush(get)
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
    markPending(key)
    scheduleFlush(get)
  },

  clearAllMarks(key: string) {
    set((s) => ({ ratings: { ...s.ratings, [key]: emptyRating() } }))
    markPending(key)
    scheduleFlush(get)
  },

  batchSetStars(keys: string[], stars: number) {
    set((s) => {
      const next = { ...s.ratings }
      for (const k of keys) {
        const cur = ensure(next, k)
        if (cur.isRejected) continue
        next[k] = { ...cur, stars: cur.stars === stars ? 0 : stars }
        markPending(k)
      }
      return { ratings: next }
    })
    scheduleFlush(get)
  },

  batchSetColor(keys: string[], color: number) {
    set((s) => {
      const next = { ...s.ratings }
      for (const k of keys) {
        const cur = ensure(next, k)
        if (cur.isRejected) continue
        next[k] = { ...cur, color: cur.color === color ? 0 : color }
        markPending(k)
      }
      return { ratings: next }
    })
    scheduleFlush(get)
  },

  batchToggleRejected(keys: string[]) {
    set((s) => {
      const next = { ...s.ratings }
      for (const k of keys) {
        const cur = ensure(next, k)
        const nr = !cur.isRejected
        next[k] = { ...cur, isRejected: nr, stars: nr ? null : cur.stars, color: nr ? null : cur.color }
        markPending(k)
      }
      return { ratings: next }
    })
    scheduleFlush(get)
  },

  batchClearAllMarks(keys: string[]) {
    set((s) => {
      const next = { ...s.ratings }
      for (const k of keys) {
        next[k] = emptyRating()
        markPending(k)
      }
      return { ratings: next }
    })
    scheduleFlush(get)
  },

  getRating(key: string): RatingInfo {
    return ensure(get().ratings, key)
  },

  loadFromDb(_folderPath: string, rows: RatingRow[]) {
    const ratings: Record<string, RatingInfo> = {}
    for (const row of rows) {
      ratings[row.base_name] = {
        stars: row.stars,
        color: row.color,
        isRejected: row.is_rejected,
      }
    }
    set({ ratings, folderPath: _folderPath })
  },

  setFolder(folderPath: string) {
    set({ folderPath })
  },

  async flushPending() {
    if (pendingTimer) {
      clearTimeout(pendingTimer)
      pendingTimer = null
    }
    const state = get()
    if (pendingKeys.size === 0 || !state.folderPath) { pendingKeys = new Set(); return }
    const rows: RatingRow[] = []
    for (const k of pendingKeys) {
      const r = state.ratings[k]
      if (!r) continue
      rows.push({ base_name: k, stars: r.stars, color: r.color, is_rejected: r.isRejected })
    }
    pendingKeys = new Set()
    try {
      await invoke("save_ratings_batch", { folderPath: state.folderPath, rows })
    } catch { /* silently fail */ }
  },

  resetForNewFolder() {
    set({ ratings: {}, folderPath: "" })
    pendingKeys = new Set()
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null }
  },
}))

export const COLOR_LABELS: Record<number, { label: string; hex: string }> = {
  6: { label: "红色", hex: "#ef4444" },
  7: { label: "橙色", hex: "#f97316" },
  8: { label: "黄色", hex: "#eab308" },
  9: { label: "绿色", hex: "#22c55e" },
}
