import { create } from "zustand"
import type { RatingInfo } from "./ratingStore"

export interface RatingAction {
  key: string
  prev: RatingInfo
  next: RatingInfo
}

interface UndoState {
  undoStack: RatingAction[][]
  redoStack: RatingAction[][]
  push: (actions: RatingAction[]) => void
  undo: () => RatingAction[] | null
  redo: () => RatingAction[] | null
  clear: () => void
}

export const useUndoStore = create<UndoState>((set, get) => ({
  undoStack: [],
  redoStack: [],

  push(actions: RatingAction[]) {
    if (actions.length === 0) return
    set((s) => ({ undoStack: [...s.undoStack.slice(-49), actions], redoStack: [] }))
  },

  undo() {
    const { undoStack, redoStack } = get()
    if (undoStack.length === 0) return null
    const actions = undoStack[undoStack.length - 1]
    set({ undoStack: undoStack.slice(0, -1), redoStack: [...redoStack, actions] })
    return actions
  },

  redo() {
    const { undoStack, redoStack } = get()
    if (redoStack.length === 0) return null
    const actions = redoStack[redoStack.length - 1]
    set({ redoStack: redoStack.slice(0, -1), undoStack: [...undoStack, actions] })
    return actions
  },

  clear() {
    set({ undoStack: [], redoStack: [] })
  },
}))
