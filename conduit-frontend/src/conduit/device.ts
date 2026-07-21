/**
 * Accessor helpers over a conduit/v1 ConduitDevice.
 *
 * Centralises the shape-specific logic so components read a device through a
 * stable, intention-revealing API instead of reaching into raw fields. This is
 * the single place that knows how ports, power, provenance, and capabilities
 * are laid out in the standard.
 */
import type {
  ConduitDevice,
  Port,
  CapabilityBlock,
  DisplayCapability,
  ComputeCapability,
  NetworkSwitchCapability,
  LedProcessorCapability,
  AudioIOCapability,
  IntercomCapability,
} from "./types"
import { signalLabel } from "./signalType"

// ─── Identity ────────────────────────────────────────────────────────────────

export function deviceName(d: ConduitDevice): string {
  return [d.manufacturer, d.model].filter(Boolean).join(" ").trim() || d.model || "Unknown device"
}

export function deviceDatasheetUrl(d: ConduitDevice): string | undefined {
  return d.datasheet_url ?? d.sources?.find((s) => s.url)?.url ?? d.manual_url
}

/** Explicitly unverified profiles are flagged for review. Undefined = unknown, not flagged. */
export function deviceNeedsReview(d: ConduitDevice): boolean {
  return d.profile_meta?.verified === false
}

export function deviceConfidence(d: ConduitDevice): "high" | "medium" | "low" | undefined {
  return d.profile_meta?.confidence
}

export function deviceUpdatedAt(d: ConduitDevice): string | undefined {
  return d.profile_meta?.updated_at ?? d.profile_meta?.created_at
}

// ─── Ports ───────────────────────────────────────────────────────────────────

export function portQuantity(port: Port): number {
  return port.count ?? 1
}

/** Ports that can receive signal/power (rendered on the input/left side). */
export function deviceInputs(d: ConduitDevice): Port[] {
  return d.ports.filter(
    (p) => p.direction === "in" || p.direction === "bidirectional" || p.direction === "power-in"
  )
}

/** Ports that can provide signal/power (rendered on the output/right side). */
export function deviceOutputs(d: ConduitDevice): Port[] {
  return d.ports.filter(
    (p) => p.direction === "out" || p.direction === "bidirectional" || p.direction === "power-out"
  )
}

export function resolvePort(d: ConduitDevice, portId: string): Port | undefined {
  return d.ports.find((p) => p.id === portId)
}

/** Short display label for a port, e.g. "HDMI 2.0", "HDMI OUT 1". */
export function portLabel(port: Port): string {
  return port.label || signalLabel(port.signal_type)
}

// ─── Handle IDs ──────────────────────────────────────────────────────────────
// Format: `${port.id}::${'in'|'out'}`. The role disambiguates a bidirectional
// port that appears on both sides. Stable, unique, no fragile protocol parsing.

export type HandleRole = "in" | "out"

export function portHandleId(port: Port, role: HandleRole): string {
  return `${port.id}::${role}`
}

export function parseHandleId(handleId: string): { portId: string; role: HandleRole } | null {
  const idx = handleId.lastIndexOf("::")
  if (idx === -1) return null
  const role = handleId.slice(idx + 2)
  if (role !== "in" && role !== "out") return null
  return { portId: handleId.slice(0, idx), role }
}

// ─── Power ───────────────────────────────────────────────────────────────────

export function deviceMaxWatts(d: ConduitDevice): number {
  return d.power?.max_wattage ?? d.power?.typical_wattage ?? 0
}

export function deviceTypicalWatts(d: ConduitDevice): number {
  return d.power?.typical_wattage ?? d.power?.max_wattage ?? 0
}

/** e.g. "366W · IEC C13 · universal". Undefined when no power data. */
export function devicePowerLabel(d: ConduitDevice): string | undefined {
  const p = d.power
  if (!p) return undefined
  const watts = deviceMaxWatts(d)
  const parts: string[] = []
  if (watts) parts.push(`${watts}W`)
  if (p.connector_type) parts.push(connectorLabel(p.connector_type))
  if (p.psu_type) parts.push(p.psu_type)
  return parts.length ? parts.join(" · ") : undefined
}

// ─── Capabilities ────────────────────────────────────────────────────────────

export function getCapability(d: ConduitDevice, type: "display"): DisplayCapability | undefined
export function getCapability(d: ConduitDevice, type: "compute"): ComputeCapability | undefined
export function getCapability(d: ConduitDevice, type: "network-switch"): NetworkSwitchCapability | undefined
export function getCapability(d: ConduitDevice, type: "led-processor"): LedProcessorCapability | undefined
export function getCapability(d: ConduitDevice, type: "audio-io"): AudioIOCapability | undefined
export function getCapability(d: ConduitDevice, type: "intercom"): IntercomCapability | undefined
export function getCapability(d: ConduitDevice, type: string): CapabilityBlock | undefined {
  return d.capabilities?.find((c) => c.type === type)
}

// ─── Connector labels ────────────────────────────────────────────────────────

const CONNECTOR_OVERRIDES: Record<string, string> = {
  "hdmi-a": "HDMI-A", "hdmi-c": "HDMI-C (mini)", "hdmi-d": "HDMI-D (micro)",
  "displayport-a": "DisplayPort", "displayport-mini": "Mini DisplayPort",
  "de-15": "DE-15 (VGA)", "rca-composite": "RCA (composite)", "bnc-composite": "BNC (composite)",
  "rj45": "RJ45", "ethercon-rj45": "etherCON", "ethercon-cat5e": "etherCON",
  "usb-a": "USB-A", "usb-b": "USB-B", "usb-c": "USB-C", "usb-micro-b": "USB Micro-B", "usb-mini-b": "USB Mini-B",
  "iec-c13": "IEC C13", "iec-c14": "IEC C14", "iec-c19": "IEC C19", "iec-c20": "IEC C20",
  "xlr-3f": "XLR-3F", "xlr-3m": "XLR-3M", "xlr-5f": "XLR-5F", "xlr-5m": "XLR-5M",
  "trs-6.35mm": 'TRS 1/4"', "ts-6.35mm": 'TS 1/4"', "trs-3.5mm": "TRS 3.5mm", "ts-3.5mm": "TS 3.5mm",
  "bnc": "BNC", "db9": "DB9", "db15": "DB15", "db25": "DB25", "f-type": "F-Type",
  "sfp": "SFP", "sfp-plus": "SFP+", "qsfp-plus": "QSFP+", "qsfp28": "QSFP28",
  "lc-duplex": "LC duplex", "sc-duplex": "SC duplex", "st": "ST", "mtrj": "MT-RJ",
  "toslink": "TOSLINK", "dc-barrel": "DC barrel", "sma": "SMA", "tnc": "TNC",
  "powercon-true1": "powerCON TRUE1", "powercon-true1-top": "powerCON TRUE1 TOP",
  "nema-5-15": "NEMA 5-15", "nema-5-20": "NEMA 5-20", "nema-l6-20": "NEMA L6-20", "nema-l21-30": "NEMA L21-30",
  "cee-16a": "CEE 16A", "cee-32a": "CEE 32A", "bs1363": "BS1363 (UK)", "schuko": "Schuko",
  "phoenix-3.5mm": "Phoenix 3.5mm", "phoenix-5.08mm": "Phoenix 5.08mm",
  "euroblock-2pin": "Euroblock 2-pin", "euroblock-3pin": "Euroblock 3-pin", "euroblock-5pin": "Euroblock 5-pin",
  "din-5": "5-pin DIN", "din-5-180": "5-pin DIN",
  "internal": "Internal", "wireless": "Wireless", "slot": "Card slot",
}

export function connectorLabel(connector: string | undefined): string {
  if (!connector) return ""
  if (CONNECTOR_OVERRIDES[connector]) return CONNECTOR_OVERRIDES[connector]
  return connector.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Projector spec ──────────────────────────────────────────────────────────
// Normalises the `display` capability into the fields the throw/analysis code
// needs, so that layer doesn't reach into capability internals.

export interface ProjectorSpec {
  throwRatioMin?: number
  throwRatioMax?: number
  lumens?: number
  resWidth?: number
  resHeight?: number
  lensShiftVPercent?: number
  lensShiftHPercent?: number
  keystoneVDegrees?: number
  keystoneHDegrees?: number
}

export function getProjectorSpec(d: ConduitDevice): ProjectorSpec | null {
  const disp = getCapability(d, "display")
  if (!disp) return null
  const res = disp.native_resolution
  return {
    throwRatioMin: disp.throw_ratio_min,
    throwRatioMax: disp.throw_ratio_max,
    lumens: disp.brightness_ansi_lm ?? disp.brightness_iso_lm,
    resWidth: res?.width_px,
    resHeight: res?.height_px,
    lensShiftVPercent: disp.lens_shift_v_percent,
    lensShiftHPercent: disp.lens_shift_h_percent,
    keystoneVDegrees: disp.keystone_v_degrees,
    keystoneHDegrees: disp.keystone_h_degrees,
  }
}
