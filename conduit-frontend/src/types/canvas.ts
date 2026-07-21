import { Node, Edge } from "@xyflow/react"
import type { ConduitDevice } from "../conduit/types"
import type { Severity } from "../conduit/compatibility"

export interface DeviceNodeData extends Record<string, unknown> {
  device: ConduitDevice
  deviceId: string         // stable repo id, e.g. "optoma/zu607t"
  instanceId: string       // UUID — unique per placement
  label?: string           // user-editable label override
}

export type DeviceNode = Node<DeviceNodeData, "device">

export interface ConnectionEdgeData extends Record<string, unknown> {
  sourcePortId: string     // conduit Port.id on the source device
  targetPortId: string     // conduit Port.id on the target device
  signalType: string       // hierarchical signal type carried on the link
  severity: Severity
  compatible: boolean
  warning?: string
}

export type ConnectionEdge = Edge<ConnectionEdgeData, "connection">

export interface RoomConfig {
  name: string
  width_m: number
  depth_m: number
}
