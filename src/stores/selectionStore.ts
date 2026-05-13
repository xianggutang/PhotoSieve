import { create } from "zustand"

interface SelectionState {
  selectedKeys: Set<string>
  lastClickedKey: string | null
  toggleSelect: (key: string) => void
  rangeSelect: (key: string, orderedKeys: string[]) => void
  selectAll: (keys: string[]) => void
  invertSelection: (keys: string[]) => void
  clearSelection: () => void
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedKeys: new Set(),
  lastClickedKey: null,

  toggleSelect(key: string) {
    const { selectedKeys } = get()
    const next = new Set(selectedKeys)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    set({ selectedKeys: next, lastClickedKey: key })
  },

  rangeSelect(key: string, orderedKeys: string[]) {
    const { lastClickedKey } = get()
    if (!lastClickedKey) {
      set({ selectedKeys: new Set([key]), lastClickedKey: key })
      return
    }
    const idxA = orderedKeys.indexOf(lastClickedKey)
    const idxB = orderedKeys.indexOf(key)
    if (idxA === -1 || idxB === -1) {
      set({ selectedKeys: new Set([key]), lastClickedKey: key })
      return
    }
    const [start, end] = idxA < idxB ? [idxA, idxB] : [idxB, idxA]
    const range = orderedKeys.slice(start, end + 1)
    set({ selectedKeys: new Set(range), lastClickedKey: key })
  },

  selectAll(keys: string[]) {
    set({ selectedKeys: new Set(keys), lastClickedKey: null })
  },

  invertSelection(keys: string[]) {
    const { selectedKeys } = get()
    const next = new Set<string>()
    for (const k of keys) {
      if (!selectedKeys.has(k)) next.add(k)
    }
    set({ selectedKeys: next, lastClickedKey: null })
  },

  clearSelection() {
    set({ selectedKeys: new Set(), lastClickedKey: null })
  },
}))
