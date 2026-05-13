import { create } from "zustand"

interface ActiveKeyState {
  key: string | null
  setKey: (k: string | null) => void
}

export const useActiveKeyStore = create<ActiveKeyState>((set) => ({
  key: null,
  setKey: (k) => set({ key: k }),
}))
