/**
 * Port compatibility engine (conduit/v1).
 *
 * Two layers:
 *   - checkSignalCompatibility(a, b): pure rules over two signal-type strings.
 *   - checkPortCompatibility(src, tgt): direction rules + multi-mode resolution
 *     on top of the signal layer.
 *
 * Rules are a data-driven array (first match wins) so new rules are added by
 * appending, never by editing existing branches — the project's "extend
 * through data, not code" convention.
 */
import type { Port } from "./types"
import {
  parseSignalType,
  protocolFamily,
  signalLabel,
  signalTier,
} from "./signalType"

export type Severity = "ok" | "warning" | "error"

export interface CompatibilityResult {
  compatible: boolean
  severity: Severity
  /** Present when incompatible. */
  reason?: string
  /** Present when compatible but with a caveat. */
  warning?: string
  /** Informational, non-blocking. */
  note?: string
  /** Which signal modes were matched, when not the primary signal_type. */
  viaMode?: { source?: string; target?: string }
  /** Present when the link is blocked but a converter would bridge it. */
  converter?: { from: string; to: string; fromLabel: string; toLabel: string }
}

const OK: CompatibilityResult = { compatible: true, severity: "ok" }
function warn(warning: string): CompatibilityResult {
  return { compatible: true, severity: "warning", warning }
}
function fail(reason: string): CompatibilityResult {
  return { compatible: false, severity: "error", reason }
}

// ─── Known cross-protocol bridges (same domain, different protocol) ──────────
// Real, well-understood adapters/modes that should NOT be flagged as needing a
// generic converter. Keyed by an unordered pair of protocol families.

interface Bridge {
  a: string
  b: string
  result: CompatibilityResult
}

const DVI_ADAPTER = warn("DVI↔HDMI passive adapter — video only, no embedded audio; verify HDCP")
const DVI_VARIANT_OK: CompatibilityResult = {
  compatible: true, severity: "ok", note: "Digital DVI — same electrical signal",
}

const BRIDGES: Bridge[] = [
  // Digital DVI (dvi / dvi-d / dvi-i) ↔ HDMI is a passive adapter.
  { a: "video/dvi", b: "video/hdmi", result: DVI_ADAPTER },
  { a: "video/dvi-d", b: "video/hdmi", result: DVI_ADAPTER },
  { a: "video/dvi-i", b: "video/hdmi", result: DVI_ADAPTER },
  // DVI variants among themselves carry the same digital signal.
  { a: "video/dvi", b: "video/dvi-d", result: DVI_VARIANT_OK },
  { a: "video/dvi", b: "video/dvi-i", result: DVI_VARIANT_OK },
  { a: "video/dvi-d", b: "video/dvi-i", result: DVI_VARIANT_OK },
  {
    a: "audio/dante", b: "audio/aes67",
    result: warn("Requires AES67 mode enabled on the Dante device"),
  },
  {
    a: "audio/aes3", b: "audio/aes3-id",
    result: warn("AES3 XLR↔BNC needs a 110Ω/75Ω impedance-matching transformer"),
  },
  {
    a: "video/thunderbolt", b: "video/usb-c-dp-alt",
    result: { compatible: true, severity: "ok", note: "Carried over USB-C DisplayPort Alt Mode" },
  },
  {
    a: "lighting/artnet", b: "lighting/sacn",
    result: fail("Art-Net and sACN are different protocols — requires a node/gateway that converts between them"),
  },
]

function findBridge(famA: string, famB: string): CompatibilityResult | null {
  for (const b of BRIDGES) {
    if ((b.a === famA && b.b === famB) || (b.a === famB && b.b === famA)) return b.result
  }
  return null
}

// ─── Signal-level rules (first match wins) ───────────────────────────────────

type SignalRule = (source: string, target: string) => CompatibilityResult | null

const signalRules: SignalRule[] = [
  // Power domain: exact match or a universal mains source is fine; a DC
  // voltage mismatch is a hard error, not a "downgrade".
  (source, target) => {
    const s = parseSignalType(source)
    const t = parseSignalType(target)
    if (s.domain !== "power" && t.domain !== "power") return null
    if (s.domain !== "power" || t.domain !== "power") {
      return fail("Cannot connect a power feed to a signal port")
    }
    if (source === target) return OK
    const universal = "power/mains/ac/universal"
    if (source === universal || target === universal) return OK
    // Same protocol family (e.g. both power/dc) but different subtype → voltage mismatch
    if (protocolFamily(source) === protocolFamily(target)) {
      if (s.subtype && t.subtype && s.subtype !== t.subtype) {
        return fail(`Power mismatch: ${signalLabel(source)} vs ${signalLabel(target)}`)
      }
      return OK
    }
    return fail(`Power mismatch: ${signalLabel(source)} vs ${signalLabel(target)}`)
  },

  // Cross-domain (video↔audio, etc.) is never a direct connection.
  (source, target) => {
    const s = parseSignalType(source)
    const t = parseSignalType(target)
    if (s.domain !== t.domain) {
      return fail(`Cannot connect ${s.domain} to ${t.domain}`)
    }
    return null
  },

  // Identical signal type — always fine.
  (source, target) => (source === target ? OK : null),

  // Known bridges between different protocols in the same domain.
  (source, target) => {
    const famS = protocolFamily(source)
    const famT = protocolFamily(target)
    if (famS === famT) return null
    return findBridge(famS, famT)
  },

  // Same protocol family, different subtype/version → tier comparison.
  (source, target) => {
    if (protocolFamily(source) !== protocolFamily(target)) return null
    if (source === target) return OK
    const st = signalTier(source)
    const tt = signalTier(target)
    if (st !== null && tt !== null) {
      if (st > tt) {
        return warn(`Signal downgraded: ${signalLabel(source)} → ${signalLabel(target)}`)
      }
      if (st < tt) {
        return { compatible: true, severity: "ok", note: `Link runs at ${signalLabel(source)}` }
      }
      return OK
    }
    // Same family, tiers not both comparable (one is generic) → compatible.
    return OK
  },

  // Same domain, different protocol, no known bridge → needs a converter.
  (source, target) => {
    if (protocolFamily(source) === protocolFamily(target)) return null
    const fromLabel = signalLabel(source)
    const toLabel = signalLabel(target)
    return {
      compatible: false,
      severity: "error",
      reason: `Requires a ${fromLabel} → ${toLabel} converter`,
      converter: { from: protocolFamily(source), to: protocolFamily(target), fromLabel, toLabel },
    }
  },
]

export function checkSignalCompatibility(source: string, target: string): CompatibilityResult {
  for (const rule of signalRules) {
    const r = rule(source, target)
    if (r) return r
  }
  return OK
}

// ─── Direction rules ─────────────────────────────────────────────────────────

function canSource(dir: Port["direction"]): boolean {
  return dir === "out" || dir === "bidirectional" || dir === "power-out"
}
function canSink(dir: Port["direction"]): boolean {
  return dir === "in" || dir === "bidirectional" || dir === "power-in"
}
function isPowerDir(dir: Port["direction"]): boolean {
  return dir === "power-in" || dir === "power-out"
}

/** Candidate signal types for a port: its primary plus any signal_modes. */
function candidateSignals(port: Port): string[] {
  const set = new Set<string>([port.signal_type])
  for (const m of port.signal_modes ?? []) if (m.signal_type) set.add(m.signal_type)
  return [...set]
}

const SEVERITY_RANK: Record<Severity, number> = { ok: 0, warning: 1, error: 2 }

/**
 * Full port-to-port check. `source` is the port providing signal, `target`
 * the port receiving it. Applies direction rules, then picks the best signal
 * match across both ports' modes.
 */
export function checkPortCompatibility(source: Port, target: Port): CompatibilityResult {
  // Direction
  if (!canSource(source.direction)) {
    return fail(`"${source.label}" is an input — start the connection from an output`)
  }
  if (!canSink(target.direction)) {
    return fail(`"${target.label}" is an output — connect it into an input`)
  }
  if (isPowerDir(source.direction) !== isPowerDir(target.direction)) {
    return fail("Cannot connect a power port to a signal port")
  }

  // Signal — evaluate every mode pairing, keep the least-severe result.
  const sources = candidateSignals(source)
  const targets = candidateSignals(target)
  let best: CompatibilityResult | null = null
  let bestPair: [string, string] | null = null

  for (const s of sources) {
    for (const t of targets) {
      const r = checkSignalCompatibility(s, t)
      if (best === null || SEVERITY_RANK[r.severity] < SEVERITY_RANK[best.severity]) {
        best = r
        bestPair = [s, t]
        if (r.severity === "ok") break
      }
    }
    if (best?.severity === "ok") break
  }

  if (!best) return OK

  // Annotate when the match came from a non-primary mode.
  if (bestPair && (bestPair[0] !== source.signal_type || bestPair[1] !== target.signal_type)) {
    const viaMode: CompatibilityResult["viaMode"] = {}
    if (bestPair[0] !== source.signal_type) viaMode.source = bestPair[0]
    if (bestPair[1] !== target.signal_type) viaMode.target = bestPair[1]
    return { ...best, viaMode }
  }
  return best
}
