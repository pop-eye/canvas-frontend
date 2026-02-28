export type SignalType = "video" | "audio" | "av" | "data" | "power" | "control" | "other"
export type PanelSide = "front" | "rear" | "top" | "bottom"
export type FormFactor =
  | "rackmount" | "surface" | "flown" | "truss"
  | "floor" | "desktop" | "portable" | "touring"

export type EquipmentCategory =
  | "projection" | "display" | "audio_amplified" | "audio_passive"
  | "lighting" | "media_server" | "networking" | "power_distribution"
  | "rigging" | "sensor_tracking" | "control" | "cable_signal" | "cable_hdmi" | "other"

export const ALL_CATEGORIES: EquipmentCategory[] = [
  "projection", "display", "audio_amplified", "audio_passive",
  "lighting", "media_server", "networking", "power_distribution",
  "rigging", "sensor_tracking", "control", "cable_signal", "cable_hdmi", "other"
]

export const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  projection: "Projection",
  display: "Display",
  audio_amplified: "Audio (Amplified)",
  audio_passive: "Audio (Passive)",
  lighting: "Lighting",
  media_server: "Media Server",
  networking: "Networking",
  power_distribution: "Power Distribution",
  rigging: "Rigging",
  sensor_tracking: "Sensor / Tracking",
  control: "Control",
  cable_signal: "Cable (Signal)",
  cable_hdmi: "Cable (HDMI)",
  other: "Other",
}

export interface ConnectorPort {
  protocol: string
  version?: string
  quantity: number
  connector?: string
  signal_type: SignalType
  panel_side?: PanelSide
  position_index?: number
  label?: string
  hdcp_version?: string
  edid_management?: "pass-through" | "emulate" | "override"
  max_cable_distance_m?: number
  latency_ms?: number
  sample_rates_hz?: number[]
  bit_depths?: number[]
}

export interface PowerSpec {
  draw_watts: number
  draw_watts_max?: number
  voltage: string
  frequency_hz?: string
  connector_type: string
  circuit_required: string
  label?: string
  inrush_current_a?: number
  poe_standard?: string
}

export interface ProjectionSpec {
  lumens?: number
  resolution?: string
  throw_ratio_min?: number
  throw_ratio_max?: number
  lens_shift_v_percent?: number
  lens_shift_h_percent?: number
  contrast_ratio?: string
  lamp_type?: string
  lamp_hours?: number
}

export interface DisplaySpec {
  screen_size_inches?: number
  resolution?: string
  refresh_rate_hz?: number
  brightness_nits?: number
  contrast_ratio?: string
  panel_type?: string
}

export interface HdmiCableSpec {
  length_m?: number
  version?: string
  supports_hdr?: boolean
  supports_arc?: boolean
  supports_earc?: boolean
  max_resolution?: string
  max_refresh_hz?: number
}

export interface SignalChainSpec {
  is_matrix_router?: boolean
  matrix_inputs?: number
  matrix_outputs?: number
  routing_any_to_any?: boolean
  daisy_chainable?: boolean
  daisy_chain_max_units?: number
  dante_enabled?: boolean
  dante_channels?: number
  dante_latency_ms_options?: number[]
  poe_powered?: boolean
  poe_provides?: boolean
  poe_budget_watts?: number
  ip_control_port?: number
  ip_control_protocol?: "TCP" | "UDP" | "TCP+UDP"
  artnet_universe_default?: number
  sacn_universe_default?: number
  osc_port?: number
}

export interface EquipmentRecord {
  id: string
  name: string
  manufacturer: string
  model: string
  category: EquipmentCategory
  source_url: string
  scraped_at: string
  confidence: number
  schema_version: string
  needs_review: boolean
  metadata: {
    power: PowerSpec[]
    connectivity: {
      inputs: ConnectorPort[]
      outputs: ConnectorPort[]
      network: string[]
      control: string[]
    }
    physical: {
      weight_kg: number
      dimensions_mm: { w: number; h: number; d: number }
      rack_units?: number
      rack_depth_mm?: number
      rack_ears_included?: boolean
      form_factor?: FormFactor
      mounting: string
      rigging_points?: number
      safe_working_load_kg?: number
      ip_rating?: string
    }
    environment: {
      operating_temp_c?: { min: number; max: number }
      coverage_degrees?: number
      min_distance_m?: number
      max_distance_m?: number
    }
    audio?: {
      frequency_response?: string
      spl_db?: number
      impedance_ohms?: number
      amplifier_class?: string
      channels_in?: number
      channels_out?: number
    }
    video?: {
      resolution?: string
      refresh_rate_hz?: number
      hdr?: boolean
      colour_space?: string
    }
    lighting?: {
      dmx_channels?: number
      beam_angle_degrees?: number
      cri?: number
      cct_k?: number
      gobo_slots?: number
    }
    projection?: ProjectionSpec
    display?: DisplaySpec
    hdmi_cable?: HdmiCableSpec
    signal_chain?: SignalChainSpec
    notes: string
    raw_text_excerpt: string
  }
}

export interface ListEquipmentResponse {
  records: EquipmentRecord[]
  total: number
}

export interface StatsResponse {
  total: number
  byCategory: Record<string, number>
  avgConfidence: number
  needsReview: number
}
