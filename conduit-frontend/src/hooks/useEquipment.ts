import { useQuery } from "@tanstack/react-query"
import { listEquipment, getEquipment, getStats, ListEquipmentParams } from "../api/equipment"

export function useEquipmentList(params: ListEquipmentParams) {
  return useQuery({
    queryKey: ["equipment", params],
    queryFn: () => listEquipment(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useEquipment(id: string | null) {
  return useQuery({
    queryKey: ["equipment", id],
    queryFn: () => getEquipment(id!),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  })
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    staleTime: 5 * 60 * 1000,
  })
}
