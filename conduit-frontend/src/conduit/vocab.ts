/**
 * Runtime vocabularies for form dropdowns / datalists.
 *
 * Signal types and connectors are *suggestions*, not a closed set — the form
 * uses <datalist> so users can also type any valid conduit/v1 value, honouring
 * the standard's forward-compatibility rule.
 */
import type { PortDirection } from "./types"

export const SIGNAL_TYPE_SUGGESTIONS: string[] = [
  // video
  "video/hdmi/2.0", "video/hdmi/2.1", "video/hdmi/1.4",
  "video/displayport/1.4", "video/displayport/2.1",
  "video/sdi/3g", "video/sdi/12g", "video/sdi/hd",
  "video/ndi", "video/hdbaset", "video/dvi-d", "video/vga",
  "video/composite", "video/usb-c-dp-alt", "video/3d-sync",
  // audio
  "audio/analogue/balanced", "audio/analogue/unbalanced", "audio/analogue/speaker", "audio/analogue/microphone",
  "audio/aes3", "audio/aes67", "audio/dante", "audio/madi", "audio/avb",
  "audio/spdif/optical", "audio/spdif/coax",
  // lighting
  "lighting/dmx512", "lighting/artnet", "lighting/sacn", "lighting/rdm",
  // control
  "control/rs232", "control/rs485", "control/osc", "control/midi/din",
  "control/gpio/relay", "control/gpio/contact-closure", "control/tcp-ip", "control/cec",
  // network
  "network/ethernet/1g", "network/ethernet/10g", "network/usb/3.2", "network/usb/2.0",
  "network/wifi/5g", "network/sfp-plus",
  // power
  "power/mains/ac/universal", "power/mains/ac/uk", "power/mains/ac/eu", "power/mains/ac/us",
  "power/dc/12v", "power/dc/24v", "power/dc/48v", "power/poe-plus",
  // rf
  "rf/antenna", "rf/cable",
]

export const CONNECTOR_SUGGESTIONS: string[] = [
  "hdmi-a", "displayport-a", "dvi-d", "de-15", "bnc", "rj45", "ethercon-rj45",
  "sfp-plus", "usb-a", "usb-b", "usb-c", "xlr-3f", "xlr-3m", "trs-6.35mm", "trs-3.5mm",
  "rca", "toslink", "phoenix-3.5mm", "phoenix-5.08mm", "euroblock-3pin", "euroblock-5pin",
  "speakon-nl4", "db9", "db25", "iec-c13", "iec-c14", "iec-c19", "iec-c20",
  "powercon-true1", "nema-5-15", "f-type", "dc-barrel", "internal", "wireless",
]

export const PORT_DIRECTIONS: { value: PortDirection; label: string }[] = [
  { value: "in", label: "Input" },
  { value: "out", label: "Output" },
  { value: "bidirectional", label: "Bidirectional" },
  { value: "power-in", label: "Power in" },
  { value: "power-out", label: "Power out" },
]

export const PANEL_SIDES = ["rear", "front", "left", "right", "top", "bottom", "internal"] as const

export const FORM_FACTORS = [
  "rackmount", "desktop", "floor-standing", "ceiling-mount", "truss-mount",
  "wall-mount", "handheld", "wearable", "blade", "modular", "portable", "installed", "other",
] as const

export const POWER_CONNECTORS = [
  "iec-c13", "iec-c14", "iec-c19", "iec-c20", "powercon-true1", "bs1363",
  "schuko", "nema-5-15", "nema-5-20", "cee-16a", "cee-32a", "dc-barrel",
] as const
