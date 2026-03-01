import { useMemo } from "react"
import { Quaternion, Vector3 } from "three"
import { Line, Html } from "@react-three/drei"
import type { DeviceNode } from "../../types/canvas"
import type { DevicePlacement, RoomConfig3D } from "../../types/spatial"
import { computeProjectorFootprint, computeThrowEnvelope } from "../../utils/projectorUtils"

interface Props {
  node: DeviceNode
  placement: DevicePlacement
  room: RoomConfig3D
}

export function ProjectorThrow({ node, placement, room }: Props) {
  const data = useMemo(
    () => computeProjectorFootprint(node, placement, room),
    [node, placement, room]
  )

  const envelope = useMemo(
    () => computeThrowEnvelope(node, placement, room),
    [node, placement, room]
  )
  if (!data) return null

  const { throwDist, imgW, imgH, centre, corners, apex, normal } = data

  const frustumLines = corners.map((c) => [
    apex.toArray() as [number, number, number],
    c.toArray() as [number, number, number],
  ])
  const perimeterPts: [number, number, number][] = [
    ...corners.map((c) => c.toArray() as [number, number, number]),
    corners[0].toArray() as [number, number, number],
  ]

  const planeCentre = centre.clone().addScaledVector(normal, 0.005)
  const planeNormal = normal.clone().negate()
  const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), planeNormal)

  return (
    <group>
      {/* ── Zoom envelope — max zoom (widest image, throw_ratio_min) ──────── */}
      {envelope.maxZoom && (() => {
        const ec = envelope.maxZoom.corners
        const pts: [number, number, number][] = [
          ...ec.map((c) => c.toArray() as [number, number, number]),
          ec[0].toArray() as [number, number, number],
        ]
        return (
          <Line points={pts} color="#60A5FA" lineWidth={1} opacity={0.35} transparent
            dashed dashSize={0.2} gapSize={0.1} />
        )
      })()}

      {/* ── Zoom envelope — min zoom (tightest image, throw_ratio_max) ────── */}
      {envelope.minZoom && (() => {
        const ec = envelope.minZoom.corners
        const pts: [number, number, number][] = [
          ...ec.map((c) => c.toArray() as [number, number, number]),
          ec[0].toArray() as [number, number, number],
        ]
        return (
          <Line points={pts} color="#A78BFA" lineWidth={1} opacity={0.35} transparent
            dashed dashSize={0.2} gapSize={0.1} />
        )
      })()}

      {/* ── Current image footprint plane ─────────────────────────────────── */}
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
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: "#F59E0B",
            background: "rgba(10,10,11,0.82)",
            padding: "2px 6px",
            border: "1px solid #F59E0B40",
            whiteSpace: "nowrap",
            lineHeight: 1.5,
          }}
        >
          <div>{imgW.toFixed(2)}m x {imgH.toFixed(2)}m</div>
          <div style={{ opacity: 0.6 }}>{throwDist.toFixed(1)}m throw</div>
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
