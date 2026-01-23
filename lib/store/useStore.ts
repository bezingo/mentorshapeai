import { create } from 'zustand'

interface StoreState {
  // Add your state properties here
  count: number
  increment: () => void
  decrement: () => void
}

export const useStore = create<StoreState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}))





