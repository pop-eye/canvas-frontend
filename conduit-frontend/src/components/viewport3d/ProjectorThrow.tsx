import { useMemo } from "react"
import { Vector3, Quaternion } from "three"
import { Line, Html } from "@react-three/drei"
import type { DeviceNode } from "../../types/canvas"
import type { DevicePlacement } from "../../types/spatial"
import type { RoomConfig3D } from "../../types/spatial"
import type { ProjectionSpec } from "../../types/api"

interface Props {
  node: DeviceNode
  placement: DevicePlacement
  room: RoomConfig3D
}

interface HitResult {
  point: Vector3
  distance: number
  surface: "floor" | "ceiling" | "wall"
  normal: Vector3
}

function rayRoomIntersect(
  origin: Vector3,
  dir: Vector3,
  W: number,
  H: number,
  D: number
): HitResult | null {
  const surfaces: { name: HitResult["surface"]; t: number; normal: Vector3; check: (p: Vector3) => boolean }[] = [
    {
      name: "floor",
      t: Math.abs(dir.y) > 1e-6 ? (0 - origin.y) / dir.y : Infinity,
      normal: new Vector3(0, 1, 0),
      check: (p) => p.x >= 0 && p.x <= W && p.z >= 0 && p.z <= D,
    },
    {
      name: "ceiling",
      t: Math.abs(dir.y) > 1e-6 ? (H - origin.y) / dir.y : Infinity,
      normal: new Vector3(0, -1, 0),
      check: (p) => p.x >= 0 && p.x <= W && p.z >= 0 && p.z <= D,
    },
    {
      name: "wall",
      t: Math.abs(dir.z) > 1e-6 ? (0 - origin.z) / dir.z : Infinity,
      normal: new Vector3(0, 0, 1),
      check: (p) => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H,
    },
    {
      name: "wall",
      t: Math.abs(dir.z) > 1e-6 ? (D - origin.z) / dir.z : Infinity,
      normal: new Vector3(0, 0, -1),
      check: (p) => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H,
    },
    {
      name: "wall",
      t: Math.abs(dir.x) > 1e-6 ? (0 - origin.x) / dir.x : Infinity,
      normal: new Vector3(1, 0, 0),
      check: (p) => p.z >= 0 && p.z <= D && p.y >= 0 && p.y <= H,
    },
    {
      name: "wall",
      t: Math.abs(dir.x) > 1e-6 ? (W - origin.x) / dir.x : Infinity,
      normal: new Vector3(-1, 0, 0),
      check: (p) => p.z >= 0 && p.z <= D && p.y >= 0 && p.y <= H,
    },
  ]

  let best: HitResult | null = null
  for (const { name, t, normal, check } of surfaces) {
    if (!isFinite(t) || t < 0.05) continue
    const p = origin.clone().addScaledVector(dir, t)
    if (!check(p)) continue
    if (!best || t < best.distance) best = { point: p, distance: t, surface: name, normal }
  }
  return best
}

function parseAspect(resolution?: string): number {
  if (!resolution) return 16 / 9
  const m = resolution.match(/(\d+)[x×](\d+)/i)
  if (!m) return 16 / 9
  return parseInt(m[1]) / parseInt(m[2])
}

function projectionDirection(placement: DevicePlacement): Vector3 {
  // Base direction depends on mount type
  let base: Vector3
  if (placement.mounted === "truss" || placement.mounted === "ceiling") {
    // Ceiling-mounted: project downward, pan by Y rotation
    base = new Vector3(0, -1, 0)
  } else if (placement.mounted === "wall-front") {
    base = new Vector3(0, 0, 1)
  } else if (placement.mounted === "wall-rear") {
    base = new Vector3(0, 0, -1)
  } else {
    // Floor, table, rack, freestanding — project forward
    base = new Vector3(0, 0, -1)
  }

  // Apply Y rotation (the axis exposed in the UI)
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), placement.rotation.y)
  return base.clone().applyQuaternion(q).normalize()
}

export function ProjectorThrow({ node, placement, room }: Props) {
  const proj: ProjectionSpec | undefined = node.data.record.metadata.projection
  const hasThrow = !!(proj?.throw_ratio_min || proj?.throw_ratio_max)

  const data = useMemo(() => {
    if (!hasThrow) return null

    const { width_m: W, depth_m: D, height_m: H } = room
    const origin = new Vector3(
      placement.position3d.x,
      placement.position3d.y,
      placement.position3d.z
    )
    const dir = projectionDirection(placement)
    const hit = rayRoomIntersect(origin, dir, W, H, D)
    if (!hit) return null

    // Throw ratio (use midpoint of min/max, fallback to whichever exists)
    const trMin = proj!.throw_ratio_min
    const trMax = proj!.throw_ratio_max
    const throwRatio = trMin && trMax ? (trMin + trMax) / 2 : (trMin ?? trMax ?? 1.5)

    const throwDist = hit.distance
    const imgW = throwDist / throwRatio
    const aspect = parseAspect(proj?.resolution ?? node.data.record.metadata.video?.resolution)
    const imgH = imgW / aspect

    // Lens shift (as fraction of image dimension, spec is percent of image height/width)
    const shiftV = (proj?.lens_shift_v_percent ?? 0) / 100
    const shiftH = (proj?.lens_shift_h_percent ?? 0) / 100

    // Build image plane axes
    // right = normalized cross(dir, world_up), handling gimbal when dir ≈ up/down
    const worldUp = Math.abs(dir.y) > 0.9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0)
    const right = new Vector3().crossVectors(dir, worldUp).normalize()
    const imageUp = new Vector3().crossVectors(right, dir).normalize()

    // Image centre offset by lens shift
    const centre = hit.point.clone()
      .addScaledVector(imageUp, shiftV * imgH)
      .addScaledVector(right, shiftH * imgW)

    // Four corners
    const corners = [
      centre.clone().addScaledVector(right, -imgW / 2).addScaledVector(imageUp, imgH / 2),  // top-left
      centre.clone().addScaledVector(right,  imgW / 2).addScaledVector(imageUp, imgH / 2),  // top-right
      centre.clone().addScaledVector(right,  imgW / 2).addScaledVector(imageUp, -imgH / 2), // bottom-right
      centre.clone().addScaledVector(right, -imgW / 2).addScaledVector(imageUp, -imgH / 2), // bottom-left
    ]

    // Frustum apex — slightly offset from projector toward lens
    const apex = origin.clone().addScaledVector(dir, 0.15)

    return { hit, throwDist, imgW, imgH, centre, corners, apex, throwRatio, shiftV, shiftH }
  }, [placement, proj, room, node, hasThrow])

  if (!data) return null

  const { throwDist, imgW, imgH, centre, corners, apex } = data

  // Frustum lines: apex → each corner (4), plus image perimeter (4 edges)
  const frustumLines = corners.map(c => [apex.toArray() as [number,number,number], c.toArray() as [number,number,number]])
  const perimeterPts: [number, number, number][] = [
    ...corners.map(c => c.toArray() as [number, number, number]),
    corners[0].toArray() as [number, number, number],
  ]

  // Slightly offset the image plane from the surface (avoid z-fighting)
  const normal = data.hit.normal
  const planeCentre = centre.clone().addScaledVector(normal, 0.005)

  // Plane rotation: align normal with surface normal using lookAt shortcut
  // planeGeometry faces +Z by default; we want it to face along the hit normal
  const planeNormal = normal.clone().negate() // face toward projector

    <group>
      {/* Image footprint plane */}
      <mesh
        position={planeCentre.toArray()}
        quaternion={quat.toArray() as [number, number, number, number]}
      >
        <planeGeometry args={[imgW, imgH]} />
        <meshBasicMaterial color="#F59E0B" opacity={0.12} transparent depthWrite={false} />
      </mesh>

      {/* Image outline */}
      <Line
        points={perimeterPts}
        color="#F59E0B"
        lineWidth={1.5}
        opacity={0.6}
        transparent
      />

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

      {/* Throw info label */}
      <Html
        position={centre.toArray()}
        center
        distanceFactor={14}
        style={{ pointerEvents: "none" }}
      >
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: "#F59E0B",
          background: "rgba(10,10,11,0.82)",
          padding: "2px 6px",
          border: "1px solid #F59E0B40",
          whiteSpace: "nowrap",
          lineHeight: 1.5,
        }}>
          <div>{imgW.toFixed(2)}m x {imgH.toFixed(2)}m</div>
          <div style={{ opacity: 0.6 }}>{throwDist.toFixed(1)}m throw</div>
        </div>
      </Html>
    </group>
  )
}
