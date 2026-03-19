import { useMemo } from "react"
import { BufferGeometry, Float32BufferAttribute, DoubleSide, Vector3 } from "three"
import { Line, Html } from "@react-three/drei"
import type { DeviceNode } from "../../types/canvas"
import type { DevicePlacement, RoomConfig3D } from "../../types/spatial"
import { useUIStore } from "../../store/uiStore"
import {
  computeTessellatedFootprint,
  computeThrowEnvelope,
} from "../../utils/projectorUtils"

/** Walk the grid edges to produce a closed perimeter polyline. */
function buildPerimeter(
  gridVertices: (Vector3 | null)[][],
  rows: number,
  cols: number
): [number, number, number][] {
  const pts: [number, number, number][] = []
  // Bottom: row 0, left → right
  for (let col = 0; col <= cols; col++) {
    const v = gridVertices[0][col]
    if (v) pts.push(v.toArray() as [number, number, number])
  }
  // Right: col = cols, bottom → top
  for (let row = 1; row <= rows; row++) {
    const v = gridVertices[row][cols]
    if (v) pts.push(v.toArray() as [number, number, number])
  }
  // Top: row = rows, right → left
  for (let col = cols - 1; col >= 0; col--) {
    const v = gridVertices[rows][col]
    if (v) pts.push(v.toArray() as [number, number, number])
  }
  // Left: col = 0, top → bottom
  for (let row = rows - 1; row > 0; row--) {
    const v = gridVertices[row][0]
    if (v) pts.push(v.toArray() as [number, number, number])
  }
  // Close
  if (pts.length > 0) pts.push(pts[0])
  return pts
}

interface Props {
  node: DeviceNode
  placement: DevicePlacement
  room: RoomConfig3D
}

export function ProjectorThrow({ node, placement, room }: Props) {
  const theme = useUIStore((s) => s.theme)
  // Tessellated primary footprint — each grid ray finds its own surface
  const tess = useMemo(
    () => computeTessellatedFootprint(node, placement, room),
    [node, placement, room]
  )

  // Zoom envelope outlines (flat rectangles — conceptual bounds only)
  const envelope = useMemo(
    () => computeThrowEnvelope(node, placement, room),
    [node, placement, room]
  )

  // Build BufferGeometry from tessellated positions
  const geo = useMemo(() => {
    if (!tess) return null
    const g = new BufferGeometry()
    g.setAttribute("position", new Float32BufferAttribute(tess.positions, 3))
    g.setAttribute("uv", new Float32BufferAttribute(tess.uvs, 2))
    g.computeVertexNormals()
    return g
  }, [tess])

  if (!tess || !geo) return null

  const { gridVertices, gridRows, gridCols, apex, imgW, imgH, throwDist, centre } = tess

  // Perimeter follows the actual tessellated grid edges (wraps around surfaces)
  const perimeterPts = buildPerimeter(gridVertices, gridRows, gridCols)

  // Frustum cone lines: apex → actual corner ray hits
  const cornerHits = [
    gridVertices[0][0],                // BL
    gridVertices[0][gridCols],          // BR
    gridVertices[gridRows][gridCols],   // TR
    gridVertices[gridRows][0],          // TL
  ].filter(Boolean) as Vector3[]

  const frustumLines = cornerHits.map((c) => [
    apex.toArray() as [number, number, number],
    c.toArray() as [number, number, number],
  ])

  return (
    <group>
      {/* ── Zoom envelope — wide end (throw_ratio_min, blue) ──────────────── */}
      {envelope.maxZoom && (() => {
        const ec = envelope.maxZoom.corners
        const pts: [number, number, number][] = [
          ...ec.map((c) => c.toArray() as [number, number, number]),
          ec[0].toArray() as [number, number, number],
        ]
        return (
          <Line points={pts} color="#60A5FA" lineWidth={1} opacity={0.3}
            transparent dashed dashSize={0.2} gapSize={0.1} />
        )
      })()}

      {/* ── Zoom envelope — tele end (throw_ratio_max, purple) ────────────── */}
      {envelope.minZoom && (() => {
        const ec = envelope.minZoom.corners
        const pts: [number, number, number][] = [
          ...ec.map((c) => c.toArray() as [number, number, number]),
          ec[0].toArray() as [number, number, number],
        ]
        return (
          <Line points={pts} color="#A78BFA" lineWidth={1} opacity={0.3}
            transparent dashed dashSize={0.2} gapSize={0.1} />
        )
      })()}

      {/* ── Tessellated footprint mesh — folds across walls/floor/ceiling ─── */}
      <mesh geometry={geo}>
        <meshBasicMaterial
          color="#F59E0B"
          opacity={0.13}
          transparent
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>

      {/* Perimeter outline — follows actual surface intersections */}
      {perimeterPts.length > 1 && (
        <Line
          points={perimeterPts}
          color="#F59E0B"
          lineWidth={1.5}
          opacity={0.65}
          transparent
        />
      )}

      {/* Frustum cone lines */}
      {frustumLines.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color="#F59E0B"
          lineWidth={0.8}
          opacity={0.25}
          transparent
          dashed
          dashSize={0.3}
          gapSize={0.15}
        />
      ))}

      {/* Info label */}
      <Html
        position={centre.toArray()}
        center
        distanceFactor={14}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: theme === "light" ? "#D97706" : "#F59E0B",
            background: theme === "light" ? "rgba(255,255,255,0.85)" : "rgba(10,10,11,0.82)",
            padding: "2px 6px",
            border: "1px solid #F59E0B40",
            whiteSpace: "nowrap",
            lineHeight: 1.5,
          }}
        >
          <div>{imgW.toFixed(2)}m × {imgH.toFixed(2)}m</div>
          <div style={{ opacity: 0.6 }}>{throwDist.toFixed(1)}m throw</div>
          {tess.isMultiSurface && (
            <div style={{ opacity: 0.5, fontSize: 9 }}>
              {tess.surfaces.join(" + ")}
            </div>
          )}
          {(envelope.minZoom || envelope.maxZoom) && (
            <div style={{ opacity: 0.45, fontSize: 9, marginTop: 1 }}>
              {envelope.maxZoom && `▮ ${envelope.maxZoom.imgW.toFixed(1)}m`}
              {envelope.minZoom && envelope.maxZoom && " — "}
              {envelope.minZoom && `${envelope.minZoom.imgW.toFixed(1)}m ▮`}
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}
