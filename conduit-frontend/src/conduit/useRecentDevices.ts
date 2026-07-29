import { create } from "zustand"
import { persist } from "zustand/middleware"

interface RecentDevicesState {
  recentIds: string[]
  addRecent: (id: string) => void
  clearRecents: () => void
}

const MAX_RECENTS = 15

export const useRecentDevices = create<RecentDevicesState>()(
  persist(
    (set) => ({
      recentIds: [],
      addRecent: (id) =>
        set((state) => {
          const filtered = state.recentIds.filter((existingId) => existingId !== id)
          const updated = [id, ...filtered].slice(0, MAX_RECENTS)
          return { recentIds: updated }
        }),
      clearRecents: () => set({ recentIds: [] }),
    }),
    {
      name: "conduit-recent-devices",
    }
  )
)
