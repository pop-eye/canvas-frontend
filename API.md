# CONDUIT Scraper — API Reference

Live base URL: `https://canvas-data-scraping-production.up.railway.app`

Use this as the data source for the CONDUIT frontend application.
Set `CONDUIT_API_BASE=https://canvas-data-scraping-production.up.railway.app` in the frontend's environment.

CORS is open to all origins by default. To restrict it, set the `CORS_ORIGINS` env var on Railway
to a comma-separated list of allowed origins, e.g. `https://conduit.app,https://staging.conduit.app`.

---

## Endpoints

### List equipment
```
GET /api/equipment
```
Returns all records, newest first. Supports query params:

| Param | Type | Example |
|---|---|---|
| `category` | string | `?category=projection` |
| `min_confidence` | float 0–1 | `?min_confidence=0.7` |
| `needs_review` | boolean | `?needs_review=true` |
| `search` | string | `?search=Christie` |

**Response**
```json
{
  "records": [ EquipmentRecord ],
  "total": 42
}
```

---

### Get single record
```
GET /api/equipment/:id
```
Returns one `EquipmentRecord` by UUID, or `404`.

---

### Update record
```
PATCH /api/equipment/:id
Content-Type: application/json

{ "needs_review": false, "name": "Corrected Name" }
```
Metadata is deep-merged. Returns `{ "success": true, "record": EquipmentRecord }`.

---

### Delete record
```
DELETE /api/equipment/:id
```
Returns `{ "success": true }` or `404`.

---

### Database stats
```
GET /api/stats
```
```json
{
  "total": 84,
  "byCategory": { "projection": 22, "display": 18, "audio_amplified": 10 },
  "avgConfidence": 0.87,
  "needsReview": 3
}
```

---

### Trigger a scrape
```
POST /api/scrape
Content-Type: application/json
```
Body — supply either `url` or `query`:
```json
{ "url": "https://example.com/product.pdf", "name": "Boxer 4K30", "manufacturer": "Christie" }
{ "query": "Christie Boxer 4K30", "manufacturer": "Christie" }
```
Returns `{ "success": true, "record": EquipmentRecord }`.

---

### Export
```
GET /api/export/json          — full DB as JSON (with internal fields)
GET /api/export/conduit-json  — clean export (metadata only, no internal fields)
GET /api/export/csv           — flat CSV with core fields
```

---

## EquipmentRecord shape

```ts
{
  id: string            // UUID v4
  name: string
  manufacturer: string
  model: string
  category: EquipmentCategory
  source_url: string
  scraped_at: string    // ISO 8601
  confidence: number    // 0–1
  schema_version: string
  needs_review: boolean

  metadata: {
    power: PowerSpec[]
    connectivity: {
      inputs: ConnectorPort[]
      outputs: ConnectorPort[]
      network: string[]   // e.g. ["RJ45 1GbE", "Wi-Fi 802.11ac"]
      control: string[]   // e.g. ["Art-Net", "sACN", "RS-232"]
    }
    physical: {
      weight_kg: number
      dimensions_mm: { w: number; h: number; d: number }
      rack_units?: number
      rack_depth_mm?: number
      rack_ears_included?: boolean
      form_factor?: "rackmount"|"surface"|"flown"|"truss"|"floor"|"desktop"|"portable"|"touring"
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
    audio?: { frequency_response?; spl_db?; impedance_ohms?; amplifier_class?; channels_in?; channels_out? }
    video?: { resolution?; refresh_rate_hz?; hdr?; colour_space? }
    lighting?: { dmx_channels?; beam_angle_degrees?; cri?; cct_k?; gobo_slots? }
    projection?: ProjectionSpec   // populated for "projection" category
    display?: DisplaySpec         // populated for "display" category
    hdmi_cable?: HdmiCableSpec    // populated for "cable_hdmi" category
    signal_chain?: SignalChainSpec
    notes: string
    raw_text_excerpt: string
  }
}
```

---

## PowerSpec
```ts
{
  draw_watts: number
  draw_watts_max?: number
  voltage: string           // e.g. "100-240V"
  frequency_hz?: string     // e.g. "50-60Hz"
  connector_type: string    // e.g. "IEC C19", "NEMA 5-15"
  circuit_required: string  // e.g. "20A"
  label?: string            // e.g. "Main", "Aux" — for multi-circuit devices
  inrush_current_a?: number
  poe_standard?: string     // e.g. "802.3at"
}
```

---

## ConnectorPort
```ts
{
  protocol: string          // "HDMI" | "SDI" | "XLR" | "DMX" | "Dante" | "DisplayPort" | ...
  version?: string          // e.g. "2.0", "3G"
  quantity: number
  connector?: string        // physical form: "HDMI-A", "BNC", "XLR-F", "RJ45"
  signal_type: "video"|"audio"|"av"|"data"|"power"|"control"|"other"

  // ── Virtual panel rendering fields ───────────────────────────
  panel_side?: "front"|"rear"|"top"|"bottom"
  position_index?: number   // left-to-right slot order (0-based) on that panel face
  label?: string            // panel-printed label e.g. "INPUT 1", "SDI OUT A"

  // ── Signal quality / compatibility ───────────────────────────
  hdcp_version?: string
  edid_management?: "pass-through"|"emulate"|"override"
  max_cable_distance_m?: number
  latency_ms?: number
  sample_rates_hz?: number[]
  bit_depths?: number[]
}
```

> `panel_side` + `position_index` + `label` are the key fields for drawing virtual front/rear panels.
> Iterate `inputs` and `outputs`, group by `panel_side`, sort by `position_index`.

---

## SignalChainSpec (key fields)
```ts
{
  // Matrix routing
  is_matrix_router?: boolean
  matrix_inputs?: number
  matrix_outputs?: number
  routing_any_to_any?: boolean

  // Daisy chain
  daisy_chainable?: boolean
  daisy_chain_max_units?: number

  // Dante / AVoIP
  dante_enabled?: boolean
  dante_channels?: number
  dante_latency_ms_options?: number[]

  // PoE
  poe_powered?: boolean
  poe_provides?: boolean
  poe_budget_watts?: number

  // IP control
  ip_control_port?: number
  ip_control_protocol?: "TCP"|"UDP"|"TCP+UDP"
  artnet_universe_default?: number
  sacn_universe_default?: number
  osc_port?: number
}
```

---

## Equipment categories
```
projection        — projectors
display           — monitors, flat panels, LED walls
audio_amplified   — powered speakers, amplifiers
audio_passive     — passive speakers, subwoofers
lighting          — DMX fixtures, LED pars, movers
media_server      — Resolume, disguise, Hippotizer, etc.
networking        — switches, routers, AVoIP devices
power_distribution — PDUs, dimmer racks, distros
rigging           — motors, truss, clamps
sensor_tracking   — tracking systems, cameras
control           — control systems, touch panels, processors
cable_signal      — SDI, Cat, fibre, multicore
cable_hdmi        — HDMI cables (detailed spec)
other
```

---

## Frontend rendering guide

### Virtual rear/front panel
1. `GET /api/equipment/:id`
2. Collect `metadata.connectivity.inputs` + `metadata.connectivity.outputs`
3. Group ports by `panel_side` (front / rear)
4. Within each face, sort by `position_index`
5. Render each port block labelled with `label` and styled by `protocol` / `signal_type`

### Stage plot / rack layout
- Use `physical.form_factor` to determine placement zone (rack, truss, floor, etc.)
- Use `physical.rack_units` + `physical.dimensions_mm` for physical sizing
- Use `physical.rigging_points` + `physical.safe_working_load_kg` for flown fixtures

### Signal flow diagram
- Use `signal_chain.is_matrix_router`, `daisy_chainable`, `dante_enabled`
- Use `signal_chain.format_conversions` to show protocol conversion paths
- Use `signal_chain.ip_control_port` + `ip_control_protocol` to show control network

### Power planning
- Sum `metadata.power[*].draw_watts` across all records in a rig
- Group by `circuit_required` for distro planning
- Use `inrush_current_a` for sequencer ordering
