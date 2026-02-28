import { SignalType } from "../types/api"

export function portColour(signalType: SignalType | string): string {
  const map: Record<string, string> = {
    video: "var(--signal-video)",
    audio: "var(--signal-audio)",
    data: "var(--signal-data)",
    control: "var(--signal-control)",
    power: "var(--signal-power)",
    av: "var(--signal-av)",
    other: "var(--signal-other)",
    network: "var(--signal-data)",
  }
  return map[signalType] ?? map.other
}

export function portColourHex(signalType: SignalType | string): string {
  const map: Record<string, string> = {
    video: "#F59E0B",
    audio: "#10B981",
    data: "#3B82F6",
    control: "#8B5CF6",
    power: "#EF4444",
    av: "#F97316",
    other: "#6B7280",
    network: "#3B82F6",
  }
  return map[signalType] ?? map.other
}
