# CONDUIT — Phase 6: 3D Spatial View
### Addendum to `CLAUDE.md`

Add this phase after Phase 5 is complete and deployed.
Do not start Phase 6 until the 2D canvas (Phases 1–5) is stable.

---

## What This Phase Does

Adds a **3D spatial view** alongside the existing 2D signal-flow canvas.
Users can switch between views. The same Zustand store (`canvasStore`) drives both.

**2D canvas** = signal flow and connectivity. Wires, ports, protocol logic.
**3D view** = physical space. Where does each device actually live in the room?
Projectors on the ceiling. Speakers on truss. Screens on the floor. Media servers in a rack.

Both views are synced — placing a device in 3D updates the 2D canvas and vice versa.

---

## Additional Dependencies

```bash
npm install three @react-three/fiber @react-three/drei
npm install @react-three/rapier        # optional — physics for future use, skip for now
```

Do not use `@types/three` separately — Three.js ships its own types.

---

## New Directory Structure

Add the following to the existing `src/` tree:

```
src/
  components/
    viewport3d/
      Viewport3D.tsx           # R3F Canvas wrapper — the 3D scene root
      Scene.tsx                # camera, lighting, environment, room
      RoomVolume.tsx           # the room box: floor, walls (optional), grid
      DeviceMesh.tsx           # 3D representation of a placed device
      DeviceMeshByCategory.tsx # maps category → geometry + material
      CameraRig.tsx            # orbit controls + preset views
      PortIndicator3D.tsx      # small coloured sphere on device face showing ports
      SelectionOutline.tsx     # post-processing outline on selected device
      ShadowFloor.tsx          # contact shadow plane for floating devices
    layout/
      ViewToggle.tsx           # 2D / 3D toggle button in the toolbar (add to AppShell)
  hooks/
    use3DSync.ts               # keeps 3D positions synced to canvasStore
    useDeviceMesh.ts           # derives geometry/size from EquipmentRecord metadata
  utils/
    deviceGeometry.ts          # maps form_factor + dimensions_mm → Three.js geometry params
    categoryMaterial.ts        # maps category → material colour / finish
  types/
    spatial.ts                 # Position3D, DevicePlacement, RoomConfig3D
```

---

## New Types (`src/types/spatial.ts`)

```typescript
export interface Position3D {
  x: number   // metres from room origin
  y: number   // height (0 = floor)
  z: number   // depth from front wall
}

export interface DevicePlacement {
  instanceId: string        // matches DeviceNodeData.instanceId
  position3d: Position3D
  rotation: { x: number; y: number; z: number }  // radians
  mounted: MountPosition
}

export type MountPosition =
  | "floor"
  | "rack"          // in a rack unit, Y = rack bottom height
  | "truss"         // hanging from truss, Y = truss height
  | "ceiling"       // ceiling-mounted, Y = ceiling height
  | "wall-front"
  | "wall-rear"
  | "wall-left"
  | "wall-right"
  | "table"
  | "freestanding"

export interface RoomConfig3D {
  width_m: number
  depth_m: number
  height_m: number        // ceiling height — default 5m if not set
  venueName: string
}
```

---

## Store Changes (`src/store/canvasStore.ts`)

Extend the existing Zustand store — do not replace it:

```typescript
// Add to CanvasStore interface:
placements: Record<string, DevicePlacement>   // keyed by instanceId
roomConfig3D: RoomConfig3D

// Add actions:
setPlacement: (instanceId: string, placement: Partial<DevicePlacement>) => void
setRoomConfig3D: (config: Partial<RoomConfig3D>) => void
initPlacement: (instanceId: string, record: EquipmentRecord) => void
```

`initPlacement` is called when a node is added to the canvas (in the existing `addNode` action).
It creates a default `DevicePlacement` based on the device's `form_factor`:

| form_factor | Default position | Default mount |
|---|---|---|
| `rackmount` | x=centre, y=0.8 (rack bottom), z=rear wall -0.5m | `rack` |
| `flown` / `truss` | x=centre, y=room_height-0.5, z=centre | `truss` |
| `floor` / `surface` | x=centre, y=0, z=centre | `floor` |
| `desktop` | x=0.5, y=0.9 (table height), z=0.5 | `table` |
| `portable` | x=0, y=0, z=0 (room origin) | `freestanding` |
| default | x=0, y=0, z=0 | `floor` |

---

## View Toggle

Add to `AppShell.tsx` toolbar (top bar, right side):

```tsx
// ViewToggle.tsx
type ViewMode = "2d" | "3d" | "split"

// Three buttons: [2D] [Split] [3D]
// Store active mode in uiStore
// "split" renders both side-by-side at 50% width each
```

Add `viewMode: ViewMode` and `setViewMode` to `uiStore.ts`.

In `AppShell.tsx`, conditionally render:
- `viewMode === "2d"` → existing `ConduitCanvas` only
- `viewMode === "3d"` → `Viewport3D` only
- `viewMode === "split"` → both side by side (wrap in a flex row, each `width: 50%`)

---

## Core Component: `Viewport3D.tsx`

The R3F canvas root. Keep this thin — delegate to child components.

```tsx
import { Canvas } from "@react-three/fiber"
import { Scene } from "./Scene"

export function Viewport3D() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 8, 12], fov: 50 }}
      style={{ background: "#0A0A0B" }}
      gl={{ antialias: true, alpha: false }}
    >
      <Scene />
    </Canvas>
  )
}
```

---

## Core Component: `Scene.tsx`

Assembles the 3D world. Reads from `canvasStore`.

```tsx
import { OrbitControls, ContactShadows, Grid } from "@react-three/drei"
import { useCanvasStore } from "../../store/canvasStore"
import { RoomVolume } from "./RoomVolume"
import { DeviceMesh } from "./DeviceMesh"
import { CameraRig } from "./CameraRig"

export function Scene() {
  const { nodes, placements, roomConfig3D } = useCanvasStore()

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, roomConfig3D.height_m, 0]} intensity={0.3} color="#00D4CC" />

      {/* Environment */}
      <RoomVolume config={roomConfig3D} />
      <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={40} blur={2} />

      {/* Devices */}
      {nodes.map((node) => {
        const placement = placements[node.data.instanceId]
        if (!placement) return null
        return (
          <DeviceMesh
            key={node.data.instanceId}
            node={node}
            placement={placement}
          />
        )
      })}

      {/* Camera */}
      <CameraRig roomConfig={roomConfig3D} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
    </>
  )
}
```

---

## Core Component: `RoomVolume.tsx`

Renders the physical space.

```tsx
// Floor: semi-transparent grid plane
// Ceiling: very faint plane, opacity ~0.05
// Walls: optional ghost planes, opacity ~0.05
// Scale grid: one unit = one metre

// Use @react-three/drei <Grid> for the floor grid:
<Grid
  position={[width/2, 0, depth/2]}
  args={[width, depth]}
  cellSize={1}
  cellThickness={0.5}
  cellColor="#1E2025"
  sectionSize={5}
  sectionThickness={1}
  sectionColor="#2A2D35"
  fadeDistance={80}
  fadeStrength={1}
  infiniteGrid={false}
/>

// Room outline: <lineSegments> or <Box> wireframe
// Teal dashed lines marking the room perimeter at floor level
```

---

## Core Component: `DeviceMesh.tsx`

The 3D representation of a device. Selection, dragging, and labels all live here.

```tsx
import { useRef, useState } from "react"
import { ThreeEvent } from "@react-three/fiber"
import { Html, useCursor } from "@react-three/drei"
import { DeviceMeshByCategory } from "./DeviceMeshByCategory"
import { PortIndicator3D } from "./PortIndicator3D"
import { useCanvasStore } from "../../store/canvasStore"

export function DeviceMesh({ node, placement }) {
  const { selectNode, selectedNodeId, setPlacement } = useCanvasStore()
  const isSelected = selectedNodeId === node.id
  const [hovered, setHovered] = useState(false)

  useCursor(hovered)

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    selectNode(node.id)
  }

  // Drag to reposition on floor plane using @react-three/drei <DragControls>
  // Only allow Y-axis drag for truss/flown devices (height adjust)
  // Only allow XZ-plane drag for floor/surface devices

  const { x, y, z } = placement.position3d

  return (
    <group
      position={[x, y, z]}
      rotation={[placement.rotation.x, placement.rotation.y, placement.rotation.z]}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Geometry based on category/form_factor */}
      <DeviceMeshByCategory
        record={node.data.record}
        isSelected={isSelected}
        hovered={hovered}
      />

      {/* Port indicators */}
      <PortIndicator3D record={node.data.record} />

      {/* Device label — HTML overlay via @react-three/drei Html */}
      {(hovered || isSelected) && (
        <Html center distanceFactor={10} style={{ pointerEvents: "none" }}>
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: "#E8EAED",
            background: "rgba(10,10,11,0.85)",
            padding: "3px 7px",
            borderLeft: "2px solid #00D4CC",
            whiteSpace: "nowrap"
          }}>
            {node.data.record.name}
          </div>
        </Html>
      )}
    </group>
  )
}
```

---

## Core Component: `DeviceMeshByCategory.tsx`

Maps each device category and `form_factor` to appropriate 3D geometry.
This is a lookup table, not a chain of if-statements.

```typescript
// Geometry map — derive size from physical.dimensions_mm where available,
// fall back to category defaults

const CATEGORY_GEOMETRY: Record<EquipmentCategory, CategoryGeoConfig> = {
  projection: {
    geometry: "box",
    defaultSize: [0.35, 0.15, 0.55],    // W H D in metres
    material: "matte-dark",
    mountHint: "ceiling",
  },
  display: {
    geometry: "flat-panel",             // thin box, wide aspect
    defaultSize: [1.2, 0.7, 0.06],
    material: "screen",
    mountHint: "wall-front",
  },
  audio_amplified: {
    geometry: "box",
    defaultSize: [0.25, 0.25, 0.35],
    material: "matte-dark",
    mountHint: "truss",
  },
  audio_passive: {
    geometry: "box",
    defaultSize: [0.25, 0.4, 0.3],
    material: "matte-dark",
    mountHint: "truss",
  },
  lighting: {
    geometry: "fixture",                // narrow box with a cone/beam indicator
    defaultSize: [0.2, 0.3, 0.2],
    material: "matte-dark",
    mountHint: "truss",
  },
  media_server: {
    geometry: "rackmount-unit",         // flat wide box, rack_units height
    defaultSize: [0.48, 0.044, 0.6],   // 1U default (44mm)
    material: "rack-black",
    mountHint: "rack",
  },
  networking: {
    geometry: "rackmount-unit",
    defaultSize: [0.48, 0.044, 0.35],
    material: "rack-black",
    mountHint: "rack",
  },
  power_distribution: {
    geometry: "rackmount-unit",
    defaultSize: [0.48, 0.088, 0.3],   // 2U
    material: "rack-black",
    mountHint: "rack",
  },
  // ... continue for all categories
}
```

**Size derivation from metadata:**
```typescript
function deriveSize(record: EquipmentRecord, defaults: number[]): [number, number, number] {
  const d = record.metadata.physical.dimensions_mm
  if (d && d.w && d.h && d.d) {
    return [d.w / 1000, d.h / 1000, d.d / 1000]  // mm → metres
  }
  // Rack units override height for rackmount devices
  const ru = record.metadata.physical.rack_units
  if (ru && defaults[1] === 0.044) {
    return [defaults[0], ru * 0.044, defaults[2]]
  }
  return defaults as [number, number, number]
}
```

**Materials:**
```typescript
// matte-dark: MeshStandardMaterial, color #1A1A1F, roughness 0.8, metalness 0.2
// screen: MeshStandardMaterial, color #050505, emissive #00D4CC, emissiveIntensity 0.05
// rack-black: MeshStandardMaterial, color #111214, roughness 0.6, metalness 0.4

// Selected: add emissive #00D4CC, emissiveIntensity 0.15 to whatever material
// Hovered: add emissive #00D4CC, emissiveIntensity 0.07
// needs_review: add emissive #F59E0B, emissiveIntensity 0.1
```

---

## Component: `PortIndicator3D.tsx`

Small coloured spheres on the face of a device mesh indicating where ports are.

```tsx
// For each ConnectorPort in inputs + outputs:
// - Place a sphere of radius 0.02m on the appropriate face (front/rear/side)
// - Colour by signal_type using portColour utility
// - Position by panel_side: rear face → back of the mesh, front → front face
// - position_index → horizontal spacing across the face
// - Hover: Html label with protocol name

// If panel_side data is absent: place all ports on the rear face evenly spaced
```

---

## Component: `CameraRig.tsx`

Preset camera views accessible via keyboard shortcuts or a small HUD.

```typescript
const PRESET_VIEWS = {
  perspective: { position: [room.width/2, room.height*1.2, room.depth+5], target: [room.width/2, 0, room.depth/2] },
  top:         { position: [room.width/2, room.height*3, room.depth/2],   target: [room.width/2, 0, room.depth/2] },
  front:       { position: [room.width/2, room.height/2, room.depth+8],   target: [room.width/2, room.height/2, room.depth/2] },
  rear:        { position: [room.width/2, room.height/2, -5],             target: [room.width/2, room.height/2, room.depth/2] },
}
```

Keyboard shortcuts:
- `1` → perspective view
- `2` → top-down view
- `3` → front of room
- `4` → rear of room
- `F` → frame selected device (move camera to focus on it)

Render a small HUD overlay (absolute-positioned HTML over the canvas) with four view preset buttons.

---

## 3D-Specific Inspector Panel Content

When a device is selected in 3D view, the existing Inspector panel gains a new **Position** tab:

```
Position tab content:
  Mount type: [dropdown — floor / rack / truss / ceiling / wall-front etc.]
  X position:  [number input] m from left wall
  Y position:  [number input] m from floor
  Z position:  [number input] m from front wall
  Rotation Y:  [slider 0–360°]
  [Reset to default position]
```

These inputs directly update `setPlacement` in the store, moving the device in real time.

---

## Beam / Coverage Visualisations

For devices where coverage data is available, optionally render a semi-transparent cone or arc:

```typescript
// Projection devices — throw cone:
// If metadata.environment.throw_ratio and metadata.video.resolution:
//   Calculate throw distance for a given screen size
//   Render a <Cone> geometry from device position toward the floor/wall
//   Semi-transparent amber, opacity 0.08

// Audio devices — coverage arc:
// If metadata.environment.coverage_degrees:
//   Render a <mesh> arc spread from device position
//   Semi-transparent emerald, opacity 0.08

// Lighting devices — beam cone:
// If metadata.lighting.beam_angle_degrees:
//   Render a cone toward the floor
//   Signal-type colour (lighting → use category colour), opacity 0.06
```

These are visual aids only, not physically accurate. Label them "Indicative — not to scale."

---

## Device Placement UI in 3D

Users should be able to **drag devices to reposition** them in 3D space.

Use `@react-three/drei` `<DragControls>`:
- Floor/surface/portable devices: constrain drag to XZ plane (Y locked)
- Rack devices: drag snaps to a "rack zone" (defined as a box near the rear wall)
- Truss/flown/ceiling devices: drag constrained to XZ plane at their current Y height
- Y-axis (height) adjustment: separate handle — a small vertical arrow above the device, drag up/down

On drag end: call `setPlacement(instanceId, { position3d: newPos })`.

---

## Rack View

Rack-mounted devices (`form_factor === "rackmount"`) deserve a special sub-view.

Add a **"Rack"** view tab alongside 2D / 3D in the ViewToggle.

Rack view renders a side-on 2D rack diagram:
- Standard 19" rack outline (482.6mm wide)
- Each rackmount device occupies `rack_units` × 1U height slots
- Devices stacked in the order they were added (user can reorder by drag)
- Port indicators on each faceplate match the panel colours
- Power total for all rack devices shown at bottom
- "Add blank panel" option to fill empty rack slots

This does not require Three.js — it is a pure React/SVG component: `src/components/layout/RackView.tsx`.

---

## Performance Considerations

- R3F renders at 60fps on a `<Canvas>` — keep geometry simple (box primitives, not meshes)
- Avoid re-rendering the entire scene on every store change. Use `useShallow` from Zustand for selectors.
- Large equipment counts (>50 devices): implement frustum culling by default (Three.js does this, but ensure `visible` prop is not set to false inadvertently)
- Dispose of geometries and materials when a device is removed: use R3F's `dispose` pattern
- Shadow maps: limit to `directionalLight.shadow.mapSize = 2048`. No per-device shadow casting until > Phase 6.
- For split view (2D + 3D side-by-side): both canvases share the same Zustand store but render independently. No shared WebGL context needed.

---

## Phase 6 Done When

- Switching to 3D view shows all canvas devices positioned in the room volume
- Devices are correctly sized and shaped based on their metadata
- Devices can be repositioned by dragging in 3D
- Port indicators visible on device meshes, coloured by signal type
- Camera preset views work (keyboard shortcuts + HUD buttons)
- Coverage cones render for projectors and speakers where data is available
- Rack view shows all rack-mounted devices in a 19" rack diagram
- Split view shows 2D and 3D simultaneously, both reflecting the same state
- Selecting a device in either view highlights it in both views

---

## Extension Points Specific to Phase 6

| Feature | File |
|---|---|
| New device geometry for a category | `src/components/viewport3d/DeviceMeshByCategory.tsx` |
| New camera preset | `src/components/viewport3d/CameraRig.tsx` — add to `PRESET_VIEWS` |
| New coverage visualisation type | `src/components/viewport3d/DeviceMesh.tsx` — add conditional render |
| Physics-based cable drape | Add `@react-three/rapier` — create `Cable3D.tsx` |
| Photorealistic renders | Replace MeshStandard with MeshPhysical + HDRI environment map |
| VR/AR preview | Add `@react-three/xr` — the scene structure supports it without changes |
