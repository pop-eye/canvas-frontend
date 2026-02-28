import { EquipmentRecord } from "../types/api"

export interface CategoryGeoConfig {
  defaultSize: [number, number, number]  // W H D in metres
  mountHint: import("../types/spatial").MountPosition
}

export const CATEGORY_GEOMETRY: Record<string, CategoryGeoConfig> = {
  projection: {
    defaultSize: [0.35, 0.15, 0.55],
    mountHint: "ceiling",
  },
  display: {
    defaultSize: [1.2, 0.7, 0.06],
    mountHint: "wall-front",
  },
  audio_amplified: {
    defaultSize: [0.25, 0.25, 0.35],
    mountHint: "truss",
  },
  audio_passive: {
    defaultSize: [0.25, 0.4, 0.3],
    mountHint: "truss",
  },
  audio_playback: {
    defaultSize: [0.48, 0.044, 0.4],
    mountHint: "rack",
  },
  lighting: {
    defaultSize: [0.2, 0.3, 0.2],
    mountHint: "truss",
  },
  media_server: {
    defaultSize: [0.48, 0.044, 0.6],
    mountHint: "rack",
  },
  networking: {
    defaultSize: [0.48, 0.044, 0.35],
    mountHint: "rack",
  },
  power_distribution: {
    defaultSize: [0.48, 0.088, 0.3],
    mountHint: "rack",
  },
  signal_processing: {
    defaultSize: [0.48, 0.044, 0.4],
    mountHint: "rack",
  },
  video_processing: {
    defaultSize: [0.48, 0.088, 0.45],
    mountHint: "rack",
  },
  control: {
    defaultSize: [0.3, 0.05, 0.2],
    mountHint: "table",
  },
  cable_hdmi: {
    defaultSize: [0.02, 0.02, 0.5],
    mountHint: "floor",
  },
  cable_sdi: {
    defaultSize: [0.02, 0.02, 0.5],
    mountHint: "floor",
  },
  cable_dmx: {
    defaultSize: [0.02, 0.02, 0.5],
    mountHint: "floor",
  },
  cable_ethernet: {
    defaultSize: [0.02, 0.02, 0.5],
    mountHint: "floor",
  },
  cable_audio: {
    defaultSize: [0.02, 0.02, 0.5],
    mountHint: "floor",
  },
  accessory: {
    defaultSize: [0.1, 0.05, 0.1],
    mountHint: "floor",
  },
}

export function deriveSize(record: EquipmentRecord, defaults: [number, number, number]): [number, number, number] {
  const d = record.metadata?.physical?.dimensions_mm
  if (d && d.w && d.h && d.d) {
    return [d.w / 1000, d.h / 1000, d.d / 1000]
  }
  const ru = record.metadata?.physical?.rack_units
  if (ru) {
    return [defaults[0], ru * 0.044, defaults[2]]
  }
  return defaults
}

export function getCategoryGeo(category: string): CategoryGeoConfig {
  return CATEGORY_GEOMETRY[category] ?? {
    defaultSize: [0.3, 0.2, 0.3],
    mountHint: "floor",
  }
}
