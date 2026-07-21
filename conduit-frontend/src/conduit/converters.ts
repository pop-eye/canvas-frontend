/**
 * Converter discovery.
 *
 * Given a blocked link that needs a `from → to` protocol conversion, search the
 * catalog for devices that actually bridge it — an input carrying `from` and an
 * output carrying `to`. Ranked so the tightest, most-verified match comes first.
 */
import { useQuery } from "@tanstack/react-query"
import { fetchDeviceIndex, fetchDevice } from "./source"
import { useCustomDeviceStore } from "./customDevices"
import { deviceInputs, deviceOutputs } from "./device"
import { protocolFamily, parseSignalType } from "./signalType"
import type { ConduitDevice, DeviceCategory } from "./types"

export interface ConverterMatch {
  id: string
  device: ConduitDevice
  /** true = exact protocol-family match on both ends; false = same-domain match. */
  exact: boolean
}

// Categories whose whole job is transforming signals — limits how many full
// profiles we fetch while scanning for a match.
const CONVERTER_CATEGORIES = new Set<DeviceCategory>([
  "video-converter", "video-scaler", "video-switcher", "video-matrix",
  "video-encoder", "video-decoder", "audio-interface", "audio-processor",
  "audio-gateway", "network-gateway", "lighting-gateway", "lighting-node",
])

function bridges(device: ConduitDevice, from: string, to: string): { ok: boolean; exact: boolean } {
  const ins = deviceInputs(device)
  const outs = deviceOutputs(device)
  const inExact = ins.some((p) => protocolFamily(p.signal_type) === from)
  const outExact = outs.some((p) => protocolFamily(p.signal_type) === to)
  if (inExact && outExact) return { ok: true, exact: true }
  // Relaxed: same domain on each side (e.g. any video-in → any video-out scaler).
  const fromDomain = parseSignalType(from).domain
  const toDomain = parseSignalType(to).domain
  const inDomain = ins.some((p) => parseSignalType(p.signal_type).domain === fromDomain)
  const outDomain = outs.some((p) => parseSignalType(p.signal_type).domain === toDomain)
  if (inDomain && outDomain) return { ok: true, exact: false }
  return { ok: false, exact: false }
}

export async function findConverters(from: string, to: string, limit = 4): Promise<ConverterMatch[]> {
  if (!from || !to) return []

  // The user's own custom converters (already in memory) — the contribution flywheel.
  const customCandidates = useCustomDeviceStore
    .getState()
    .entries.filter((e) => CONVERTER_CATEGORIES.has(e.device.category))
    .map((e) => ({ id: e.id, device: e.device }))

  // Catalog converters — fetch full profiles for the converter-category subset.
  let catalogCandidates: { id: string; device: ConduitDevice }[] = []
  try {
    const { index } = await fetchDeviceIndex()
    const entries = index.devices.filter((d) => CONVERTER_CATEGORIES.has(d.category))
    const settled = await Promise.allSettled(
      entries.map(async (entry) => ({ id: entry.id, device: await fetchDevice(entry.id, entry.path) }))
    )
    catalogCandidates = settled.filter((r) => r.status === "fulfilled").map((r) => r.value)
  } catch {
    // catalog unreachable — custom candidates still apply
  }

  const matches: ConverterMatch[] = []
  for (const { id, device } of [...customCandidates, ...catalogCandidates]) {
    const { ok, exact } = bridges(device, from, to)
    if (ok) matches.push({ id, device, exact })
  }

  // Exact matches first, then verified, then fewer ports (simpler device).
  matches.sort((a, b) => {
    if (a.exact !== b.exact) return a.exact ? -1 : 1
    const av = a.device.profile_meta?.verified ? 0 : 1
    const bv = b.device.profile_meta?.verified ? 0 : 1
    if (av !== bv) return av - bv
    return a.device.ports.length - b.device.ports.length
  })
  return matches.slice(0, limit)
}

export function useConverters(from: string | null, to: string | null) {
  return useQuery<ConverterMatch[]>({
    queryKey: ["converters", from, to],
    queryFn: () => findConverters(from!, to!),
    enabled: !!from && !!to,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Pick the converter's input port that accepts `from` and output that emits
 * `to`, so the caller can auto-wire source → converter → target.
 */
export function pickBridgePorts(device: ConduitDevice, from: string, to: string): { inId: string; outId: string } | null {
  const fromDomain = parseSignalType(from).domain
  const toDomain = parseSignalType(to).domain
  const inPort =
    deviceInputs(device).find((p) => protocolFamily(p.signal_type) === from) ??
    deviceInputs(device).find((p) => parseSignalType(p.signal_type).domain === fromDomain)
  const outPort =
    deviceOutputs(device).find((p) => protocolFamily(p.signal_type) === to) ??
    deviceOutputs(device).find((p) => parseSignalType(p.signal_type).domain === toDomain)
  if (!inPort || !outPort) return null
  return { inId: inPort.id, outId: outPort.id }
}
