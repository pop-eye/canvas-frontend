import { create } from "zustand"
import { persist } from "zustand/middleware"

/**
 * Optional unit pricing for the bill of materials, keyed by BOM line key
 * (deviceId). Persisted so a project's prices survive reloads.
 */
interface PricingStore {
  currency: string
  prices: Record<string, number>
  setPrice: (key: string, value: number | undefined) => void
  setCurrency: (currency: string) => void
}

export const usePricingStore = create<PricingStore>()(
  persist(
    (set) => ({
      currency: "£",
      prices: {},
      setPrice: (key, value) =>
        set((s) => {
          const prices = { ...s.prices }
          if (value == null || Number.isNaN(value)) delete prices[key]
          else prices[key] = value
          return { prices }
        }),
      setCurrency: (currency) => set({ currency }),
    }),
    { name: "conduit-pricing-v1" }
  )
)
