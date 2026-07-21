import { useState } from "react"
import { Html } from "@react-three/drei"
import type { ConduitDevice } from "../../conduit/types"
import { deviceInputs, deviceOutputs } from "../../conduit/device"
import { signalColour, signalLabel } from "../../conduit/signalType"

interface Props {
  device: ConduitDevice
  deviceSize: [number, number, number]
}

interface PortDot {
  key: string
  position: [number, number, number]
  color: string
  label: string
}

export function PortIndicator3D({ device, deviceSize }: Props) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [W, , D] = deviceSize

  const dots: PortDot[] = []
  const outputs = deviceOutputs(device)
  const inputs = deviceInputs(device)

  outputs.forEach((port, i) => {
    const total = outputs.length
    const x = total > 1 ? ((i / (total - 1)) - 0.5) * W * 0.8 : 0
    dots.push({
      key: `out-${port.id}`,
      position: [x, 0, D / 2 + 0.015],
      color: signalColour(port.signal_type),
      label: `${signalLabel(port.signal_type)} OUT`,
    })
  })

  inputs.forEach((port, i) => {
    const total = inputs.length
    const x = total > 1 ? ((i / (total - 1)) - 0.5) * W * 0.8 : 0
    dots.push({
      key: `in-${port.id}`,
      position: [x, 0, -D / 2 - 0.015],
      color: signalColour(port.signal_type),
      label: `${signalLabel(port.signal_type)} IN`,
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
            <meshStandardMaterial color={dot.color} emissive={dot.color} emissiveIntensity={hoveredKey === dot.key ? 0.8 : 0.3} roughness={0.3} />
          </mesh>
          {hoveredKey === dot.key && (
            <Html center distanceFactor={6} style={{ pointerEvents: "none" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#E8EAED", background: "rgba(10,10,11,0.9)", padding: "2px 5px", borderLeft: `2px solid ${dot.color}`, whiteSpace: "nowrap" }}>
                {dot.label}
              </div>
            </Html>
          )}
        </group>
      ))}
    </>
  )
}
