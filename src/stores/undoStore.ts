import { create } from "zustand"
import type { RatingInfo } from "./ratingStore"
import { useRatingStore } from "./ratingStore"

export interface RatingAction {
  key: string
  prev: RatingInfo
  next: RatingInfo
}

interface UndoState {
  undoStack: RatingAction[][]
  redoStack: RatingAction[][]
  push: (actions: RatingAction[]) => void
  applyUndo: () => void
  applyRedo: () => void
}

export const useUndoStore = create<UndoState>((set, get) => ({
  undoStack: [],
  redoStack: [],

  push(actions: RatingAction[]) {
    if (actions.length === 0) return
    set((s) => ({ undoStack: [...s.undoStack.slice(-49), actions], redoStack: [] }))
  },

  applyUndo() {
    const state = get()
    if (state.undoStack.length === 0) return
    const actions = state.undoStack[state.undoStack.length - 1]
    set({ undoStack: state.undoStack.slice(0, -1), redoStack: [...state.redoStack, actions] })

    const rs = useRatingStore.getState()
    const ratings = { ...rs.ratings }
    for (const a of actions) ratings[a.key] = a.prev
    useRatingStore.setState({ ratings })
  },

  applyRedo() {
    const state = get()
    if (state.redoStack.length === 0) return
    const actions = state.redoStack[state.redoStack.length - 1]
    set({ redoStack: state.redoStack.slice(0, -1), undoStack: [...state.undoStack, actions] })

    const rs = useRatingStore.getState()
    const ratings = { ...rs.ratings }
    for (const a of actions) ratings[a.key] = a.next
    useRatingStore.setState({ ratings })
  },
}))
