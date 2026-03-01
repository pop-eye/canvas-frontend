import { useMemo, useRef } from "react"
import { Vector3, BufferGeometry, Float32BufferAttribute } from "three"
import { useFrame } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import type { DeviceNode } from "../../types/canvas"
import type { DevicePlacement, RoomConfig3D } from "../../types/spatial"
import { computeProjectorFootprint } from "../../utils/projectorUtils"

// ─── 2D Sutherland-Hodgman polygon clipping ─────────────────────────────────

type P2 = [number, number]

function cross2D(ax: number, ay: number, bx: number, by: number) {
  return ax * by - ay * bx
}

function insideHalfPlane(
  px: number, py: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number
): boolean {
  return cross2D(p2x - p1x, p2y - p1y, px - p1x, py - p1y) >= 0
}

function intersectEdge(
  ax: number, ay: number, bx: number, by: number,
  p1x: number, p1y: number, p2x: number, p2y: number
): P2 {
  const a1 = p2y - p1y, b1 = p1x - p2x
  const c1 = a1 * p1x + b1 * p1y
  const a2 = by - ay, b2 = ax - bx
  const c2 = a2 * ax + b2 * ay
  const det = a1 * b2 - a2 * b1
  if (Math.abs(det) < 1e-10) return [ax, ay]
  return [(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det]
}

function sutherlandHodgman(subject: P2[], clip: P2[]): P2[] {
  let output = [...subject]
  const n = clip.length
  for (let i = 0; i < n; i++) {
    if (output.length === 0) break
    const [p1x, p1y] = clip[i]
    const [p2x, p2y] = clip[(i + 1) % n]
    const input = output
    output = []
    for (let j = 0; j < input.length; j++) {
      const [ax, ay] = input[j]
      const [bx, by] = input[(j + 1) % input.length]
      const aIn = insideHalfPlane(ax, ay, p1x, p1y, p2x, p2y)
      const bIn = insideHalfPlane(bx, by, p1x, p1y, p2x, p2y)
      if (bIn) {
        if (!aIn) output.push(intersectEdge(ax, ay, bx, by, p1x, p1y, p2x, p2y))
        output.push([bx, by])
      } else if (aIn) {
        output.push(intersectEdge(ax, ay, bx, by, p1x, p1y, p2x, p2y))
      }
    }
  }
  return output
}

// ─── Canonical surface axes for projecting 3D corners to 2D ─────────────────

function canonicalAxes(normal: Vector3): { axis1: Vector3; axis2: Vector3 } {
  const n = normal.clone().normalize()
  if (Math.abs(n.y) > 0.9) {
    return { axis1: new Vector3(1, 0, 0), axis2: new Vector3(0, 0, 1) }
  }
  if (Math.abs(n.x) > 0.9) {
    return { axis1: new Vector3(0, 0, 1), axis2: new Vector3(0, 1, 0) }
  }
  return { axis1: new Vector3(1, 0, 0), axis2: new Vector3(0, 1, 0) }
}

function to2D(p: Vector3, axis1: Vector3, axis2: Vector3, origin: Vector3): P2 {
  const d = p.clone().sub(origin)
  return [d.dot(axis1), d.dot(axis2)]
}

function to3D(p: P2, axis1: Vector3, axis2: Vector3, origin: Vector3, normal: Vector3, offset: number): Vector3 {
  return origin.clone()
    .addScaledVector(axis1, p[0])
    .addScaledVector(axis2, p[1])
    .addScaledVector(normal, offset)
}

// ─── Triangle-fan geometry from convex polygon ───────────────────────────────

function polygonToBufferGeometry(pts: Vector3[]): BufferGeometry | null {
  if (pts.length < 3) return null
  const centroid = new Vector3()
  pts.forEach((p) => centroid.add(p))
  centroid.divideScalar(pts.length)

  const positions: number[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = centroid
    const b = pts[i]
    const c = pts[(i + 1) % pts.length]
    positions.push(a.x, a.y, a.z)
    positions.push(b.x, b.y, b.z)
    positions.push(c.x, c.y, c.z)
  }

  const geo = new BufferGeometry()
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3))
  geo.computeVertexNormals()
  return geo
}

// ─── React component ─────────────────────────────────────────────────────────

interface Props {
  nodes: DeviceNode[]
  placements: Record<string, DevicePlacement>
  room: RoomConfig3D
}

interface OverlapZone {
  geometry: BufferGeometry
  centroid: Vector3
  combinedLumens: number | null
  id: string
}

export function OverlapHighlight({ nodes, placements, room }: Props) {
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map())

  const overlaps: OverlapZone[] = useMemo(() => {
    const projNodes = nodes.filter((n) => n.data.record.category === "projection")
    const footprints = projNodes.map((n) => ({
      node: n,
      fp: computeProjectorFootprint(n, placements[n.data.instanceId], room),
    })).filter((x) => x.fp !== null) as { node: DeviceNode; fp: NonNullable<ReturnType<typeof computeProjectorFootprint>> }[]

    const zones: OverlapZone[] = []

    for (let i = 0; i < footprints.length; i++) {
      for (let j = i + 1; j < footprints.length; j++) {
        const fpA = footprints[i].fp
        const fpB = footprints[j].fp

        // Must be on the same surface plane (same normal AND same plane distance)
        const normDot = fpA.normal.dot(fpB.normal)
        if (normDot < 0.99) continue
        const distA = fpA.hit.point.dot(fpA.normal)
        const distB = fpB.hit.point.dot(fpB.normal)
        if (Math.abs(distA - distB) > 0.2) continue

        const { axis1, axis2 } = canonicalAxes(fpA.normal)
        const origin = fpA.hit.point.clone()

        const cornersA2D: P2[] = fpA.corners.map((c) => to2D(c, axis1, axis2, origin))
        const cornersB2D: P2[] = fpB.corners.map((c) => to2D(c, axis1, axis2, origin))

        const intersection = sutherlandHodgman(cornersA2D, cornersB2D)
        if (intersection.length < 3) continue

        const pts3D = intersection.map((p) =>
          to3D(p, axis1, axis2, origin, fpA.normal, 0.012)
        )

        const geo = polygonToBufferGeometry(pts3D)
        if (!geo) continue

        const centroid = new Vector3()
        pts3D.forEach((p) => centroid.add(p))
        centroid.divideScalar(pts3D.length)

        const lA = fpA.lumens ?? null
        const lB = fpB.lumens ?? null
        const combinedLumens = lA !== null && lB !== null ? lA + lB : null

        zones.push({
          geometry: geo,
          centroid,
          combinedLumens,
          id: `${footprints[i].node.id}-${footprints[j].node.id}`,
        })
      }
    }

    return zones
  }, [nodes, placements, room])

  // Gentle opacity pulse
  useFrame(({ clock }) => {
    meshRefs.current.forEach((mesh) => {
      if (mesh.material) {
        const mat = mesh.material as THREE.MeshBasicMaterial
        mat.opacity = 0.25 + Math.sin(clock.elapsedTime * 1.5) * 0.08
      }
    })
  })

  if (overlaps.length === 0) return null

  return (
    <>
      {overlaps.map((zone) => (
        <group key={zone.id}>
          <mesh
            ref={(el) => {
              if (el) meshRefs.current.set(zone.id, el)
              else meshRefs.current.delete(zone.id)
            }}
            geometry={zone.geometry}
          >
            <meshBasicMaterial
              color="#FFFFFF"
              opacity={0.3}
              transparent
              depthWrite={false}
            />
          </mesh>
          {zone.combinedLumens !== null && (
            <Html
              position={zone.centroid.toArray()}
              center
              distanceFactor={14}
              style={{ pointerEvents: "none" }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: "#FFFFFF",
                  background: "rgba(10,10,11,0.85)",
                  padding: "2px 6px",
                  border: "1px solid #FFFFFF30",
                  whiteSpace: "nowrap",
                }}
              >
                Overlap — {zone.combinedLumens.toLocaleString()} lm combined
              </div>
            </Html>
          )}
        </group>
      ))}
    </>
  )
}
