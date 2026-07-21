import type { ConduitDevice } from "../conduit/types"
import type { MountPosition } from "../types/spatial"

export interface CategoryGeoConfig {
  defaultSize: [number, number, number] // W H D in metres
  mountHint: MountPosition
}

const RACK_1U: [number, number, number] = [0.48, 0.044, 0.4]
const RACK_2U: [number, number, number] = [0.48, 0.088, 0.4]

export const CATEGORY_GEOMETRY: Record<string, CategoryGeoConfig> = {
  projector: { defaultSize: [0.35, 0.15, 0.55], mountHint: "ceiling" },
  display: { defaultSize: [1.2, 0.7, 0.06], mountHint: "wall-front" },
  "led-fixture": { defaultSize: [0.5, 0.5, 0.08], mountHint: "wall-front" },
  "led-processor": { defaultSize: RACK_2U, mountHint: "rack" },
  "media-server": { defaultSize: [0.48, 0.088, 0.6], mountHint: "rack" },
  "media-player": { defaultSize: [0.2, 0.04, 0.2], mountHint: "table" },
  "video-switcher": { defaultSize: RACK_1U, mountHint: "rack" },
  "video-scaler": { defaultSize: RACK_1U, mountHint: "rack" },
  "video-converter": { defaultSize: [0.12, 0.03, 0.1], mountHint: "rack" },
  "video-matrix": { defaultSize: RACK_2U, mountHint: "rack" },
  "video-capture": { defaultSize: RACK_1U, mountHint: "rack" },
  "video-encoder": { defaultSize: RACK_1U, mountHint: "rack" },
  "video-decoder": { defaultSize: RACK_1U, mountHint: "rack" },
  camera: { defaultSize: [0.15, 0.12, 0.25], mountHint: "table" },
  "lighting-fixture": { defaultSize: [0.2, 0.3, 0.2], mountHint: "truss" },
  "lighting-console": { defaultSize: [0.5, 0.1, 0.35], mountHint: "table" },
  "lighting-dimmer": { defaultSize: RACK_2U, mountHint: "rack" },
  "lighting-node": { defaultSize: RACK_1U, mountHint: "rack" },
  "lighting-gateway": { defaultSize: RACK_1U, mountHint: "rack" },
  "audio-console": { defaultSize: [0.6, 0.15, 0.5], mountHint: "table" },
  "audio-interface": { defaultSize: RACK_1U, mountHint: "rack" },
  "audio-amplifier": { defaultSize: RACK_2U, mountHint: "rack" },
  "audio-processor": { defaultSize: RACK_1U, mountHint: "rack" },
  "audio-stagebox": { defaultSize: RACK_2U, mountHint: "rack" },
  "audio-loudspeaker": { defaultSize: [0.3, 0.5, 0.3], mountHint: "truss" },
  "audio-monitor": { defaultSize: [0.25, 0.35, 0.3], mountHint: "truss" },
  "audio-gateway": { defaultSize: RACK_1U, mountHint: "rack" },
  "network-switch": { defaultSize: [0.48, 0.044, 0.35], mountHint: "rack" },
  "network-router": { defaultSize: [0.48, 0.044, 0.35], mountHint: "rack" },
  "network-gateway": { defaultSize: RACK_1U, mountHint: "rack" },
  "power-distribution": { defaultSize: [0.48, 0.088, 0.3], mountHint: "rack" },
  ups: { defaultSize: [0.48, 0.13, 0.5], mountHint: "rack" },
  "control-system": { defaultSize: [0.3, 0.05, 0.2], mountHint: "table" },
  "show-controller": { defaultSize: RACK_1U, mountHint: "rack" },
  computer: { defaultSize: [0.3, 0.1, 0.3], mountHint: "table" },
  intercom: { defaultSize: RACK_1U, mountHint: "rack" },
  "intercom-matrix": { defaultSize: [0.48, 0.13, 0.5], mountHint: "rack" },
  "intercom-panel": { defaultSize: [0.2, 0.1, 0.05], mountHint: "table" },
  "intercom-beltpack": { defaultSize: [0.08, 0.12, 0.03], mountHint: "table" },
  "rf-distribution": { defaultSize: RACK_1U, mountHint: "rack" },
  "antenna-combiner": { defaultSize: RACK_1U, mountHint: "rack" },
  "wireless-system": { defaultSize: RACK_1U, mountHint: "rack" },
}

export function deriveSize(device: ConduitDevice, defaults: [number, number, number]): [number, number, number] {
  const d = device.dimensions
  if (d && d.width_mm && d.height_mm && d.depth_mm) {
    return [d.width_mm / 1000, d.height_mm / 1000, d.depth_mm / 1000]
  }
  if (device.rack_units) {
    return [defaults[0], device.rack_units * 0.044, defaults[2]]
  }
  return defaults
}

export function getCategoryGeo(category: string): CategoryGeoConfig {
  return CATEGORY_GEOMETRY[category] ?? { defaultSize: [0.3, 0.2, 0.3], mountHint: "floor" }
}
