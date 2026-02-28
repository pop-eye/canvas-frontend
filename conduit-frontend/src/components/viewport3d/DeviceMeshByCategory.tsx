import { useMemo } from "react"
import type { EquipmentRecord } from "../../types/api"
import { getCategoryGeo, deriveSize } from "../../utils/deviceGeometry"
import { getCategoryMaterial, applySelection } from "../../utils/categoryMaterial"

interface Props {
  record: EquipmentRecord
  isSelected: boolean
  hovered: boolean
  size: [number, number, number]
}

export function DeviceMeshByCategory({ record, isSelected, hovered, size }: Props) {
  const mat = useMemo(() => {
    const base = getCategoryMaterial(record.category)
    return applySelection(base, isSelected, hovered, record.needs_review)
  }, [record.category, record.needs_review, isSelected, hovered])

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
