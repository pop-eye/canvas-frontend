import { useMemo } from "react"
import * as THREE from "three"
import type { DeviceNode } from "../../types/canvas"
import type { DevicePlacement } from "../../types/spatial"

interface Props {
  nodes: DeviceNode[]
  placements: Record<string, DevicePlacement>
}

const AUDIO_CATEGORIES = new Set(["audio-loudspeaker", "audio-monitor"])

// conduit/v1 carries no dispersion angle on loudspeakers, so we use an
// indicative radius scaled by mounting height. Visual aid only.
function coverageRadius(placement: DevicePlacement): number {
  const height = Math.max(1, placement.position3d.y)
  return Math.min(10, 2 + height * 1.2)
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
      .filter((n) => AUDIO_CATEGORIES.has(n.data.device.category))
      .map((n) => {
        const p = placements[n.data.instanceId]
        if (!p) return null
        return { cx: p.position3d.x, cz: p.position3d.z, radius: coverageRadius(p), instanceId: n.data.instanceId }
      })
      .filter(Boolean) as CoverageZone[]
  }, [nodes, placements])

  if (zones.length === 0) return null

  return (
    <>
      {zones.map((zone) => (
        <mesh key={zone.instanceId} position={[zone.cx, 0.02, zone.cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[zone.radius, 48]} />
          <meshBasicMaterial color="#00BFFF" opacity={0.12} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </>
  )
}
