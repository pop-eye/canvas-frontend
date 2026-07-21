/**
 * Device data source.
 *
 * Remote-first: fetches the device index + individual profiles from the
 * conduit-open-standard repo (raw.githubusercontent.com by default, overridable
 * via VITE_CONDUIT_DEVICES_BASE). Falls back to profiles bundled with the app
 * so the library still works offline or before the repo is public.
 *
 * Device identity is the repo-relative path minus `.json` (e.g. "optoma/zu607t"),
 * carried by the index — it is NOT re-derived from fields.
 */
import { parseDevice } from "./schema"
import type { ConduitDevice, DeviceCategory, FormFactor } from "./types"
import bundledIndex from "../data/sample-index.json"

export interface DeviceIndexEntry {
  id: string
  path: string
  manufacturer: string
  model: string
  model_variant?: string
  category: DeviceCategory
  subcategory?: string
  form_factor?: FormFactor
  description?: string
  port_count?: number
  verified?: boolean
  confidence?: "high" | "medium" | "low"
  tags?: string[]
}

export interface DeviceIndex {
  schema_version: string
  generated_at?: string
  count: number
  devices: DeviceIndexEntry[]
}

const DEFAULT_BASE =
  "https://raw.githubusercontent.com/pop-eye/conduit-open-standard/main/exports/devices"

export const DEVICES_BASE: string =
  (import.meta.env.VITE_CONDUIT_DEVICES_BASE as string | undefined)?.replace(/\/$/, "") ??
  DEFAULT_BASE

// Bundled fallback profiles, keyed by id ("optoma/zu607t").
const bundledLoaders = import.meta.glob("../data/sample-devices/**/*.json") as Record<
  string,
  () => Promise<{ default: unknown }>
>
const BUNDLE_PREFIX = "../data/sample-devices/"
const bundledById = new Map<string, () => Promise<{ default: unknown }>>()
for (const [path, loader] of Object.entries(bundledLoaders)) {
  const id = path.slice(BUNDLE_PREFIX.length).replace(/\.json$/, "")
  bundledById.set(id, loader)
}

export type SourceOrigin = "remote" | "bundled"

// User-defined ("custom") devices resolve through this hook before any network
// call, so they load on the canvas exactly like catalog devices. Wired up by
// the custom-device store.
let customResolver: (id: string) => ConduitDevice | undefined = () => undefined
export function setCustomResolver(fn: (id: string) => ConduitDevice | undefined) {
  customResolver = fn
}

async function fetchJson(url: string, timeoutMs = 10_000): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** Load the device index — remote if reachable, else the bundled snapshot. */
export async function fetchDeviceIndex(): Promise<{ index: DeviceIndex; origin: SourceOrigin }> {
  try {
    const raw = await fetchJson(`${DEVICES_BASE}/index.json`)
    const index = raw as DeviceIndex
    if (Array.isArray(index?.devices) && index.devices.length > 0) {
      return { index, origin: "remote" }
    }
    throw new Error("empty or malformed index")
  } catch (err) {
    console.warn(
      `[conduit] remote index unavailable (${DEVICES_BASE}/index.json) — using bundled snapshot.`,
      err
    )
    return { index: bundledIndex as DeviceIndex, origin: "bundled" }
  }
}

/** Load one full device profile by id, remote-first with a bundled fallback. */
export async function fetchDevice(id: string, path?: string): Promise<ConduitDevice> {
  // User-defined devices short-circuit any network call.
  const custom = customResolver(id)
  if (custom) return custom

  const rel = path ?? `${id}.json`
  // Remote first.
  try {
    const raw = await fetchJson(`${DEVICES_BASE}/${rel}`)
    const parsed = parseDevice(raw)
    if (parsed.ok) return parsed.device
    console.warn(`[conduit] remote device ${id} failed validation: ${parsed.error}`)
  } catch (err) {
    console.warn(`[conduit] remote device ${id} unavailable — trying bundled.`, err)
  }
  // Bundled fallback.
  const loader = bundledById.get(id)
  if (loader) {
    const mod = await loader()
    const parsed = parseDevice(mod.default)
    if (parsed.ok) return parsed.device
    throw new Error(`Bundled device ${id} failed validation: ${parsed.error}`)
  }
  throw new Error(`Device not found: ${id}`)
}
