import { useMemo } from "react"
import type { ConduitDevice } from "../../conduit/types"
import { deviceNeedsReview } from "../../conduit/device"
import { getCategoryMaterial, applySelection } from "../../utils/categoryMaterial"

interface Props {
  device: ConduitDevice
  isSelected: boolean
  hovered: boolean
  size: [number, number, number]
}

export function DeviceMeshByCategory({ device, isSelected, hovered, size }: Props) {
  const needsReview = deviceNeedsReview(device)
  const mat = useMemo(() => {
    const base = getCategoryMaterial(device.category)
    return applySelection(base, isSelected, hovered, needsReview)
  }, [device.category, needsReview, isSelected, hovered])

  const [W, H, D] = size

  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[W, H, D]} />
      <meshStandardMaterial
        color={mat.color}
        roughness={mat.roughness}
        metalness={mat.metalness}
        emissive={mat.emissive ?? "#000000"}
        emissiveIntensity={mat.emissiveIntensity ?? 0}
      />
    </mesh>
  )
}
