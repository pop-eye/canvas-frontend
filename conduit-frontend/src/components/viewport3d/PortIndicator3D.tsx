import { useState } from "react"
import { Html } from "@react-three/drei"
import type { EquipmentRecord } from "../../types/api"
import { portColourHex } from "../../utils/portColour"

interface Props {
  record: EquipmentRecord
  deviceSize: [number, number, number]
}

interface PortDot {
  key: string
  position: [number, number, number]
  color: string
  label: string
}

export function PortIndicator3D({ record, deviceSize }: Props) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [W, H, D] = deviceSize

  const dots: PortDot[] = []

  const outputs = record.metadata?.connectivity?.outputs ?? []
  const inputs = record.metadata?.connectivity?.inputs ?? []

  // Outputs on rear face (z = +D/2)
  outputs.forEach((port, i) => {
    const total = outputs.length
    const x = total > 1 ? ((i / (total - 1)) - 0.5) * W * 0.8 : 0
    dots.push({
      key: `out-${i}`,
      position: [x, 0, D / 2 + 0.015],
      color: portColourHex(port.signal_type ?? "other"),
      label: `${port.protocol ?? port.signal_type} OUT`,
    })
  })

  // Inputs on front face (z = -D/2)
  inputs.forEach((port, i) => {
    const total = inputs.length
    const x = total > 1 ? ((i / (total - 1)) - 0.5) * W * 0.8 : 0
    dots.push({
      key: `in-${i}`,
      position: [x, 0, -D / 2 - 0.015],
      color: portColourHex(port.signal_type ?? "other"),
      label: `${port.protocol ?? port.signal_type} IN`,
    })
  })

  return (
    <>
      {dots.map((dot) => (
        <group key={dot.key} position={dot.position}>
          <mesh
            onPointerOver={(e) => { e.stopPropagation(); setHoveredKey(dot.key) }}
            onPointerOut={() => setHoveredKey(null)}
          >
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshStandardMaterial
              color={dot.color}
              emissive={dot.color}
              emissiveIntensity={hoveredKey === dot.key ? 0.8 : 0.3}
              roughness={0.3}
            />
          </mesh>
          {hoveredKey === dot.key && (
            <Html center distanceFactor={6} style={{ pointerEvents: "none" }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: "#E8EAED",
                background: "rgba(10,10,11,0.9)",
                padding: "2px 5px",
                borderLeft: `2px solid ${dot.color}`,
                whiteSpace: "nowrap",
              }}>
                {dot.label}
              </div>
            </Html>
          )}
        </group>
      ))}
    </>
  )
}
