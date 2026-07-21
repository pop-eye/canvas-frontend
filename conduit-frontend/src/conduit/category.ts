/**
 * Category metadata for conduit/v1 device categories: display label, icon, and
 * a domain group used for accent colour. Unknown categories degrade gracefully.
 */
import {
  Projector, Monitor, Cpu, Lightbulb, Server, ArrowLeftRight, Maximize2,
  RefreshCw, Grid3x3, Video, Camera, SlidersHorizontal, Gauge, Network, Router,
  Waypoints, AudioWaveform, Volume2, Speaker, Box, Play, MonitorPlay, Headphones,
  Zap, BatteryCharging, HelpCircle, Radio, RadioTower, Wifi, type LucideIcon,
} from "lucide-react"
import type { DeviceCategory } from "./types"
import { domainColour } from "./signalType"

type Group = "video" | "audio" | "lighting" | "network" | "control" | "power" | "other"

interface CategoryMeta {
  label: string
  icon: LucideIcon
  group: Group
}

const META: Record<string, CategoryMeta> = {
  projector: { label: "Projector", icon: Projector, group: "video" },
  display: { label: "Display", icon: Monitor, group: "video" },
  "led-processor": { label: "LED Processor", icon: Cpu, group: "video" },
  "led-fixture": { label: "LED Fixture", icon: Grid3x3, group: "video" },
  "media-server": { label: "Media Server", icon: Server, group: "video" },
  "video-switcher": { label: "Video Switcher", icon: ArrowLeftRight, group: "video" },
  "video-scaler": { label: "Video Scaler", icon: Maximize2, group: "video" },
  "video-converter": { label: "Video Converter", icon: RefreshCw, group: "video" },
  "video-matrix": { label: "Video Matrix", icon: Grid3x3, group: "video" },
  "video-capture": { label: "Video Capture", icon: Video, group: "video" },
  "video-encoder": { label: "Video Encoder", icon: Video, group: "video" },
  "video-decoder": { label: "Video Decoder", icon: Video, group: "video" },
  camera: { label: "Camera", icon: Camera, group: "video" },
  "media-player": { label: "Media Player", icon: Play, group: "video" },

  "lighting-fixture": { label: "Lighting Fixture", icon: Lightbulb, group: "lighting" },
  "lighting-console": { label: "Lighting Console", icon: SlidersHorizontal, group: "lighting" },
  "lighting-dimmer": { label: "Dimmer", icon: Gauge, group: "lighting" },
  "lighting-node": { label: "Lighting Node", icon: Waypoints, group: "lighting" },
  "lighting-gateway": { label: "Lighting Gateway", icon: Waypoints, group: "lighting" },

  "audio-console": { label: "Audio Console", icon: SlidersHorizontal, group: "audio" },
  "audio-interface": { label: "Audio Interface", icon: AudioWaveform, group: "audio" },
  "audio-amplifier": { label: "Amplifier", icon: Volume2, group: "audio" },
  "audio-processor": { label: "Audio Processor", icon: AudioWaveform, group: "audio" },
  "audio-stagebox": { label: "Stagebox", icon: Box, group: "audio" },
  "audio-loudspeaker": { label: "Loudspeaker", icon: Speaker, group: "audio" },
  "audio-monitor": { label: "Monitor Speaker", icon: Speaker, group: "audio" },
  "audio-gateway": { label: "Audio Gateway", icon: Waypoints, group: "audio" },

  "network-switch": { label: "Network Switch", icon: Network, group: "network" },
  "network-router": { label: "Router", icon: Router, group: "network" },
  "network-gateway": { label: "Network Gateway", icon: Waypoints, group: "network" },
  "wireless-system": { label: "Wireless System", icon: Wifi, group: "network" },

  "show-controller": { label: "Show Controller", icon: MonitorPlay, group: "control" },
  "control-system": { label: "Control System", icon: Cpu, group: "control" },
  computer: { label: "Computer", icon: Cpu, group: "control" },
  intercom: { label: "Intercom", icon: Headphones, group: "control" },
  "intercom-matrix": { label: "Intercom Matrix", icon: Grid3x3, group: "control" },
  "intercom-panel": { label: "Intercom Panel", icon: Headphones, group: "control" },
  "intercom-beltpack": { label: "Beltpack", icon: Radio, group: "control" },

  "power-distribution": { label: "Power Distribution", icon: Zap, group: "power" },
  ups: { label: "UPS", icon: BatteryCharging, group: "power" },

  "rf-distribution": { label: "RF Distribution", icon: Radio, group: "other" },
  "antenna-combiner": { label: "Antenna Combiner", icon: RadioTower, group: "other" },

  other: { label: "Other", icon: HelpCircle, group: "other" },
}

const FALLBACK: CategoryMeta = { label: "Device", icon: HelpCircle, group: "other" }

function meta(category: DeviceCategory): CategoryMeta {
  return META[category] ?? FALLBACK
}

export function getCategoryIcon(category: DeviceCategory): LucideIcon {
  return meta(category).icon
}

export function categoryLabel(category: DeviceCategory): string {
  return META[category]?.label ?? titleCase(String(category))
}

export function categoryGroup(category: DeviceCategory): Group {
  return meta(category).group
}

/** Accent colour for a category, keyed by its domain group. */
export function categoryColour(category: DeviceCategory): string {
  const group = categoryGroup(category)
  if (group === "other") return "#9CA3AF"
  return domainColour(group)
}

function titleCase(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/** All known categories, for filter UIs. */
export const ALL_CATEGORIES = Object.keys(META) as DeviceCategory[]
