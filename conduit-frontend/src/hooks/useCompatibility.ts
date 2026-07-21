import { useCallback } from "react"
import { DeviceNode, ConnectionEdge } from "../types/canvas"
import { checkPortCompatibility, type CompatibilityResult } from "../conduit/compatibility"
import { parseHandleId, resolvePort } from "../conduit/device"
import { isPortAtCapacity } from "../utils/graphAnalysis"

export function useCompatibility() {
  const validateConnection = useCallback(
    (
      sourceNodeId: string,
      sourceHandleId: string,
      targetNodeId: string,
      targetHandleId: string,
      nodes: DeviceNode[],
      edges: ConnectionEdge[] = []
    ): CompatibilityResult & { sourcePortId?: string; targetPortId?: string } => {
      const sourceNode = nodes.find((n) => n.id === sourceNodeId)
      const targetNode = nodes.find((n) => n.id === targetNodeId)
      if (!sourceNode || !targetNode) {
        return { compatible: false, severity: "error", reason: "Device not found" }
      }

      const srcHandle = parseHandleId(sourceHandleId)
      const tgtHandle = parseHandleId(targetHandleId)
      // Enforce output → input at the handle level.
      if (!srcHandle || srcHandle.role !== "out") {
        return { compatible: false, severity: "error", reason: "Start the connection from an output" }
      }
      if (!tgtHandle || tgtHandle.role !== "in") {
        return { compatible: false, severity: "error", reason: "Connect into an input" }
      }

      const sourcePort = resolvePort(sourceNode.data.device, srcHandle.portId)
      const targetPort = resolvePort(targetNode.data.device, tgtHandle.portId)
      if (!sourcePort || !targetPort) {
        return { compatible: false, severity: "error", reason: "Port not found" }
      }

      // Port capacity — block if a physical connector group is already saturated.
      const srcCap = isPortAtCapacity(sourceNodeId, srcHandle.portId, "out", nodes, edges)
      if (srcCap?.overloaded) {
        return { compatible: false, severity: "error", reason: `${srcCap.protocol} output at capacity (${srcCap.used}/${srcCap.capacity})` }
      }
      const tgtCap = isPortAtCapacity(targetNodeId, tgtHandle.portId, "in", nodes, edges)
      if (tgtCap?.overloaded) {
        return { compatible: false, severity: "error", reason: `${tgtCap.protocol} input at capacity (${tgtCap.used}/${tgtCap.capacity})` }
      }

      const result = checkPortCompatibility(sourcePort, targetPort)
      return { ...result, sourcePortId: sourcePort.id, targetPortId: targetPort.id }
    },
    []
  )

  return { validateConnection }
}
