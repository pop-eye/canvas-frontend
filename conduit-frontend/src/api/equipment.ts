import client from "./client"
import { EquipmentRecord, ListEquipmentResponse, StatsResponse } from "../types/api"

export interface ListEquipmentParams {
  search?: string
  category?: string
  min_confidence?: number
  needs_review?: boolean
}

export async function listEquipment(params: ListEquipmentParams): Promise<ListEquipmentResponse> {
  const { data } = await client.get<ListEquipmentResponse>("/api/equipment", {
    params: {
      ...(params.search ? { search: params.search } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.min_confidence !== undefined ? { min_confidence: params.min_confidence } : {}),
      ...(params.needs_review !== undefined ? { needs_review: params.needs_review } : {}),
    },
  })
  return data
}

export async function getEquipment(id: string): Promise<EquipmentRecord> {
  const { data } = await client.get<EquipmentRecord>(`/api/equipment/${id}`)
  return data
}

export async function getStats(): Promise<StatsResponse> {
  const { data } = await client.get<StatsResponse>("/api/stats")
  return data
}
