/**
 * React Query hooks over the conduit/v1 device source.
 * Replaces the old scraper-API hooks (src/hooks/useEquipment.ts).
 */
import { useQuery } from "@tanstack/react-query"
import { fetchDeviceIndex, fetchDevice, type DeviceIndex, type SourceOrigin } from "./source"
import type { ConduitDevice } from "./types"

const FIVE_MIN = 5 * 60 * 1000

export function useDeviceIndex() {
  return useQuery<{ index: DeviceIndex; origin: SourceOrigin }>({
    queryKey: ["device-index"],
    queryFn: fetchDeviceIndex,
    staleTime: FIVE_MIN,
  })
}

export function useDevice(id: string | null | undefined) {
  return useQuery<ConduitDevice>({
    queryKey: ["device", id],
    queryFn: () => fetchDevice(id as string),
    enabled: !!id,
    staleTime: FIVE_MIN,
  })
}
