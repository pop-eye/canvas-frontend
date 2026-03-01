import { useState, useRef, useMemo } from "react"
import type { ReactElement } from "react"
import { ThreeEvent } from "@react-three/fiber"
import { Html, useCursor } from "@react-three/drei"
import { Vector3 } from "three"
import type { DeviceNode } from "../../types/canvas"
import type { DevicePlacement } from "../../types/spatial"
import { useCanvasStore } from "../../store/canvasStore"
import { useUIStore } from "../../store/uiStore"
import { DeviceMeshByCategory } from "./DeviceMeshByCategory"
import { PortIndicator3D } from "./PortIndicator3D"
import { getCategoryGeo, deriveSize } from "../../utils/deviceGeometry"

interface Props {
  node: DeviceNode
  placement: DevicePlacement
}

/** Semi-transparent projection/audio/lighting coverage cone or arc */
function CoverageVolume({ record, size }: { record: import("../../types/api").EquipmentRecord; size: [number, number, number] }) {
  const env = record.metadata?.environment
  const audio = record.metadata?.audio
  const light = record.metadata?.lighting

  const cones: ReactElement[] = []

  // Audio coverage arc
  if (env?.coverage_degrees && audio) {
    const radius = env.max_distance_m ?? 6
    const angle = (env.coverage_degrees * Math.PI) / 180
    cones.push(
      <mesh key="coverage" position={[0, 0, radius / 2]}>
        <coneGeometry args={[radius * Math.tan(angle / 2), radius, 24, 1, true]} />
        <meshStandardMaterial color="#00D4CC" opacity={0.065} transparent depthWrite={false} side={2} />
      </mesh>
    )
  }

  // Lighting beam
  if (light?.beam_angle_degrees) {
    const length = 6
    const halfAngle = (light.beam_angle_degrees * Math.PI) / 360
    cones.push(
      <mesh key="beam" position={[0, -length / 2 - size[1] / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[length * Math.tan(halfAngle), length, 16, 1, true]} />
        <meshStandardMaterial color="#FBBF24" opacity={0.06} transparent depthWrite={false} side={2} />
      </mesh>
    )
  }

  return <>{cones}</>
}

export function DeviceMesh({ node, placement }: Props) {
  const { selectNode, selectedNodeId, setPlacement } = useCanvasStore()
  const { setDraggingDevice } = useUIStore()
  const isSelected = selectedNodeId === node.id
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef<any>(null)
  const isDragging = useRef(false)
  const dragStart = useRef<Vector3>(new Vector3())
  const posStart = useRef<[number, number, number]>([0, 0, 0])

  useCursor(hovered)

  const geo = getCategoryGeo(node.data.record.category)
  const size = useMemo(() => deriveSize(node.data.record, geo.defaultSize), [node.data.record, geo.defaultSize])

  const { x, y, z } = placement.position3d

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    if (!isDragging.current) selectNode(node.id)
  }

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    isDragging.current = false
    dragStart.current.set(e.point.x, e.point.y, e.point.z)
    posStart.current = [x, y, z]
    ;(e.target as any).setPointerCapture?.(e.pointerId)
    setDraggingDevice(true)
  }

  function handlePointerMove(e: ThreeEvent<PointerEvent>) {
    if (!(e.buttons & 1)) return
    const dx = e.point.x - dragStart.current.x
    const dz = e.point.z - dragStart.current.z
    if (Math.abs(dx) > 0.05 || Math.abs(dz) > 0.05) isDragging.current = true
    if (!isDragging.current) return

    const isTruss = placement.mounted === "truss" || placement.mounted === "ceiling"
    const newY = isTruss ? posStart.current[1] : posStart.current[1] // Y locked for now

    setPlacement(node.data.instanceId, {
      position3d: {
        x: posStart.current[0] + dx,
        y: newY,
        z: posStart.current[2] + dz,
      },
    })
  }

  const label = node.data.label ?? node.data.record.name

  return (
    <group
      ref={groupRef}
      position={[x, y + size[1] / 2, z]}
      rotation={[placement.rotation.x, placement.rotation.y, placement.rotation.z]}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
      onPointerUp={() => setDraggingDevice(false)}
    >
      <DeviceMeshByCategory
        record={node.data.record}
        isSelected={isSelected}
        hovered={hovered}
        size={size}
      />

      <PortIndicator3D record={node.data.record} deviceSize={size} />

      {/* Selected outline ring */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[size[0] + 0.03, size[1] + 0.03, size[2] + 0.03]} />
          <meshBasicMaterial color="#00D4CC" wireframe opacity={0.6} transparent />
        </mesh>
      )}

      {/* Coverage visualisation */}
      <CoverageVolume record={node.data.record} size={size} />

      {/* Label — shown on hover or selection */}
      {(hovered || isSelected) && (
        <Html
          center
          position={[0, size[1] / 2 + 0.12, 0]}
          distanceFactor={10}
          style={{ pointerEvents: "none" }}
        >
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: "#E8EAED",
            background: "rgba(10,10,11,0.88)",
            padding: "3px 7px",
            borderLeft: "2px solid #00D4CC",
            whiteSpace: "nowrap",
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  )
}
