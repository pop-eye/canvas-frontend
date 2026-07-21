/**
 * Hierarchical signal-type parsing and classification.
 *
 * conduit/v1 signal types are namespaced strings: `domain/protocol[/subtype…]`
 *   e.g. "video/hdmi/2.0", "audio/dante", "network/ethernet/1g", "control/rs232".
 *
 * The domain drives colour and the primary compatibility axis; protocol +
 * subtype drive fine-grained compatibility (version downgrades, rate
 * conversions). This module is pure and fully unit-tested — it is the
 * foundation the compatibility engine is built on.
 */
import type { SignalDomain, SignalType } from "./types"

export interface ParsedSignalType {
  raw: string
  /** First segment. Falls back to "other" for empty/malformed input. */
  domain: SignalDomain | "other"
  /** Second segment, if any (e.g. "hdmi", "ethernet", "analogue"). */
  protocol: string | null
  /** Everything after the protocol, joined (e.g. "2.0", "analogue-bilevel"). */
  subtype: string | null
}

const KNOWN_DOMAINS: ReadonlySet<string> = new Set([
  "video", "audio", "lighting", "control", "network", "power", "rf",
])

export function parseSignalType(signal: string | null | undefined): ParsedSignalType {
  const raw = (signal ?? "").trim()
  if (!raw) return { raw: "", domain: "other", protocol: null, subtype: null }
  const segs = raw.split("/").filter(Boolean)
  const domainSeg = segs[0]?.toLowerCase() ?? ""
  const domain = (KNOWN_DOMAINS.has(domainSeg) ? domainSeg : "other") as ParsedSignalType["domain"]
  const protocol = segs[1] ? segs[1].toLowerCase() : null
  const subtype = segs.length > 2 ? segs.slice(2).join("/").toLowerCase() : null
  return { raw, domain, protocol, subtype }
}

export function signalDomain(signal: string | null | undefined): ParsedSignalType["domain"] {
  return parseSignalType(signal).domain
}

/** protocol family key, e.g. "video/hdmi" — used to test "same protocol". */
export function protocolFamily(signal: string | null | undefined): string {
  const p = parseSignalType(signal)
  if (p.domain === "other") return p.raw.toLowerCase()
  return p.protocol ? `${p.domain}/${p.protocol}` : p.domain
}

// ─── Colour ──────────────────────────────────────────────────────────────────
// Semantic, theme-independent colours keyed by signal domain.

const DOMAIN_COLOUR: Record<string, string> = {
  video: "#F59E0B",   // amber
  audio: "#10B981",   // emerald
  network: "#3B82F6", // blue
  control: "#8B5CF6", // violet
  power: "#EF4444",   // red
  lighting: "#EC4899",// pink
  rf: "#FB923C",      // orange
  other: "#6B7280",   // grey
}

export function signalColour(signal: string | null | undefined): string {
  return DOMAIN_COLOUR[signalDomain(signal)] ?? DOMAIN_COLOUR.other
}

export function domainColour(domain: string): string {
  return DOMAIN_COLOUR[domain] ?? DOMAIN_COLOUR.other
}

// ─── Human-readable labels ───────────────────────────────────────────────────

const PROTOCOL_LABELS: Record<string, string> = {
  hdmi: "HDMI", displayport: "DisplayPort", sdi: "SDI", ndi: "NDI",
  hdbaset: "HDBaseT", dvi: "DVI", "dvi-d": "DVI-D", "dvi-i": "DVI-I",
  vga: "VGA", composite: "Composite", component: "Component", svideo: "S-Video",
  smpte2110: "ST 2110", thunderbolt: "Thunderbolt", "usb-c-dp-alt": "USB-C DP",
  "3d-sync": "3D Sync", sync: "Sync",
  analogue: "Analogue", aes3: "AES3", "aes3-id": "AES3id", aes67: "AES67",
  dante: "Dante", milan: "Milan", ravenna: "Ravenna", madi: "MADI", avb: "AVB",
  spdif: "S/PDIF", usb: "USB", bluetooth: "Bluetooth", intercom: "Intercom",
  dmx512: "DMX512", artnet: "Art-Net", sacn: "sACN", rdm: "RDM",
  "kling-net": "KlingNet", dali: "DALI", pwm: "PWM", "0-10v": "0-10V", positrack: "PosiTrack",
  osc: "OSC", midi: "MIDI", rs232: "RS-232", rs485: "RS-485", rs422: "RS-422",
  gpio: "GPIO", timecode: "Timecode", wordclock: "Word Clock",
  "artnet-rdm": "Art-Net/RDM", modbus: "Modbus", knx: "KNX", bacnet: "BACnet",
  "tcp-ip": "TCP/IP", cec: "CEC", tally: "Tally",
  ethernet: "Ethernet", sfp: "SFP", "sfp-plus": "SFP+", "qsfp-plus": "QSFP+",
  qsfp28: "QSFP28", fibre: "Fibre", pcie: "PCIe", mipi: "MIPI", sdcard: "SD Card",
  wifi: "Wi-Fi", zigbee: "Zigbee", zwave: "Z-Wave", thread: "Thread", matter: "Matter",
  mains: "Mains", dc: "DC", poe: "PoE", "poe-plus": "PoE+", "poe-plus-plus": "PoE++",
  "usb-pd": "USB-PD", "hdbaset-poh": "PoH", battery: "Battery",
  antenna: "Antenna", cable: "RF Cable",
}

/** Short, human-facing label for a signal type, e.g. "HDMI 2.0", "Dante", "RS-232". */
export function signalLabel(signal: string | null | undefined): string {
  const p = parseSignalType(signal)
  if (!p.raw) return "—"
  if (!p.protocol) return PROTOCOL_LABELS[p.domain] ?? capitalise(p.domain)
  const base = PROTOCOL_LABELS[p.protocol] ?? capitalise(p.protocol)
  if (!p.subtype) return base
  return `${base} ${formatSubtype(p.subtype)}`
}

function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function formatSubtype(sub: string): string {
  // Uppercase rate/tier tokens (3g, 12g, 1g, 10g), leave versions (2.0) as-is.
  if (/^\d+(\.\d+)?g$/.test(sub)) return sub.toUpperCase()
  if (/^\d+m$/.test(sub)) return sub.toUpperCase()
  if (sub === "sd" || sub === "hd") return sub.toUpperCase()
  return sub
}

// ─── Version / rate tiers ────────────────────────────────────────────────────
// Ordered ranks per protocol family so we can detect downgrades and rate
// conversions. Higher rank = higher capability.

const TIER_RANKS: Record<string, Record<string, number>> = {
  "video/sdi": { sd: 1, hd: 2, "3g": 3, "6g": 4, "12g": 5, "24g": 6 },
  "network/ethernet": { "100m": 1, "1g": 2, "2.5g": 3, "10g": 4, "25g": 5, "40g": 6, "100g": 7 },
}

/**
 * Rank a signal type within its protocol family for downgrade detection.
 * Returns null when the subtype is not a recognised tier (e.g. no version).
 * Numeric versions (HDMI 2.0, DisplayPort 1.4) are ranked by their number.
 */
export function signalTier(signal: string | null | undefined): number | null {
  const p = parseSignalType(signal)
  if (!p.subtype) return null
  const family = protocolFamily(signal)
  const table = TIER_RANKS[family]
  if (table && p.subtype in table) return table[p.subtype]
  // Numeric version like "2.0", "1.4", "5.3"
  const num = parseFloat(p.subtype)
  if (!Number.isNaN(num)) return num
  return null
}

/** True if both signals share a domain + protocol (e.g. two HDMI ports). */
export function sameProtocol(a: string, b: string): boolean {
  return protocolFamily(a) === protocolFamily(b) && protocolFamily(a) !== ""
}
