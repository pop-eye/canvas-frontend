import { useMemo, useState } from "react"
import { Html } from "@react-three/drei"
import type { ConduitDevice } from "../../conduit/types"
import { deviceNeedsReview } from "../../conduit/device"
import { buildDeviceModel, type MaterialKey, type PartSpec, type PlacedPort3D } from "../../utils/deviceModel"

interface Props {
  device: ConduitDevice
  isSelected: boolean
  hovered: boolean
}

interface Mat {
  color: string
  roughness: number
  metalness: number
  emissive?: string
  emissiveIntensity?: number
}

const MATERIALS: Record<MaterialKey, Mat> = {
  "matte-dark": { color: "#1A1A1F", roughness: 0.8, metalness: 0.2 },
  "rack-black": { color: "#111214", roughness: 0.6, metalness: 0.45 },
  faceplate: { color: "#17181C", roughness: 0.5, metalness: 0.55 },
  screen: { color: "#050608", roughness: 0.12, metalness: 0.0, emissive: "#0A1414", emissiveIntensity: 0.35 },
  metal: { color: "#3A3D44", roughness: 0.35, metalness: 0.85 },
  "glass-lens": { color: "#08161A", roughness: 0.05, metalness: 0.2, emissive: "#0C3538", emissiveIntensity: 0.5 },
  cabinet: { color: "#0E0E10", roughness: 0.92, metalness: 0.05 },
  white: { color: "#C6C8CD", roughness: 0.85, metalness: 0.05 },
  driver: { color: "#050505", roughness: 0.7, metalness: 0.1 },
  accent: { color: "#00D4CC", roughness: 0.4, metalness: 0.3, emissive: "#00D4CC", emissiveIntensity: 0.3 },
}

function selectionEmissive(isSelected: boolean, hovered: boolean, needsReview: boolean): { emissive: string; intensity: number } | null {
  if (isSelected) return { emissive: "#00D4CC", intensity: 0.22 }
  if (hovered) return { emissive: "#00D4CC", intensity: 0.09 }
  if (needsReview) return { emissive: "#F59E0B", intensity: 0.12 }
  return null
}

function PartMesh({ part, tint }: { part: PartSpec; tint: { emissive: string; intensity: number } | null }) {
  const m = MATERIALS[part.material]
  const emissive = tint?.emissive ?? m.emissive ?? "#000000"
  const emissiveIntensity = tint ? tint.intensity : (m.emissiveIntensity ?? 0)
  return (
    <mesh position={part.position} rotation={part.rotation} castShadow receiveShadow>
      {part.kind === "box" ? (
        <boxGeometry args={part.size} />
      ) : (
        <cylinderGeometry args={[part.size[0], part.size[1], part.size[2], 24]} />
      )}
      <meshStandardMaterial color={m.color} roughness={m.roughness} metalness={m.metalness} emissive={emissive} emissiveIntensity={emissiveIntensity} />
    </mesh>
  )
}

function PortMesh({ port, boost }: { port: PlacedPort3D; boost: boolean }) {
  const [hover, setHover] = useState(false)
  const intensity = hover ? 0.9 : boost ? 0.5 : 0.3
  return (
    <group position={port.position} rotation={port.rotation}>
      <mesh onPointerOver={(e) => { e.stopPropagation(); setHover(true) }} onPointerOut={() => setHover(false)}>
        {port.round ? (
          <cylinderGeometry args={[port.size[0], port.size[0], port.size[2], 12]} />
        ) : (
          <boxGeometry args={port.size} />
        )}
        <meshStandardMaterial color={port.colour} emissive={port.colour} emissiveIntensity={intensity} roughness={0.35} metalness={0.3} />
      </mesh>
      {hover && (
        <Html center distanceFactor={6} style={{ pointerEvents: "none" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#E8EAED", background: "rgba(10,10,11,0.9)", padding: "2px 5px", borderLeft: `2px solid ${port.colour}`, whiteSpace: "nowrap" }}>
            {port.label}
          </div>
        </Html>
      )}
    </group>
  )
}

export function ProceduralDeviceMesh({ device, isSelected, hovered }: Props) {
  const model = useMemo(() => buildDeviceModel(device), [device])
  const tint = selectionEmissive(isSelected, hovered, deviceNeedsReview(device))

  return (
    <group>
      {model.parts.map((part, i) => (
        <PartMesh key={i} part={part} tint={tint} />
      ))}
      {model.ports.map((port) => (
        <PortMesh key={`${port.face}-${port.id}`} port={port} boost={isSelected || hovered} />
      ))}
    </group>
  )
}
