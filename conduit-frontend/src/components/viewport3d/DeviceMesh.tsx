import { useState, useRef, useMemo } from "react"
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
import { deviceName } from "../../conduit/device"

interface Props {
  node: DeviceNode
  placement: DevicePlacement
}

export function DeviceMesh({ node, placement }: Props) {
  const { selectNode, selectedNodeId, setPlacement } = useCanvasStore()
  const { setDraggingDevice } = useUIStore()
  const device = node.data.device
  const isSelected = selectedNodeId === node.id
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef<any>(null)
  const isDragging = useRef(false)
  const dragStart = useRef<Vector3>(new Vector3())
  const posStart = useRef<[number, number, number]>([0, 0, 0])

  useCursor(hovered)

  const geo = getCategoryGeo(device.category)
  const size = useMemo(() => deriveSize(device, geo.defaultSize), [device, geo.defaultSize])

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

    setPlacement(node.data.instanceId, {
      position3d: {
        x: posStart.current[0] + dx,
        y: posStart.current[1], // Y locked during XZ drag
        z: posStart.current[2] + dz,
      },
    })
  }

  const label = node.data.label ?? deviceName(device)
  const theme = useUIStore((s) => s.theme)

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
      <DeviceMeshByCategory device={device} isSelected={isSelected} hovered={hovered} size={size} />

      <PortIndicator3D device={device} deviceSize={size} />

      {isSelected && (
        <mesh>
          <boxGeometry args={[size[0] + 0.03, size[1] + 0.03, size[2] + 0.03]} />
          <meshBasicMaterial color="#00D4CC" wireframe opacity={0.6} transparent />
        </mesh>
      )}

      {(hovered || isSelected) && (
        <Html center position={[0, size[1] / 2 + 0.12, 0]} distanceFactor={10} style={{ pointerEvents: "none" }}>
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: "var(--text-primary)",
            background: theme === "light" ? "rgba(255,255,255,0.88)" : "rgba(10,10,11,0.88)",
            padding: "3px 7px",
            borderLeft: "2px solid var(--accent)",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  )
}
