import { Node, Edge } from "@xyflow/react"
import { EquipmentRecord } from "./api"

export interface DeviceNodeData extends Record<string, unknown> {
  record: EquipmentRecord
  instanceId: string       // UUID — unique per placement
  label?: string           // user-editable label override
}

export type DeviceNode = Node<DeviceNodeData, "device">

export interface ConnectionEdgeData extends Record<string, unknown> {
  sourcePortId: string     // format: `${protocol}::${index}`
  targetPortId: string
  signalType: string
  compatible: boolean
  warning?: string
}

export type ConnectionEdge = Edge<ConnectionEdgeData, "connection">

export interface RoomConfig {
  name: string
  width_m: number
  depth_m: number
}
