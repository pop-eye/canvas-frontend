/**
 * Procedural device-model generator.
 *
 * Turns a conduit/v1 ConduitDevice into a structured 3D model spec — an overall
 * bounding size, a set of body `parts` (boxes/cylinders) composed per category
 * archetype, and real `ports` placed on the correct panel face (from
 * `panel_side` + `panel_position`) shaped by `connector_type` and coloured by
 * signal domain.
 *
 * Pure and deterministic (no Three.js) so it is unit-testable and cheap to run.
 * The renderer (ProceduralDeviceMesh) consumes this spec.
 */
import type { ConduitDevice, Port } from "../conduit/types"
import { signalColour, signalLabel } from "../conduit/signalType"
import { getCategoryGeo, deriveSize } from "./deviceGeometry"

export type Vec3 = [number, number, number]

export type MaterialKey =
  | "matte-dark" | "rack-black" | "faceplate" | "screen" | "metal"
  | "glass-lens" | "cabinet" | "white" | "driver" | "accent"

export interface PartSpec {
  kind: "box" | "cylinder"
  /** Centre of the part, relative to device centre, in metres. */
  position: Vec3
  /** box: [w,h,d]. cylinder: [radiusTop, radiusBottom, height]. */
  size: Vec3
  rotation?: Vec3
  material: MaterialKey
}

export type Face = "front" | "rear" | "left" | "right" | "top" | "bottom"

export interface PlacedPort3D {
  id: string
  face: Face
  /** Connector centre relative to device centre, in metres. */
  position: Vec3
  round: boolean
  /** World-axis box size (or cylinder [r,r,h] when round), metres. */
  size: Vec3
  rotation?: Vec3
  colour: string
  label: string
}

export interface DeviceModel {
  size: Vec3
  parts: PartSpec[]
  ports: PlacedPort3D[]
}

// ─── Face geometry ───────────────────────────────────────────────────────────

interface FaceBasis {
  /** Face-centre point on the device surface. */
  base: Vec3
  /** Outward normal. */
  normal: Vec3
  /** In-plane horizontal axis (unit) and its extent (face width). */
  uAxis: Vec3
  uLen: number
  /** In-plane vertical axis (unit) and its extent (face height). */
  vAxis: Vec3
  vLen: number
}

function faceBasis(face: Face, [W, H, D]: Vec3): FaceBasis {
  const hw = W / 2, hh = H / 2, hd = D / 2
  switch (face) {
    case "front": return { base: [0, 0, -hd], normal: [0, 0, -1], uAxis: [1, 0, 0], uLen: W, vAxis: [0, 1, 0], vLen: H }
    case "rear": return { base: [0, 0, hd], normal: [0, 0, 1], uAxis: [1, 0, 0], uLen: W, vAxis: [0, 1, 0], vLen: H }
    case "left": return { base: [-hw, 0, 0], normal: [-1, 0, 0], uAxis: [0, 0, 1], uLen: D, vAxis: [0, 1, 0], vLen: H }
    case "right": return { base: [hw, 0, 0], normal: [1, 0, 0], uAxis: [0, 0, 1], uLen: D, vAxis: [0, 1, 0], vLen: H }
    case "top": return { base: [0, hh, 0], normal: [0, 1, 0], uAxis: [1, 0, 0], uLen: W, vAxis: [0, 0, 1], vLen: D }
    case "bottom": return { base: [0, -hh, 0], normal: [0, -1, 0], uAxis: [1, 0, 0], uLen: W, vAxis: [0, 0, -1], vLen: D }
  }
}

// ─── Connector shapes ────────────────────────────────────────────────────────

const ROUND_CONNECTORS = new Set([
  "bnc", "bnc-composite", "f-type", "sma", "tnc", "dc-barrel", "din-5", "din-5-180",
  "lemo", "hirose", "banana", "speakon-nl2", "speakon-nl4", "speakon-nl8", "speakon-nl2fx",
  "xlr-3f", "xlr-3m", "xlr-5f", "xlr-5m", "powercon-true1", "powercon-true1-top",
  "opticalcon-duo", "opticalcon-quad", "st",
])

// Approx connector face size in metres [width, height].
const CONNECTOR_SIZE: Record<string, [number, number]> = {
  "hdmi-a": [0.021, 0.005], "hdmi-c": [0.011, 0.004], "hdmi-d": [0.007, 0.003],
  "displayport-a": [0.017, 0.006], "displayport-mini": [0.008, 0.005],
  "dvi-d": [0.03, 0.01], "dvi-i": [0.03, 0.01], "de-15": [0.017, 0.008],
  "rj45": [0.012, 0.011], "ethercon-rj45": [0.019, 0.019], "ethercon-cat5e": [0.019, 0.019],
  "usb-a": [0.012, 0.005], "usb-b": [0.012, 0.011], "usb-c": [0.009, 0.003],
  "iec-c13": [0.028, 0.02], "iec-c14": [0.028, 0.02], "iec-c19": [0.032, 0.024], "iec-c20": [0.032, 0.024],
  "xlr-3f": [0.02, 0.02], "xlr-3m": [0.02, 0.02], "bnc": [0.014, 0.014], "f-type": [0.011, 0.011],
  "trs-6.35mm": [0.0126, 0.0126], "trs-3.5mm": [0.007, 0.007], "toslink": [0.012, 0.01],
  "phoenix-3.5mm": [0.02, 0.01], "phoenix-5.08mm": [0.03, 0.012],
  "euroblock-3pin": [0.02, 0.01], "euroblock-5pin": [0.03, 0.01],
  "sfp": [0.014, 0.011], "sfp-plus": [0.014, 0.011], "powercon-true1": [0.024, 0.024],
}

function connectorFootprint(connector: string | undefined): [number, number] {
  return (connector && CONNECTOR_SIZE[connector]) || [0.016, 0.01]
}

const CONNECTOR_DEPTH = 0.008

function addVec(a: Vec3, b: Vec3, s = 1): Vec3 {
  return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]
}

/** Which face a port sits on. Falls back to rear for signal, front for power. */
function portFace(port: Port): Face {
  if (port.panel_side && port.panel_side !== "internal") return port.panel_side as Face
  if (port.direction === "power-in" || port.direction === "power-out") return "rear"
  return "rear"
}

/**
 * Place a device's ports onto their panel faces. Ports on the same face are
 * ordered by panel_position (fallback: input order) and spread across the face.
 */
function placePorts(device: ConduitDevice, size: Vec3): PlacedPort3D[] {
  const byFace = new Map<Face, Port[]>()
  for (const port of device.ports) {
    if (port.panel_side === "internal") continue
    const face = portFace(port)
    if (!byFace.has(face)) byFace.set(face, [])
    byFace.get(face)!.push(port)
  }

  const placed: PlacedPort3D[] = []
  for (const [face, ports] of byFace) {
    ports.sort((a, b) => (a.panel_position ?? 999) - (b.panel_position ?? 999))
    const basis = faceBasis(face, size)
    const round = face === "left" || face === "right"
    // Cylinder axis follows the face normal.
    const cylRotation: Vec3 =
      face === "front" || face === "rear" ? [Math.PI / 2, 0, 0]
        : face === "left" || face === "right" ? [0, 0, Math.PI / 2]
          : [0, 0, 0]

    const n = ports.length
    const span = basis.uLen * 0.82
    const vOffset = -basis.vLen * 0.08 // sit slightly below centre
    ports.forEach((port, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1)
      const u = (t - 0.5) * span
      const centre = addVec(
        addVec(addVec(basis.base, basis.uAxis, u), basis.vAxis, vOffset),
        basis.normal,
        CONNECTOR_DEPTH / 2
      )
      const [cw, ch] = connectorFootprint(port.connector_type)
      const isRound = ROUND_CONNECTORS.has(port.connector_type ?? "")
      const r = Math.max(cw, ch) / 2
      // Build a world-axis box size from face-local [cw, ch, depth].
      const boxSize = faceLocalToWorldSize(face, cw, ch, CONNECTOR_DEPTH)
      placed.push({
        id: port.id,
        face,
        position: [round ? centre[0] : centre[0], centre[1], centre[2]],
        round: isRound,
        size: isRound ? [r, r, CONNECTOR_DEPTH] : boxSize,
        rotation: isRound ? cylRotation : undefined,
        colour: signalColour(port.signal_type),
        label: signalLabel(port.signal_type),
      })
    })
  }
  return placed
}

function faceLocalToWorldSize(face: Face, w: number, h: number, depth: number): Vec3 {
  switch (face) {
    case "front":
    case "rear": return [w, h, depth]
    case "left":
    case "right": return [depth, h, w]
    case "top":
    case "bottom": return [w, depth, h]
  }
}

// ─── Category archetypes ─────────────────────────────────────────────────────

const RACK_CATEGORIES = new Set([
  "media-server", "network-switch", "network-router", "network-gateway",
  "video-switcher", "video-scaler", "video-converter", "video-matrix",
  "video-capture", "video-encoder", "video-decoder", "led-processor",
  "audio-processor", "audio-interface", "audio-amplifier", "audio-stagebox",
  "audio-gateway", "power-distribution", "ups", "intercom-matrix",
  "rf-distribution", "antenna-combiner", "lighting-dimmer", "lighting-node",
  "lighting-gateway", "show-controller",
])

function baseBox(size: Vec3, material: MaterialKey): PartSpec {
  return { kind: "box", position: [0, 0, 0], size, material }
}

function projectorParts([W, H, D]: Vec3): PartSpec[] {
  const bodyH = H * 0.9
  const lensR = Math.min(W, H) * 0.26
  return [
    { kind: "box", position: [0, 0, 0], size: [W, bodyH, D], material: "matte-dark" },
    // lens on the front face (−z)
    { kind: "cylinder", position: [W * 0.12, -H * 0.05, -D / 2 - 0.02], size: [lensR, lensR, 0.06], rotation: [Math.PI / 2, 0, 0], material: "glass-lens" },
    { kind: "cylinder", position: [W * 0.12, -H * 0.05, -D / 2 - 0.005], size: [lensR * 1.12, lensR * 1.12, 0.03], rotation: [Math.PI / 2, 0, 0], material: "metal" },
    // feet
    { kind: "box", position: [0, -H / 2 - 0.01, 0], size: [W * 0.8, 0.02, D * 0.8], material: "rack-black" },
  ]
}

function displayParts([W, H, D]: Vec3, formFactor: string | undefined): PartSpec[] {
  const parts: PartSpec[] = [
    // dark chassis
    { kind: "box", position: [0, 0, D * 0.15], size: [W, H, D * 0.7], material: "rack-black" },
    // screen slightly proud on the front (−z)
    { kind: "box", position: [0, 0, -D * 0.35], size: [W * 0.97, H * 0.95, D * 0.3], material: "screen" },
  ]
  const onStand = formFactor === "desktop" || formFactor === "floor-standing" || formFactor === undefined
  if (onStand) {
    parts.push({ kind: "box", position: [0, -H / 2 - H * 0.12, 0], size: [W * 0.06, H * 0.24, D], material: "metal" })
    parts.push({ kind: "box", position: [0, -H / 2 - H * 0.24, 0], size: [W * 0.4, 0.02, D * 1.6], material: "rack-black" })
  }
  return parts
}

function rackParts([W, H, D]: Vec3): PartSpec[] {
  return [
    { kind: "box", position: [0, 0, D * 0.05], size: [W, H, D * 0.9], material: "rack-black" },
    // faceplate
    { kind: "box", position: [0, 0, -D / 2 + 0.004], size: [W, H, 0.008], material: "faceplate" },
    // rack ears
    { kind: "box", position: [-W / 2 - 0.012, 0, -D / 2 + 0.004], size: [0.024, H * 0.9, 0.006], material: "metal" },
    { kind: "box", position: [W / 2 + 0.012, 0, -D / 2 + 0.004], size: [0.024, H * 0.9, 0.006], material: "metal" },
  ]
}

function loudspeakerParts([W, H, D]: Vec3): PartSpec[] {
  return [
    { kind: "box", position: [0, 0, 0], size: [W, H, D], material: "cabinet" },
    // woofer
    { kind: "cylinder", position: [0, -H * 0.15, -D / 2 - 0.01], size: [W * 0.34, W * 0.34, 0.03], rotation: [Math.PI / 2, 0, 0], material: "driver" },
    // tweeter
    { kind: "cylinder", position: [0, H * 0.28, -D / 2 - 0.008], size: [W * 0.12, W * 0.12, 0.02], rotation: [Math.PI / 2, 0, 0], material: "driver" },
  ]
}

function cameraParts([W, H, D]: Vec3): PartSpec[] {
  const lensR = Math.min(W, H) * 0.35
  return [
    { kind: "box", position: [0, 0, D * 0.1], size: [W, H, D * 0.8], material: "matte-dark" },
    { kind: "cylinder", position: [0, 0, -D / 2 - 0.03], size: [lensR, lensR, 0.08], rotation: [Math.PI / 2, 0, 0], material: "glass-lens" },
    { kind: "box", position: [0, H / 2 + 0.01, 0], size: [W * 0.5, 0.02, D * 0.5], material: "rack-black" }, // hot-shoe/handle
  ]
}

function lightingParts([W, H, D]: Vec3): PartSpec[] {
  return [
    // yoke arms
    { kind: "box", position: [-W / 2, H * 0.1, 0], size: [0.03, H * 0.7, D * 0.9], material: "metal" },
    { kind: "box", position: [W / 2, H * 0.1, 0], size: [0.03, H * 0.7, D * 0.9], material: "metal" },
    { kind: "box", position: [0, H / 2, 0], size: [W, 0.03, D * 0.9], material: "metal" },
    // head
    { kind: "cylinder", position: [0, -H * 0.05, 0], size: [W * 0.42, W * 0.42, H * 0.7], rotation: [0, 0, 0], material: "matte-dark" },
    { kind: "cylinder", position: [0, -H * 0.42, 0], size: [W * 0.36, W * 0.36, 0.04], rotation: [0, 0, 0], material: "glass-lens" },
  ]
}

function genericParts([W, H, D]: Vec3, material: MaterialKey): PartSpec[] {
  return [
    baseBox([W, H, D], material),
    // subtle front accent strip
    { kind: "box", position: [0, -H * 0.3, -D / 2 + 0.003], size: [W * 0.9, H * 0.12, 0.006], material: "faceplate" },
  ]
}

function categoryMaterialKey(category: string): MaterialKey {
  if (RACK_CATEGORIES.has(category)) return "rack-black"
  if (category === "control-system" || category === "computer" || category === "audio-console" || category === "lighting-console") return "white"
  return "matte-dark"
}

function buildParts(device: ConduitDevice, size: Vec3): PartSpec[] {
  const cat = device.category
  const ff = device.form_factor
  if (cat === "projector") return projectorParts(size)
  if (cat === "display") return displayParts(size, ff)
  if (cat === "led-fixture") return displayParts(size, "wall-mount")
  if (cat === "audio-loudspeaker" || cat === "audio-monitor") return loudspeakerParts(size)
  if (cat === "camera") return cameraParts(size)
  if (cat === "lighting-fixture") return lightingParts(size)
  if (ff === "rackmount" || RACK_CATEGORIES.has(cat)) return rackParts(size)
  return genericParts(size, categoryMaterialKey(cat))
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function buildDeviceModel(device: ConduitDevice): DeviceModel {
  const geo = getCategoryGeo(device.category)
  const size = deriveSize(device, geo.defaultSize)
  return {
    size,
    parts: buildParts(device, size),
    ports: placePorts(device, size),
  }
}
