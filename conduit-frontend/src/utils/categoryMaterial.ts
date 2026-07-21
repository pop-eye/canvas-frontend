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
  projector: "matte-dark",
  display: "screen",
  "led-fixture": "screen",
  "led-processor": "rack-black",
  "media-server": "rack-black",
  "media-player": "matte-dark",
  "video-switcher": "rack-black",
  "video-scaler": "rack-black",
  "video-converter": "rack-black",
  "video-matrix": "rack-black",
  "video-capture": "rack-black",
  "video-encoder": "rack-black",
  "video-decoder": "rack-black",
  camera: "matte-dark",
  "lighting-fixture": "matte-dark",
  "lighting-console": "white",
  "lighting-dimmer": "rack-black",
  "lighting-node": "rack-black",
  "lighting-gateway": "rack-black",
  "audio-console": "white",
  "audio-interface": "rack-black",
  "audio-amplifier": "rack-black",
  "audio-processor": "rack-black",
  "audio-stagebox": "rack-black",
  "audio-loudspeaker": "matte-dark",
  "audio-monitor": "matte-dark",
  "audio-gateway": "rack-black",
  "network-switch": "rack-black",
  "network-router": "rack-black",
  "network-gateway": "rack-black",
  "power-distribution": "rack-black",
  ups: "rack-black",
  "control-system": "white",
  "show-controller": "rack-black",
  computer: "white",
  intercom: "rack-black",
  "intercom-matrix": "rack-black",
  "intercom-panel": "matte-dark",
  "intercom-beltpack": "matte-dark",
  "rf-distribution": "rack-black",
  "antenna-combiner": "rack-black",
  "wireless-system": "rack-black",
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
