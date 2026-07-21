/**
 * CONDUIT Open Standard — conduit/v1 device profile types.
 *
 * Mirrors `conduit-v1.schema.json` from the conduit-open-standard repo.
 * Source of truth: https://conduit-standard.org/schema/conduit-v1.schema.json
 *
 * Forward-compatibility rule from the standard:
 *   "Parsers encountering unknown values MUST treat them as opaque strings
 *    and must not error. Parsers MUST ignore unknown fields."
 *
 * We honour this two ways:
 *   - Enum-like unions carry a `(string & {})` escape hatch so real, valid
 *     future values still type-check while editor autocomplete keeps the
 *     known set. Do NOT narrow on these with exhaustive switches — always
 *     handle a default.
 *   - Runtime validation (see schema.ts) treats these as plain strings.
 */

/** Escape hatch that keeps autocomplete for known members but accepts any string. */
type OpenEnum<T extends string> = T | (string & {})

// ─── Signal types ────────────────────────────────────────────────────────────
// Hierarchical namespace: `domain/protocol[/subtype]`.
// The domain (first segment) is the primary axis for compatibility + colour.

export type SignalDomain =
  | "video"
  | "audio"
  | "lighting"
  | "control"
  | "network"
  | "power"
  | "rf"

export type KnownSignalType =
  // video
  | "video/hdmi" | "video/hdmi/1.4" | "video/hdmi/2.0" | "video/hdmi/2.1"
  | "video/displayport" | "video/displayport/1.2" | "video/displayport/1.4" | "video/displayport/2.1"
  | "video/sdi" | "video/sdi/sd" | "video/sdi/hd" | "video/sdi/3g" | "video/sdi/6g" | "video/sdi/12g" | "video/sdi/24g"
  | "video/ndi" | "video/ndi/hx"
  | "video/smpte2110" | "video/smpte2110/20" | "video/smpte2110/30" | "video/smpte2110/40"
  | "video/hdbaset" | "video/hdbaset/class-a" | "video/hdbaset/class-b" | "video/hdbaset/class-c"
  | "video/dvi" | "video/dvi-d" | "video/dvi-i"
  | "video/vga" | "video/composite" | "video/component" | "video/svideo"
  | "video/thunderbolt" | "video/thunderbolt/3" | "video/thunderbolt/4" | "video/usb-c-dp-alt"
  | "video/3d-sync" | "video/sync/analogue-bilevel" | "video/sync/analogue-trilevel"
  // audio
  | "audio/analogue/balanced" | "audio/analogue/unbalanced" | "audio/analogue/speaker" | "audio/analogue/microphone"
  | "audio/aes3" | "audio/aes3-id" | "audio/aes67"
  | "audio/dante" | "audio/dante/broadway" | "audio/milan" | "audio/ravenna"
  | "audio/madi" | "audio/madi/coax" | "audio/madi/fibre" | "audio/madi/db25" | "audio/madi/aes10"
  | "audio/avb" | "audio/spdif" | "audio/spdif/coax" | "audio/spdif/optical"
  | "audio/thunderbolt" | "audio/usb" | "audio/bluetooth" | "audio/bluetooth/a2dp"
  | "audio/intercom/4-wire" | "audio/intercom/2-wire" | "audio/intercom/partyline" | "audio/intercom/voip"
  // lighting
  | "lighting/dmx512" | "lighting/artnet" | "lighting/artnet/rdm" | "lighting/sacn" | "lighting/rdm"
  | "lighting/kling-net" | "lighting/dali" | "lighting/dali/2" | "lighting/pwm" | "lighting/0-10v" | "lighting/positrack"
  // control
  | "control/osc"
  | "control/midi/din" | "control/midi/usb" | "control/midi/ip" | "control/midi/bluetooth"
  | "control/rs232" | "control/rs485" | "control/rs422"
  | "control/gpio" | "control/gpio/contact-closure" | "control/gpio/relay" | "control/gpio/ttl"
  | "control/timecode/ltc" | "control/timecode/mtc" | "control/timecode/ptp" | "control/timecode/aes11"
  | "control/wordclock" | "control/artnet-rdm"
  | "control/modbus/rtu" | "control/modbus/tcp" | "control/knx" | "control/bacnet" | "control/tcp-ip" | "control/cec"
  | "control/tally" | "control/tally/contact-closure" | "control/tally/ip"
  // network
  | "network/ethernet/100m" | "network/ethernet/1g" | "network/ethernet/2.5g" | "network/ethernet/10g"
  | "network/ethernet/25g" | "network/ethernet/40g" | "network/ethernet/100g"
  | "network/sfp" | "network/sfp-plus" | "network/qsfp-plus" | "network/qsfp28"
  | "network/fibre/multimode" | "network/fibre/singlemode" | "network/fibre/ring"
  | "network/thunderbolt/3" | "network/thunderbolt/4"
  | "network/usb/2.0" | "network/usb/3.2" | "network/usb4"
  | "network/pcie/2.0" | "network/pcie/3.0" | "network/pcie/4.0" | "network/pcie/5.0"
  | "network/mipi/csi-2" | "network/mipi/dsi" | "network/sdcard"
  | "network/wifi/2.4g" | "network/wifi/5g" | "network/wifi/6g"
  | "network/bluetooth" | "network/bluetooth/4.0" | "network/bluetooth/4.2" | "network/bluetooth/5.0" | "network/bluetooth/5.3"
  | "network/zigbee" | "network/zwave" | "network/thread" | "network/matter"
  // power
  | "power/mains/ac/uk" | "power/mains/ac/eu" | "power/mains/ac/us" | "power/mains/ac/universal" | "power/mains/ac/three-phase"
  | "power/dc" | "power/dc/5v" | "power/dc/12v" | "power/dc/24v" | "power/dc/48v"
  | "power/poe" | "power/poe-plus" | "power/poe-plus-plus" | "power/usb-pd" | "power/hdbaset-poh" | "power/battery"
  // rf
  | "rf/antenna" | "rf/antenna/dvb-t" | "rf/antenna/dvb-t2" | "rf/antenna/dvb-s" | "rf/antenna/dvb-s2"
  | "rf/antenna/atsc" | "rf/antenna/isdb-t" | "rf/cable"

export type SignalType = OpenEnum<KnownSignalType>

export type PortDirection = "in" | "out" | "bidirectional" | "power-in" | "power-out"

export type KnownConnectorType =
  | "xlr-3f" | "xlr-3m" | "xlr-5f" | "xlr-5m"
  | "trs-6.35mm" | "ts-6.35mm" | "trs-3.5mm" | "ts-3.5mm" | "trrs-3.5mm"
  | "rca" | "bnc" | "speakon-nl2" | "speakon-nl4" | "speakon-nl8" | "speakon-nl2fx"
  | "db25" | "db9" | "db15"
  | "hdmi-a" | "hdmi-c" | "hdmi-d" | "displayport-a" | "displayport-mini"
  | "dvi-d" | "dvi-i" | "de-15" | "rca-composite" | "bnc-composite"
  | "rj45" | "ethercon-rj45" | "ethercon-cat5e"
  | "sfp" | "sfp-plus" | "qsfp-plus" | "qsfp28" | "lc-duplex" | "sc-duplex" | "st" | "mtrj"
  | "usb-a" | "usb-b" | "usb-c" | "usb-micro-b" | "usb-mini-b" | "thunderbolt-3" | "thunderbolt-4"
  | "din-5" | "din-5-180"
  | "powercon-true1" | "powercon-true1-top" | "iec-c13" | "iec-c14" | "iec-c19" | "iec-c20"
  | "bs1363" | "schuko" | "nema-5-15" | "nema-5-20" | "nema-l6-20" | "nema-l21-30"
  | "cee-16a" | "cee-32a" | "powerlock"
  | "phoenix-3.5mm" | "phoenix-5.08mm" | "euroblock-2pin" | "euroblock-3pin" | "euroblock-5pin"
  | "lemo" | "hirose" | "bare-wire" | "banana" | "dc-barrel" | "sma" | "tnc" | "f-type"
  | "pcie-x1" | "pcie-x4" | "pcie-x8" | "pcie-x16" | "m2-m-key" | "m2-e-key"
  | "microsd" | "sd" | "fpc-15pin" | "fpc-22pin" | "gpio-header-40pin"
  | "toslink" | "opticalcon-duo" | "opticalcon-quad" | "socapex-19pin" | "cacombo" | "pigtail-sma"
  | "internal" | "wireless" | "slot"

export type ConnectorType = OpenEnum<KnownConnectorType>

export type KnownDeviceCategory =
  | "projector" | "display" | "led-processor" | "led-fixture" | "media-server"
  | "video-switcher" | "video-scaler" | "video-converter" | "video-matrix" | "video-capture"
  | "video-encoder" | "video-decoder" | "camera"
  | "lighting-fixture" | "lighting-console" | "lighting-dimmer" | "lighting-node" | "lighting-gateway"
  | "audio-console" | "audio-interface" | "audio-amplifier" | "audio-processor" | "audio-stagebox"
  | "audio-loudspeaker" | "audio-monitor" | "audio-gateway"
  | "network-switch" | "network-router" | "network-gateway"
  | "media-player" | "show-controller" | "control-system" | "intercom"
  | "power-distribution" | "ups" | "computer" | "other"
  | "intercom-matrix" | "intercom-panel" | "intercom-beltpack"
  | "rf-distribution" | "antenna-combiner" | "wireless-system"

export type DeviceCategory = OpenEnum<KnownDeviceCategory>

export type FormFactor = OpenEnum<
  | "rackmount" | "desktop" | "floor-standing" | "ceiling-mount" | "truss-mount"
  | "wall-mount" | "handheld" | "wearable" | "blade" | "modular" | "portable" | "installed" | "other"
>

// ─── Ports ───────────────────────────────────────────────────────────────────

export interface VideoResolution {
  width_px?: number
  height_px?: number
  fps?: number | number[]
  colour_space?: "RGB" | "YCbCr-444" | "YCbCr-422" | "YCbCr-420"
  bit_depth?: number
  hdr?: string[]
}

export interface SignalMode {
  signal_type: SignalType
  condition?: string
  mutually_exclusive?: boolean
  notes?: string
}

export interface Port {
  id: string
  label: string
  signal_type: SignalType
  connector_type: ConnectorType
  direction: PortDirection
  /** All signal modes for a multi-mode connector (USB-C, SFP). Primary is `signal_type`. */
  signal_modes?: SignalMode[]
  /** Number of identical ports sharing this definition. Assumed 1 if omitted. */
  count?: number
  panel_side?: "front" | "rear" | "left" | "right" | "top" | "bottom" | "internal"
  panel_position?: number
  management_port?: boolean
  universe?: number
  channel_count?: number
  channel_count_in?: number
  channel_count_out?: number
  sample_rate_hz?: number | number[]
  bit_depth?: number | number[]
  latency_ms?: number
  impedance_ohm?: number
  max_resolution?: VideoResolution
  pixel_clock_mhz?: number
  hdcp?: boolean
  hdcp_version?: string
  poe_class?: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8"
  poe_role?: "pse" | "pd"
  voltage_v?: number
  current_a?: number
  termination?: boolean
  loopthrough?: boolean
  passive_loop?: boolean
  phantom_power?: boolean
  gain_range_db?: [number, number]
  frequency_response_hz?: [number, number]
  output_power_w?: { impedance_ohm: number; watts: number; bridged?: boolean }[]
  requires_variant?: string[]
  requires_option?: string[]
  slot_id?: string
  notes?: string
}

export interface OperationalMode {
  id: string
  label: string
  description?: string
  active_port_ids: string[]
}

// ─── Power / physical / environment ──────────────────────────────────────────

export interface PowerRequirements {
  voltage_v?: number | number[]
  frequency_hz?: number | number[]
  phases?: 1 | 3
  max_wattage?: number
  typical_wattage?: number
  standby_wattage?: number
  inrush_current_a?: number
  poe_budget_w?: number
  connector_type?: ConnectorType
  psu_type?: OpenEnum<
    | "internal" | "external-brick" | "external-rackmount" | "poe" | "poe-plus"
    | "poe-plus-plus" | "usb-pd" | "hdbaset-poh" | "dc-barrel"
  >
  redundant_psu?: boolean
  notes?: string
}

export interface Dimensions {
  width_mm?: number
  height_mm?: number
  depth_mm?: number
}

export interface EnvironmentalSpec {
  operating_temp_min_c?: number
  operating_temp_max_c?: number
  storage_temp_min_c?: number
  storage_temp_max_c?: number
  humidity_max_percent?: number
  humidity_condensing?: boolean
  altitude_max_m?: number
  ip_rating?: string
  audible_noise_dba?: number
  heat_dissipation_btu_hr?: number
}

export interface ReliabilitySpec {
  mtbf_hours?: number
  mtbf_conditions?: string
  eol_date?: string
  warranty_years?: number
  warranty_notes?: string
}

// ─── Capability blocks (discriminated by `type`) ─────────────────────────────

export interface DisplayCapability {
  type: "display"
  native_resolution?: VideoResolution
  brightness_iso_lm?: number
  brightness_ansi_lm?: number
  contrast_ratio_full?: number
  contrast_ratio_dynamic?: number
  display_technology?: string
  light_source_type?: string
  light_source_life_hours?: number
  light_source_life_condition?: string
  throw_ratio_min?: number
  throw_ratio_max?: number
  lens_shift_v_percent?: number
  lens_shift_h_percent?: number
  keystone_v_degrees?: number
  keystone_h_degrees?: number
  built_in_warp?: boolean
  built_in_blend?: boolean
  pixel_clock_mhz?: number
  h_sync_range_khz?: [number, number]
  v_sync_range_hz?: [number, number]
  hdr_formats?: string[]
  colour_spaces?: string[]
}

export interface ComputeCapability {
  type: "compute"
  cpu_model?: string
  cpu_cores?: number
  cpu_frequency_ghz?: number
  cpu_architecture?: string
  gpu_model?: string
  gpu_vram_gb?: number
  gpu_api_support?: string[]
  ram_gb?: number
  ram_type?: string
  storage_os_gb?: number
  storage_media_tb?: number
  storage_type?: string
  os?: string
  rtc?: boolean
}

export interface NetworkSwitchCapability {
  type: "network-switch"
  switching_fabric_gbps?: number
  forwarding_mpps?: number
  mac_table_size?: number
  vlan_count?: number
  igmp_group_limit?: number
  packet_buffer_mb?: number
  latency_us?: number
  managed?: boolean
  layer?: 2 | 3 | 4
  av_profiles?: string[]
  avb_support?: boolean
  ptp_support?: boolean
  ptp_mode?: string
  jumbo_frame_kb?: number
  lag_count?: number
  lag_ports_per_group?: number
}

export interface LedProcessorCapability {
  type: "led-processor"
  max_canvas_width_px?: number
  max_canvas_height_px?: number
  max_output_pixels_total?: number
  pixels_per_1g_output?: number
  pixels_per_output_conditions?: string
  supported_bit_depths?: number[]
  supported_frame_rates_hz?: number[]
  hdr_support?: boolean
  per_panel_calibration?: boolean
  genlock_support?: boolean
  redundancy_support?: boolean
}

export interface AudioIOCapability {
  type: "audio-io"
  analogue_input_count?: number
  analogue_output_count?: number
  supported_sample_rates_hz?: number[]
  ad_bit_depth?: number
  da_bit_depth?: number
  ad_oversampling?: number
  da_oversampling?: number
  dynamic_range_db?: number
  ein_dbu?: number
  residual_noise_dbu?: number
  thd_percent?: number
  crosstalk_db?: number
  signal_delay_ms?: number
  dante_channel_count_in?: number
  dante_channel_count_out?: number
  gain_compensation?: boolean
}

export interface IntercomCapability {
  type: "intercom"
  matrix_size_max?: { inputs?: number; outputs?: number }
  ports_per_frame?: number
  client_card_slots?: number
  controller_card_slots?: number
  gpi_card_slots?: number
  hot_swap?: boolean
  redundant_controller?: boolean
  redundant_psu?: boolean
  fiber_ring?: boolean
  max_nodes_in_ring?: number
  max_node_distance_m?: number
  supported_protocols?: string[]
}

/** Unknown capability types are preserved but only carry `type` at the type level. */
export interface UnknownCapability {
  type: OpenEnum<never>
  [key: string]: unknown
}

export type CapabilityBlock =
  | DisplayCapability
  | ComputeCapability
  | NetworkSwitchCapability
  | LedProcessorCapability
  | AudioIOCapability
  | IntercomCapability
  | UnknownCapability

// ─── Protocols / control / provenance ────────────────────────────────────────

export interface Protocol {
  name: string
  version?: string
  transport?: "udp" | "tcp" | "udp-tcp" | "serial" | "usb" | "bluetooth" | "proprietary"
  port_number?: number
  universe_count?: number
  channel_count?: number
  notes?: string
}

export interface ControlCapabilities {
  web_ui?: boolean
  rest_api?: boolean
  snmp?: boolean
  dante_controller?: boolean
  rdm_addressable?: boolean
  nfc?: boolean
  companion_software?: { name: string; platform?: string[]; url?: string }[]
  custom_commands?: {
    action: string
    command: string
    transport?: "rs232" | "rs485" | "tcp" | "udp"
    baud_rate?: number
    notes?: string
  }[]
}

export interface DataSource {
  url: string
  type: string
  title?: string
  version?: string
  date?: string
  retrieved_date?: string
  page_ref?: string
  fields_sourced?: string[]
  notes?: string
}

export interface ProfileMeta {
  created_at?: string
  updated_at?: string
  created_by?: string
  source?: "manufacturer" | "community" | "automated"
  verified?: boolean
  license?: string
  cla_signed?: boolean
  verification_method?: string
  confidence?: "high" | "medium" | "low"
  last_verified_against_version?: string
}

export interface CardSlot {
  id: string
  label: string
  slot_type?: string
  accepts_card_ids?: string[]
  installed_card?: InstalledCard | null
  required?: boolean
  redundant_pair?: string
}

export interface InstalledCard {
  manufacturer: string
  model: string
  model_variant?: string
  part_number?: string
  description?: string
  datasheet_url?: string
  ports?: Port[]
  capabilities?: CapabilityBlock[]
  protocols?: Protocol[]
  notes?: string
  sources?: DataSource[]
}

export interface RelatedDevice {
  relationship: string
  manufacturer: string
  model: string
  model_variant?: string
  part_number?: string
  required_for_operation?: boolean
  conduit_profile_url?: string
  notes?: string
}

// ─── The device profile ──────────────────────────────────────────────────────

export interface ConduitDevice {
  schema_version: "conduit/v1" | "conduit/v1-draft" | (string & {})
  manufacturer: string
  model: string
  model_variant?: string
  category: DeviceCategory
  subcategory?: string
  description?: string
  form_factor?: FormFactor
  dimensions?: Dimensions
  weight_kg?: number
  rack_units?: number
  environment?: EnvironmentalSpec
  reliability?: ReliabilitySpec
  power?: PowerRequirements
  ports: Port[]
  operational_modes?: OperationalMode[]
  capabilities?: CapabilityBlock[]
  protocols?: Protocol[]
  control?: ControlCapabilities
  firmware?: string
  datasheet_url?: string
  manual_url?: string
  gdtf_fixture_type?: string | null
  mvr_class?: string | null
  tags?: string[]
  notes?: string
  profile_meta?: ProfileMeta
  extensions?: Record<string, unknown>
  slots?: CardSlot[]
  related_devices?: RelatedDevice[]
  sources?: DataSource[]
}

// ─── App-side identity ───────────────────────────────────────────────────────
// The standard has no `id`. We derive a stable slug from manufacturer/model/variant
// (matching the repo's file path convention) so the app can key devices.

/** A device paired with the stable id the app uses to reference it. */
export interface DeviceEntry {
  /** e.g. "optoma/zu607t" — the repo path minus `exports/devices/` and `.json`. */
  id: string
  device: ConduitDevice
}
