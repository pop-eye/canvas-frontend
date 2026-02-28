# CONDUIT — Frontend Prototype
### AI Coding Agent Instructions (`CLAUDE.md`)

Read this file fully before writing any code. Work through phases in order.
Confirm each phase is working before moving to the next.
This file is the single source of truth for the project's intent and architecture.

---

## What CONDUIT Is

CONDUIT is a browser-based system design tool for AV and immersive technology installations.
Users build virtual signal systems by dragging equipment from a live database onto a canvas,
connecting ports between devices, and letting the tool surface compatibility issues, power
requirements, and signal flow automatically.

The equipment database is provided by a live API (the CONDUIT Scraper backend).
The frontend consumes that API — it does not have its own database.

**This is the tool that replaces spreadsheets, wall-sketches, and institutional knowledge
for creative technologists designing immersive spaces.**

---

## Live API

```
Base URL: https://canvas-data-scraping-production.up.railway.app
Env var:  VITE_CONDUIT_API_BASE
```

CORS is open. Full API reference is in `API.md` in this repo.

Key endpoints used by this frontend:
- `GET /api/equipment?search=&category=&min_confidence=0.7` — equipment library
- `GET /api/equipment/:id` — full record with port-level detail
- `GET /api/stats` — dashboard stats
- `GET /api/export/conduit-json` — export for offline use

---

## Tech Stack

- **Vite + React + TypeScript** — application framework
- **Tailwind CSS v4** — utility styling (use `@tailwindcss/vite` plugin)
- **@xyflow/react** (React Flow v12) — canvas, nodes, edges, signal connections
- **Zustand** — application state
- **@tanstack/react-query** — API data fetching and caching
- **Framer Motion** — UI animations
- **lucide-react** — iconography

Do not introduce additional major dependencies without a clear reason.

---

## Aesthetic Direction

**Industrial signal infrastructure. The tool should feel like it belongs in a production rack
room or a technical rider — not a consumer SaaS product.**

- Background: near-black `#0A0A0B` with subtle cool-grey panels `#111214`
- Accent: electric teal `#00D4CC` for active/live states, connections, and highlights
- Typography: `JetBrains Mono` for all technical data (port names, values, IDs); `DM Sans` for UI chrome
- Port colours by `signal_type`:
  - `video` → amber `#F59E0B`
  - `audio` → emerald `#10B981`
  - `data` / `network` → blue `#3B82F6`
  - `control` → violet `#8B5CF6`
  - `power` → red `#EF4444`
  - `av` → orange `#F97316`
  - `other` → grey `#6B7280`
- Edges (connections) animate with a slow travelling dash when the rig is "live"
- Grid: fine dot-matrix pattern — technical drawing aesthetic, not graph paper
- Border radius: 2px maximum — panels feel like rack faceplates
- Confidence badges: green ≥ 0.8, amber 0.6–0.79, red < 0.6

---

## Directory Structure

```
conduit-frontend/
  src/
    api/
      client.ts              # axios instance with base URL from env
      equipment.ts           # typed API calls
      types.ts               # re-export from src/types/api.ts
    components/
      layout/
        AppShell.tsx         # three-column layout
        Sidebar.tsx          # collapsible left panel
        Inspector.tsx        # collapsible right panel
      library/
        EquipmentLibrary.tsx # searchable, filterable equipment list
        EquipmentCard.tsx    # draggable library item
        CategoryFilter.tsx   # category pill filters
      canvas/
        ConduitCanvas.tsx    # React Flow wrapper and drop zone
        DeviceNode.tsx       # device node — core visual component
        PortHandle.tsx       # individual port handle on a node
        ConnectionEdge.tsx   # custom styled edge with signal-type colour
        RoomBounds.tsx       # room outline with scale (Phase 5)
      panels/
        DevicePanel.tsx      # virtual rear/front panel view
        PowerSummary.tsx     # aggregate power across all canvas devices
        SignalReport.tsx     # signal types and connections summary
        CompatibilityAlert.tsx
      ui/
        Badge.tsx
        Tooltip.tsx
        SearchInput.tsx
        Toast.tsx
    store/
      canvasStore.ts         # Zustand: nodes, edges, selection, room config
      uiStore.ts             # Zustand: sidebar/inspector open state
    hooks/
      useEquipment.ts        # react-query wrappers
      useCompatibility.ts    # connection validation
    utils/
      portColour.ts          # signal_type → CSS colour string
      powerCalc.ts           # sum watts, group by circuit
      compatibility.ts       # pure compatibility rules engine
    types/
      api.ts                 # full type definitions from API.md
      canvas.ts              # CanvasNode, CanvasEdge types
    App.tsx
    main.tsx
    index.css                # Tailwind + CSS variables + font imports
  .env.example
  .env                       # gitignored
  CLAUDE.md                  # this file
  API.md                     # scraper API reference (copy from scraper repo)
  README.md
  railway.json               # Railway deployment config
  package.json
  vite.config.ts
  tailwind.config.ts
```

---

## Type Definitions

Define these in `src/types/api.ts`, mirroring the API exactly:

```typescript
export type SignalType = "video" | "audio" | "av" | "data" | "power" | "control" | "other"
export type PanelSide = "front" | "rear" | "top" | "bottom"
export type FormFactor =
  | "rackmount" | "surface" | "flown" | "truss"
  | "floor" | "desktop" | "portable" | "touring"

export type EquipmentCategory =
  | "projection" | "display" | "audio_amplified" | "audio_passive"
  | "lighting" | "media_server" | "networking" | "power_distribution"
  | "rigging" | "sensor_tracking" | "control" | "cable_signal" | "cable_hdmi" | "other"

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
      channels_in?: number
      channels_out?: number
    }
    video?: {
      resolution?: string
      refresh_rate_hz?: number
      hdr?: boolean
    }
    lighting?: {
      dmx_channels?: number
      beam_angle_degrees?: number
    }
    signal_chain?: {
      is_matrix_router?: boolean
      matrix_inputs?: number
      matrix_outputs?: number
      dante_enabled?: boolean
      dante_channels?: number
      daisy_chainable?: boolean
      ip_control_port?: number
      ip_control_protocol?: string
      artnet_universe_default?: number
      sacn_universe_default?: number
      osc_port?: number
    }
    notes: string
    raw_text_excerpt: string
  }
}
```

Define canvas types in `src/types/canvas.ts`:

```typescript
import { Node, Edge } from "@xyflow/react"
import { EquipmentRecord } from "./api"

export interface DeviceNodeData extends Record<string, unknown> {
  record: EquipmentRecord
  instanceId: string       // UUID — unique per placement
  label?: string           // user-editable label override
}

export type DeviceNode = Node<DeviceNodeData, "device">

export interface ConnectionEdgeData extends Record<string, unknown> {
  sourcePortId: string     // format: `${protocol}::${index}`
  targetPortId: string
  signalType: string
  compatible: boolean
  warning?: string
}

export type ConnectionEdge = Edge<ConnectionEdgeData, "connection">
```

---

## Phase 1 — Foundation & Equipment Library

**Goal:** App loads, connects to the live API, shows a browsable equipment library.

### Tasks

1. **Scaffold the project**
   ```bash
   npm create vite@latest conduit-frontend -- --template react-ts
   cd conduit-frontend
   npm install @tailwindcss/vite tailwindcss
   npm install framer-motion lucide-react
   npm install axios @tanstack/react-query zustand
   npm install @xyflow/react
   ```

   Configure `vite.config.ts` to use `@tailwindcss/vite`.
   In `src/index.css`, import Tailwind and add `@import url(...)` for both fonts from Google Fonts:
   - `JetBrains Mono` (weights 400, 500)
   - `DM Sans` (weights 400, 500, 600)

   Define CSS variables on `:root`:
   ```css
   :root {
     --bg: #0A0A0B;
     --panel: #111214;
     --border: #1E2025;
     --accent: #00D4CC;
     --text-primary: #E8EAED;
     --text-secondary: #6B7280;
     --signal-video: #F59E0B;
     --signal-audio: #10B981;
     --signal-data: #3B82F6;
     --signal-control: #8B5CF6;
     --signal-power: #EF4444;
     --signal-av: #F97316;
     --signal-other: #6B7280;
   }
   ```

   Set `body { background: var(--bg); color: var(--text-primary); font-family: 'DM Sans', sans-serif; }`

2. **`src/api/client.ts`**
   Axios instance. BaseURL from `import.meta.env.VITE_CONDUIT_API_BASE`. Timeout 10s.
   Log errors in a response interceptor.

3. **`src/api/equipment.ts`**
   ```typescript
   listEquipment(params: { search?: string; category?: string; min_confidence?: number })
   getEquipment(id: string): Promise<EquipmentRecord>
   getStats(): Promise<{ total: number; byCategory: Record<string, number>; avgConfidence: number; needsReview: number }>
   ```

4. **`src/hooks/useEquipment.ts`**
   React Query wrappers. `useEquipmentList` — staleTime 5min. `useEquipment(id)` — enabled only when id is truthy.
   Wrap in a `QueryClientProvider` in `App.tsx`.

5. **`src/components/library/EquipmentLibrary.tsx`**
   - Debounced search input (300ms) — `SearchInput.tsx` component
   - Category filter pills — all 14 categories from the API, "All" resets the filter
   - Confidence toggle: "All" | "Verified (≥ 0.8)"
   - Scrollable list of `EquipmentCard` components, grouped visually by category
   - Loading: skeleton cards (grey animated pulse rectangles, 3 of them)
   - Empty state: message with suggestion to use the Scraper tool

6. **`src/components/library/EquipmentCard.tsx`**
   - Name in DM Sans medium
   - Manufacturer + model in JetBrains Mono 11px, `var(--text-secondary)`
   - Category badge + confidence badge (colour-coded as per spec)
   - Secondary line: weight, form factor, power draw summary if available
   - `needs_review` → amber left border
   - `data-equipment-id={record.id}` for drag identification
   - No drag wiring yet — that comes in Phase 2

7. **`src/components/layout/AppShell.tsx`**
   Three-column layout: left sidebar (320px fixed) | centre canvas (flex-1) | right inspector (0px, expands in Phase 4).
   Centre: placeholder `<div className="flex-1 flex items-center justify-center text-secondary">Canvas — Phase 2</div>`
   Wrap the whole app with `QueryClientProvider`.

8. **`.env.example`**
   ```
   VITE_CONDUIT_API_BASE=https://canvas-data-scraping-production.up.railway.app
   ```

### Phase 1 Done When
- App renders with live data from the scraper API
- Search and category filters work and update the list
- Confidence filter works
- No TypeScript errors, no console errors

---

## Phase 2 — Canvas & Device Nodes

**Goal:** Drag equipment from library to canvas. Devices render as informative, data-driven nodes.

### Tasks

1. **`src/store/canvasStore.ts`** (Zustand)
   ```typescript
   interface CanvasStore {
     nodes: DeviceNode[]
     edges: ConnectionEdge[]
     selectedNodeId: string | null
     addNode: (record: EquipmentRecord, position: XYPosition) => void
     removeNode: (id: string) => void
     selectNode: (id: string | null) => void
     addEdge: (edge: ConnectionEdge) => void
     removeEdge: (id: string) => void
     onNodesChange: OnNodesChange<DeviceNode>
     onEdgesChange: OnEdgesChange<ConnectionEdge>
     clearCanvas: () => void
   }
   ```
   `addNode` creates a UUID `instanceId`, wraps the record. Persist to `localStorage` key `conduit-canvas-v1`.
   Include a basic undo stack: keep last 20 states, `undo()` action.

2. **Make `EquipmentCard` draggable**
   - Add `draggable` prop
   - `onDragStart`: `e.dataTransfer.setData("equipment-id", record.id)` and `e.dataTransfer.effectAllowed = "copy"`
   - Custom drag image: small label showing device name

3. **`src/components/canvas/ConduitCanvas.tsx`**
   - `ReactFlow` component with `nodeTypes={{ device: DeviceNode }}` and `edgeTypes={{ connection: ConnectionEdge }}`
   - `<Background variant="dots" gap={20} size={1} color="#1E2025" />`
   - `<Controls />` bottom-left, styled dark
   - Handle `onDrop`: get `equipment-id` from `dataTransfer`, call `getEquipment(id)`, then `addNode` with canvas position
   - Handle `onDragOver`: `e.preventDefault(); e.dataTransfer.dropEffect = "copy"`
   - `onNodesChange`, `onEdgesChange`, `onConnect` wired to the Zustand store
   - Keyboard: `Backspace`/`Delete` on selected node calls `removeNode`. `Cmd+Z` calls `undo`.

4. **`src/components/canvas/DeviceNode.tsx`** — the centrepiece component

   Visual structure:
   ```
   ┌──────────────────────────────────────────┐
   │ [icon]  DEVICE NAME              [⋯ ✕]  │  ← header strip (teal left border)
   │         Manufacturer · Model             │
   ├──────────────────────────────────────────┤
   │ INPUTS              │  OUTPUTS           │  ← port zone
   │ ○ HDMI 2.0          │       SDI 3G ○    │
   │ ○ SDI 3G ×2         │      XLR-F ×2 ○  │
   ├──────────────────────────────────────────┤
   │ ⚡ 450W · IEC C19 · 32A dedicated        │  ← power footer
   └──────────────────────────────────────────┘
   ```

   Implementation details:
   - Width: 300px fixed. Height: auto — expands with port count.
   - Header: teal left border (3px) when selected, grey otherwise
   - Category icon: map using lucide-react (Monitor→display, Projector→projection, Volume2→audio, Lightbulb→lighting, Server→media_server, Network→networking, Zap→power_distribution, etc.)
   - Port zone: two columns. Inputs left-aligned with handles on the left edge. Outputs right-aligned with handles on the right edge.
   - Port label: `protocol` + (version if present) + ` ×quantity` if > 1, in JetBrains Mono 10px
   - Power footer: `metadata.power[0]` — watts, connector, circuit. Show "No power data" in grey if empty.
   - `needs_review`: amber left border (override teal) + small ⚠ icon in header
   - Do not truncate port lists — let the node grow vertically

5. **`src/components/canvas/PortHandle.tsx`**
   - Wraps React Flow `<Handle>`
   - Visual: filled circle 10px, coloured by `signal_type` via `portColour.ts`
   - Position: `Position.Left` for inputs, `Position.Right` for outputs
   - Handle ID: `${direction}-${protocol}-${index}` (e.g. `input-HDMI-0`)
   - Tooltip on hover: full port data — connector, version, cable distance, latency

6. **`src/utils/portColour.ts`**
   ```typescript
   export function portColour(signalType: SignalType): string {
     const map: Record<SignalType, string> = {
       video: "var(--signal-video)",
       audio: "var(--signal-audio)",
       data: "var(--signal-data)",
       control: "var(--signal-control)",
       power: "var(--signal-power)",
       av: "var(--signal-av)",
       other: "var(--signal-other)",
     }
     return map[signalType] ?? map.other
   }
   ```

7. **`src/components/canvas/ConnectionEdge.tsx`**
   - Custom SVG edge, stroke colour from `signalType` via `portColour`
   - Default: 2px dashed line
   - `compatible === false`: red, with a ⚠ midpoint icon
   - `warning` present: amber
   - Selected: 3px solid
   - SVG `strokeDasharray` animation (slow travelling dash — CSS `@keyframes`)

### Phase 2 Done When
- Devices can be dragged from library to canvas
- `DeviceNode` renders with live port data for each device
- Nodes reposition freely, deleteable with Backspace
- Canvas state persists to localStorage
- Undo works for node additions

---

## Phase 3 — Port Connections & Compatibility Engine

**Goal:** Users draw wires between ports. The tool validates and flags incompatibilities.

### Tasks

1. **Enable React Flow connections in `ConduitCanvas.tsx`**
   - `connectionMode="loose"` — allow connecting any handle to any compatible handle
   - `onConnect(params)`: run `checkCompatibility` before calling `addEdge`
   - If incompatible: do not create edge, show a toast with the reason
   - If compatible with warning: create edge with `warning` set, show amber toast
   - Only allow output → input connections (guard in `onConnect`)

2. **`src/utils/compatibility.ts`** — pure, testable rules engine

   ```typescript
   interface CompatibilityResult {
     compatible: boolean
     reason?: string
     warning?: string
   }

   function checkCompatibility(
     source: ConnectorPort,
     target: ConnectorPort
   ): CompatibilityResult
   ```

   Implement these rules in order:

   | Rule | Result |
   |---|---|
   | Same `signal_type`, same `protocol` | compatible |
   | `signal_type` mismatch (video→audio etc.) | incompatible — "Cannot connect [type] to [type]" |
   | Protocol mismatch within same type | incompatible — "Requires a [source]→[target] converter" |
   | HDMI version downgrade (2.0→1.4) | compatible + warning "Signal downgraded to HDMI 1.4" |
   | SDI rate mismatch (3G→HD) | compatible + warning "Signal will be rate-converted" |
   | Dante→Dante | compatible |
   | Dante→analogue | incompatible — "Dante requires a Dante-to-analogue converter" |
   | Art-Net universe conflict | compatible + warning "Both devices default to universe [N]" |
   | sACN universe conflict | compatible + warning |
   | output→output or input→input | incompatible — "Cannot connect two outputs / two inputs" |

   The rule table should be data-driven (an array of rule objects) not a chain of if-statements.
   Add new rules by appending to the array, not modifying existing logic.

3. **`src/hooks/useCompatibility.ts`**
   - Returns `validateConnection(sourceHandle, targetHandle, nodes): CompatibilityResult`
   - Resolves the actual `ConnectorPort` objects from node data before calling `checkCompatibility`

4. **Incompatibility UX**
   - Failed connection: flash the source port handle red for 1.5s (CSS class toggle)
   - Show a `Toast` component with the `reason` — bottom-centre, auto-dismiss 4s
   - `Toast.tsx`: minimal dark pill, icon + message, slide-up animation

5. **`src/components/panels/CompatibilityAlert.tsx`**
   - Renders in the Inspector panel (Phase 4) or as a floating panel bottom-right
   - Lists all edges where `compatible === false` or `warning` is set
   - Groups: Errors | Warnings
   - Each entry: source device → target device · port pair · reason/warning text

6. **Keyboard shortcuts**
   - `Backspace`/`Delete` → remove selected node or edge
   - `Escape` → deselect all
   - `Cmd/Ctrl+Z` → undo

### Phase 3 Done When
- Connections can be drawn between compatible ports
- Incompatible connections are blocked with a clear reason
- Warning connections are allowed but visually distinct (amber edge)
- Compatibility alert panel lists all current issues
- Undo works for connections too

---

## Phase 4 — Inspector Panel & Device Detail

**Goal:** Selecting a device opens a rich data panel. Virtual front/rear panel renders from live port data.

### Tasks

1. **`src/store/uiStore.ts`**
   ```typescript
   interface UIStore {
     inspectorOpen: boolean
     inspectorTab: "panel" | "specs" | "power" | "connections"
     sidebarOpen: boolean
     setInspectorTab: (tab) => void
     openInspector: () => void
     closeInspector: () => void
   }
   ```

2. **`src/components/layout/Inspector.tsx`**
   - Framer Motion `AnimatePresence` slide-in from right when `selectedNodeId` is set
   - Width: 360px
   - Header: device name, manufacturer, confidence badge, "View datasheet ↗" link (`source_url`)
   - Tabs: Panel View | Specs | Power | Connections
   - Tab content swaps with a subtle fade

3. **`src/components/panels/DevicePanel.tsx`** — virtual device panel view

   This is the most technically interesting component. It renders the physical port layout.

   Algorithm:
   1. Collect `metadata.connectivity.inputs` + `metadata.connectivity.outputs`
   2. Group by `panel_side`. If `panel_side` is undefined, group as "Other"
   3. Within each face, sort by `position_index` ascending
   4. For each face: render a horizontal row of port blocks left-to-right
   5. Port block: a rectangle, width proportional to quantity, coloured by `signal_type`, labelled with `label` (or `protocol`)
   6. Input ports: left-aligned label, handle indicator on left
   7. Output ports: right-aligned label, handle indicator on right
   8. Face label: "REAR" | "FRONT" in JetBrains Mono, small caps, above the panel row
   9. Hover on any port: show full `ConnectorPort` detail as a tooltip
   10. Clicking a port: highlight the corresponding `PortHandle` on the canvas DeviceNode

   The panel should look like a technical diagram of a real device's back panel — not a generic UI card.

4. **Specs tab**
   - Structured key/value layout, all values in JetBrains Mono
   - Collapsible `<details>` sections per metadata group: Power | Physical | Environment | Audio | Video | Lighting | Signal Chain
   - Each section only renders if data is present
   - Physical: weight, dimensions, form factor, mounting, rack units, IP rating
   - "Raw text excerpt" section at the bottom in a `<pre>` block — for transparency/audit

5. **`src/components/panels/PowerSummary.tsx`** (Power tab)
   - Lists every node on the canvas: name + total watts + circuit type
   - Grand total: sum of all `metadata.power[*].draw_watts` across all nodes
   - Grouped by `circuit_required`: how many devices per circuit type
   - Visual bar per circuit group: fill colour transitions from green → amber → red as load approaches and exceeds 3000W (13A UK limit) or 4600W (20A limit)
   - Flag any individual device exceeding 3000W in red

6. **Connections tab**
   - List all edges connected to the selected node
   - Each: other device name · port pair · signal type badge · compatible/warning/error status

### Phase 4 Done When
- Clicking a canvas node opens the Inspector
- Virtual panel view renders from live API port data with correct layout
- Specs tab shows all populated metadata sections
- Power summary reflects actual canvas contents and updates live

---

## Phase 5 — Room Context, Persistence, Export & Railway Deploy

**Goal:** Add spatial context, rig save/load, summary export, and deploy publicly on Railway.

### Tasks

1. **Room configuration**
   - On first load (or "New Rig" action): modal to set venue name, room width × depth in metres
   - Store in `canvasStore.roomConfig: { name: string; width_m: number; depth_m: number }`
   - `RoomBounds.tsx`: a React Flow background node (non-interactive) rendering a dashed rectangle
     representing the room footprint at 1 grid square = 1m²
   - Scale indicator bottom-right of canvas: "1 □ = 1m²  |  Venue: {name}  |  {W}m × {D}m"

2. **Device footprint scaling**
   - `DeviceNode` width/height loosely scale to `physical.dimensions_mm` relative to room scale
   - Minimum: 280px × 80px. Scale factor: apply only when dimensions are available.
   - Floor-mounted and truss devices scale more aggressively than rack devices

3. **Rig persistence**
   - Auto-save to `localStorage` on every state change (already in Phase 2 — verify it works)
   - "Save Rig" button: serialise `canvasStore` state → JSON → download as `{venue-name}.conduit`
   - "Load Rig" button: `<input type="file" accept=".conduit">`, parse JSON, restore store
   - Validate the loaded file against a Zod schema before restoring — reject invalid files with a toast

4. **Summary export**
   - "Export Report" button in toolbar
   - Opens a `<div id="print-report">` overlay rendering:
     - Rig name, date, venue dimensions
     - Device list: name, manufacturer, category, total power draw
     - Power requirements grouped by circuit type
     - All active connections: source device → target device · signal type · status
     - All warnings and errors
   - `print-report` has a `@media print` stylesheet: white background, no canvas, clean typography
   - "Print / Save as PDF" button triggers `window.print()`

5. **Railway deployment**

   Create `railway.json`:
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm run preview -- --host 0.0.0.0 --port $PORT",
       "healthcheckPath": "/"
     }
   }
   ```

   Update `vite.config.ts`:
   ```typescript
   import { defineConfig } from "vite"
   import react from "@vitejs/plugin-react"
   import tailwindcss from "@tailwindcss/vite"

   export default defineConfig({
     plugins: [react(), tailwindcss()],
     preview: {
       port: parseInt(process.env.PORT ?? "4173"),
       host: true,
     },
   })
   ```

   `package.json` scripts:
   ```json
   {
     "dev": "vite",
     "build": "vite build",
     "preview": "vite preview"
   }
   ```

   Environment variable to configure in Railway dashboard:
   ```
   VITE_CONDUIT_API_BASE=https://canvas-data-scraping-production.up.railway.app
   ```

   **Important**: Vite env vars must be prefixed `VITE_` to be available in the browser bundle.
   Railway injects this at build time — the build command must run with the var set.
   In Railway: set the variable, then trigger a redeploy to pick it up.

6. **README.md**
   ```markdown
   # CONDUIT

   AV system design tool. Drag equipment onto a canvas, connect signal ports, plan your rig.

   ## Local development
   cp .env.example .env
   npm install
   npm run dev

   ## Deploy to Railway
   1. Push repo to GitHub
   2. railway.app → New Project → Deploy from GitHub
   3. Add env var: VITE_CONDUIT_API_BASE=https://canvas-data-scraping-production.up.railway.app
   4. Trigger deploy — Railway runs `npm run build` then `npm run preview`
   5. Add a custom domain in Railway Settings if needed

   ## Extending
   - New compatibility rule: src/utils/compatibility.ts (add to rule array)
   - New signal type colour: src/utils/portColour.ts + src/index.css
   - New inspector tab: src/components/layout/Inspector.tsx
   - New equipment category icon: DeviceNode.tsx category icon map
   ```

### Phase 5 Done When
- Room outline renders with correct scale
- Rigs save and load from `.conduit` files
- Print report generates a clean, accurate summary
- App is live on Railway at a public URL

---

## Guiding Principles

**Data drives the visuals** — every rendered port, power figure, and compatibility check comes
from the live API. Never hardcode device specifications.

**Compatibility over permissiveness** — the tool should resist invalid connections. A wrong
connection in a real system costs time and money. Make the right path obvious and the wrong
path visible.

**Technical language throughout** — this is a professional tool. Use "IEC C13", not "power cable".
Use "sACN Universe 1", not "lighting protocol". The vocabulary builds credibility with users
who know the domain.

**One source of truth** — Zustand is the store. React Flow's internal state is kept in sync
via `onNodesChange`/`onEdgesChange`. They must never diverge.

**Extend through data, not code** — new rules, new categories, new protocols should extend
arrays and maps, not require new conditionals. The compatibility engine and port colour map
are the canonical examples of this pattern.

---

## Extension Points Reference

| Feature to add | File to modify |
|---|---|
| New signal type and colour | `src/utils/portColour.ts` + `src/index.css` |
| New compatibility rule | `src/utils/compatibility.ts` — append to rules array |
| New category icon | `src/components/canvas/DeviceNode.tsx` — icon map |
| New Inspector tab | `src/components/layout/Inspector.tsx` + new panel component |
| New export format | New component under `src/components/panels/` + route in export logic |
| Canvas annotation tool | Add toolbar button + handler in `ConduitCanvas.tsx` |
| Multi-user / shared rigs | Replace localStorage persistence with a backend sync layer |
