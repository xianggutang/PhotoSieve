import { create } from "zustand"
import { invoke } from "@tauri-apps/api/core"
import { useUndoStore } from "./undoStore"

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
      const nextVal = { ...cur, stars: cur.stars === stars ? 0 : stars }
      useUndoStore.getState().push([{ key, prev: { ...cur }, next: { ...nextVal } }])
      return { ratings: { ...s.ratings, [key]: nextVal } }
    })
    markPending(key)
    scheduleFlush(get)
  },

  setColor(key: string, color: number) {
    set((s) => {
      const cur = ensure(s.ratings, key)
      if (cur.isRejected) return s
      const nextVal = { ...cur, color: cur.color === color ? 0 : color }
      useUndoStore.getState().push([{ key, prev: { ...cur }, next: { ...nextVal } }])
      return { ratings: { ...s.ratings, [key]: nextVal } }
    })
    markPending(key)
    scheduleFlush(get)
  },

  toggleRejected(key: string) {
    set((s) => {
      const cur = ensure(s.ratings, key)
      const nr = !cur.isRejected
      const nextVal = { ...cur, isRejected: nr, stars: nr ? null : cur.stars, color: nr ? null : cur.color }
      useUndoStore.getState().push([{ key, prev: { ...cur }, next: { ...nextVal } }])
      return { ratings: { ...s.ratings, [key]: nextVal } }
    })
    markPending(key)
    scheduleFlush(get)
  },

  clearAllMarks(key: string) {
    set((s) => {
      const cur = ensure(s.ratings, key)
      const nextVal = emptyRating()
      useUndoStore.getState().push([{ key, prev: { ...cur }, next: { ...nextVal } }])
      return { ratings: { ...s.ratings, [key]: nextVal } }
    })
    markPending(key)
    scheduleFlush(get)
  },

  batchSetStars(keys: string[], stars: number) {
    const actions: import("./undoStore").RatingAction[] = []
    set((s) => {
      const next = { ...s.ratings }
      for (const k of keys) {
        const cur = ensure(next, k)
        if (cur.isRejected) continue
        const nextVal = { ...cur, stars: cur.stars === stars ? 0 : stars }
        actions.push({ key: k, prev: { ...cur }, next: { ...nextVal } })
        next[k] = nextVal
        markPending(k)
      }
      return { ratings: next }
    })
    useUndoStore.getState().push(actions)
    scheduleFlush(get)
  },

  batchSetColor(keys: string[], color: number) {
    const actions: import("./undoStore").RatingAction[] = []
    set((s) => {
      const next = { ...s.ratings }
      for (const k of keys) {
        const cur = ensure(next, k)
        if (cur.isRejected) continue
        const nextVal = { ...cur, color: cur.color === color ? 0 : color }
        actions.push({ key: k, prev: { ...cur }, next: { ...nextVal } })
        next[k] = nextVal
        markPending(k)
      }
      return { ratings: next }
    })
    useUndoStore.getState().push(actions)
    scheduleFlush(get)
  },

  batchToggleRejected(keys: string[]) {
    const actions: import("./undoStore").RatingAction[] = []
    set((s) => {
      const next = { ...s.ratings }
      for (const k of keys) {
        const cur = ensure(next, k)
        const nr = !cur.isRejected
        const nextVal = { ...cur, isRejected: nr, stars: nr ? null : cur.stars, color: nr ? null : cur.color }
        actions.push({ key: k, prev: { ...cur }, next: { ...nextVal } })
        next[k] = nextVal
        markPending(k)
      }
      return { ratings: next }
    })
    useUndoStore.getState().push(actions)
    scheduleFlush(get)
  },

  batchClearAllMarks(keys: string[]) {
    const actions: import("./undoStore").RatingAction[] = []
    set((s) => {
      const next = { ...s.ratings }
      for (const k of keys) {
        const cur = ensure(next, k)
        const nextVal = emptyRating()
        actions.push({ key: k, prev: { ...cur }, next: { ...nextVal } })
        next[k] = nextVal
        markPending(k)
      }
      return { ratings: next }
    })
    useUndoStore.getState().push(actions)
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
