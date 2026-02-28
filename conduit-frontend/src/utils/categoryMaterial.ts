export interface MaterialConfig {
  color: string
  roughness: number
  metalness: number
  emissive?: string
  emissiveIntensity?: number
}

export const BASE_MATERIALS: Record<string, MaterialConfig> = {
  "matte-dark": { color: "#1A1A1F", roughness: 0.8, metalness: 0.2 },
  "screen":     { color: "#050505", roughness: 0.1, metalness: 0.0, emissive: "#00D4CC", emissiveIntensity: 0.05 },
  "rack-black": { color: "#111214", roughness: 0.6, metalness: 0.4 },
  "white":      { color: "#D0D0D4", roughness: 0.9, metalness: 0.05 },
  "cable":      { color: "#2A2A30", roughness: 1.0, metalness: 0.0 },
}

const CATEGORY_MATERIAL_MAP: Record<string, string> = {
  projection:        "matte-dark",
  display:           "screen",
  audio_amplified:   "matte-dark",
  audio_passive:     "matte-dark",
  audio_playback:    "rack-black",
  lighting:          "matte-dark",
  media_server:      "rack-black",
  networking:        "rack-black",
  power_distribution:"rack-black",
  signal_processing: "rack-black",
  video_processing:  "rack-black",
  control:           "white",
  cable_hdmi:        "cable",
  cable_sdi:         "cable",
  cable_dmx:         "cable",
  cable_ethernet:    "cable",
  cable_audio:       "cable",
  accessory:         "matte-dark",
}

export function getCategoryMaterial(category: string): MaterialConfig {
  const key = CATEGORY_MATERIAL_MAP[category] ?? "matte-dark"
  return BASE_MATERIALS[key]
}

export function applySelection(
  base: MaterialConfig,
  isSelected: boolean,
  hovered: boolean,
  needsReview: boolean
): MaterialConfig {
  if (isSelected) return { ...base, emissive: "#00D4CC", emissiveIntensity: 0.25 }
  if (hovered)    return { ...base, emissive: "#00D4CC", emissiveIntensity: 0.1 }
  if (needsReview)return { ...base, emissive: "#F59E0B", emissiveIntensity: 0.12 }
  return base
}
