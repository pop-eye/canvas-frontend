import { useMemo } from "react"
import * as THREE from "three"
import type { DeviceNode } from "../../types/canvas"
import type { DevicePlacement } from "../../types/spatial"

interface Props {
  nodes: DeviceNode[]
  placements: Record<string, DevicePlacement>
}

function coverageRadius(node: DeviceNode, placement: DevicePlacement): number {
  const env = node.data.record.metadata.environment
  const height = Math.max(0.1, placement.position3d.y)

  if (env?.coverage_degrees) {
    const halfRad = (env.coverage_degrees / 2) * (Math.PI / 180)
    return height * Math.tan(halfRad)
  }
  if (env?.max_distance_m) return env.max_distance_m
  return 6
}

interface CoverageZone {
  cx: number
  cz: number
  radius: number
  instanceId: string
}

export function AudioCoverageHeatmap({ nodes, placements }: Props) {
  const zones: CoverageZone[] = useMemo(() => {
    return nodes
      .filter(
        (n) =>
          n.data.record.category === "audio_amplified" ||
          n.data.record.category === "audio_passive"
      )
      .map((n) => {
        const p = placements[n.data.instanceId]
        if (!p) return null
        return {
          cx: p.position3d.x,
          cz: p.position3d.z,
          radius: coverageRadius(n, p),
          instanceId: n.data.instanceId,
        }
      })
      .filter(Boolean) as CoverageZone[]
  }, [nodes, placements])

  if (zones.length === 0) return null

  return (
    <>
      {zones.map((zone) => (
        <mesh
          key={zone.instanceId}
          position={[zone.cx, 0.02, zone.cz]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[zone.radius, 48]} />
          <meshBasicMaterial
            color="#00BFFF"
            opacity={0.12}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </>
  )
}
