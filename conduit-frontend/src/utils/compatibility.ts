import { ConnectorPort } from "../types/api"

export interface CompatibilityResult {
  compatible: boolean
  reason?: string
  warning?: string
}

type RuleFn = (source: ConnectorPort, target: ConnectorPort) => CompatibilityResult | null

const rules: RuleFn[] = [
  // Rule: signal_type mismatch
  (source, target) => {
    if (source.signal_type !== target.signal_type) {
      // Allow video↔av and audio↔av as adjacent types
      const avCompatible = new Set(["video", "audio", "av"])
      if (avCompatible.has(source.signal_type) && avCompatible.has(target.signal_type)) {
        return {
          compatible: true,
          warning: `Mixed signal type: ${source.signal_type} → ${target.signal_type}. Verify device compatibility.`,
        }
      }
      return {
        compatible: false,
        reason: `Cannot connect ${source.signal_type} to ${target.signal_type}`,
      }
    }
    return null
  },

  // Rule: HDMI version downgrade
  (source, target) => {
    if (
      source.protocol === "HDMI" &&
      target.protocol === "HDMI" &&
      source.version &&
      target.version
    ) {
      const srcV = parseFloat(source.version)
      const tgtV = parseFloat(target.version)
      if (srcV > tgtV) {
        return {
          compatible: true,
          warning: `Signal downgraded to HDMI ${target.version}`,
        }
      }
    }
    return null
  },

  // Rule: SDI rate mismatch
  (source, target) => {
    if (
      source.protocol.includes("SDI") &&
      target.protocol.includes("SDI") &&
      source.protocol !== target.protocol
    ) {
      return {
        compatible: true,
        warning: "Signal will be rate-converted between SDI formats",
      }
    }
    return null
  },

  // Rule: Dante to Dante
  (source, target) => {
    if (source.protocol === "Dante" && target.protocol === "Dante") {
      return { compatible: true }
    }
    return null
  },

  // Rule: Dante to analogue
  (source, target) => {
    if (
      (source.protocol === "Dante" && target.signal_type === "audio" && target.protocol !== "Dante") ||
      (target.protocol === "Dante" && source.signal_type === "audio" && source.protocol !== "Dante")
    ) {
      return {
        compatible: false,
        reason: "Dante requires a Dante-to-analogue converter",
      }
    }
    return null
  },

  // Rule: Art-Net universe conflict
  (source, target) => {
    if (
      source.protocol === "Art-Net" &&
      target.protocol === "Art-Net"
    ) {
      return { compatible: true, warning: "Verify Art-Net universe configuration on both devices" }
    }
    return null
  },

  // Rule: sACN universe
  (source, target) => {
    if (
      source.protocol === "sACN" &&
      target.protocol === "sACN"
    ) {
      return { compatible: true, warning: "Verify sACN universe configuration on both devices" }
    }
    return null
  },

  // Rule: protocol mismatch within same signal type
  (source, target) => {
    if (source.signal_type === target.signal_type && source.protocol !== target.protocol) {
      return {
        compatible: false,
        reason: `Protocol mismatch: requires a ${source.protocol}→${target.protocol} converter`,
      }
    }
    return null
  },

  // Rule: same protocol, same signal type — compatible
  (source, target) => {
    if (source.signal_type === target.signal_type && source.protocol === target.protocol) {
      return { compatible: true }
    }
    return null
  },
]

export function checkCompatibility(
  source: ConnectorPort,
  target: ConnectorPort
): CompatibilityResult {
  for (const rule of rules) {
    const result = rule(source, target)
    if (result !== null) return result
  }
  // Fallback: compatible
  return { compatible: true }
}
