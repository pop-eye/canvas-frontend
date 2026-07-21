/**
 * User-defined ("custom") devices.
 *
 * Persisted locally and merged into the library so a user is never blocked by a
 * missing device. Each carries community provenance (`profile_meta.source`) and
 * its source URLs — the exact shape the contribution pipeline (condu-scraper
 * verification → public catalog) will consume. Kept in sync with the fetch
 * resolver so custom devices load on the canvas like catalog ones.
 */
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { v4 as uuidv4 } from "uuid"
import type { ConduitDevice } from "./types"
import { setCustomResolver, type DeviceIndexEntry } from "./source"

export interface CustomEntry {
  id: string
  device: ConduitDevice
  createdAt: string
}

interface CustomStore {
  entries: CustomEntry[]
  addCustomDevice: (device: ConduitDevice) => string
  removeCustomDevice: (id: string) => void
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export const useCustomDeviceStore = create<CustomStore>()(
  persist(
    (set, get) => ({
      entries: [],
      addCustomDevice: (device) => {
        const base = `custom/${slug(device.manufacturer)}-${slug(device.model)}`.replace(/-+$/, "") || `custom/${uuidv4().slice(0, 8)}`
        let id = base
        let i = 2
        while (get().entries.some((e) => e.id === id)) id = `${base}-${i++}`
        set((s) => ({ entries: [{ id, device, createdAt: new Date().toISOString() }, ...s.entries] }))
        return id
      },
      removeCustomDevice: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    { name: "conduit-custom-devices-v1" }
  )
)

// Keep fetchDevice's resolver pointed at the current custom devices.
function syncResolver(entries: CustomEntry[]) {
  setCustomResolver((id) => entries.find((e) => e.id === id)?.device)
}
syncResolver(useCustomDeviceStore.getState().entries)
useCustomDeviceStore.subscribe((s) => syncResolver(s.entries))

export function isCustomId(id: string): boolean {
  return id.startsWith("custom/")
}

export function customToIndexEntry(e: CustomEntry): DeviceIndexEntry {
  const d = e.device
  return {
    id: e.id,
    path: "",
    manufacturer: d.manufacturer,
    model: d.model,
    model_variant: d.model_variant,
    category: d.category,
    subcategory: d.subcategory,
    form_factor: d.form_factor,
    description: d.description,
    port_count: d.ports.length,
    verified: d.profile_meta?.verified ?? false,
    confidence: d.profile_meta?.confidence,
    tags: d.tags,
  }
}
