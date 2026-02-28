import { useCallback } from "react"
import { DeviceNode } from "../types/canvas"
import { ConnectorPort } from "../types/api"
import { checkCompatibility, CompatibilityResult } from "../utils/compatibility"

// Handle ID format: `${direction}-${protocol}-${index}` e.g. "input-HDMI-0"
function parseHandleId(
  handleId: string,
  node: DeviceNode
): ConnectorPort | null {
  const parts = handleId.split("-")
  if (parts.length < 3) return null
  const direction = parts[0] as "input" | "output"
  const indexStr = parts[parts.length - 1]
  const protocol = parts.slice(1, -1).join("-")
  const index = parseInt(indexStr, 10)

  const ports =
    direction === "input"
      ? node.data.record.metadata.connectivity.inputs
      : node.data.record.metadata.connectivity.outputs

  // Find by protocol
  let count = 0
  for (const port of ports) {
    if (port.protocol === protocol) {
      if (count === index) return port
      count++
    }
  }

  // Fallback: by flat index
  return ports[index] ?? null
}

export function useCompatibility() {
  const validateConnection = useCallback(
    (
      sourceNodeId: string,
      sourceHandleId: string,
      targetNodeId: string,
      targetHandleId: string,
      nodes: DeviceNode[]
    ): CompatibilityResult => {
      const sourceNode = nodes.find((n) => n.id === sourceNodeId)
      const targetNode = nodes.find((n) => n.id === targetNodeId)

      if (!sourceNode || !targetNode) {
        return { compatible: false, reason: "Node not found" }
      }

      // Prevent connecting output→output or input→input
      const srcIsOutput = sourceHandleId.startsWith("output")
      const tgtIsInput = targetHandleId.startsWith("input")

      if (!srcIsOutput || !tgtIsInput) {
        return {
          compatible: false,
          reason: srcIsOutput
            ? "Cannot connect two inputs — connect from an output to an input"
            : "Cannot connect two outputs — connect from an output to an input",
        }
      }

      const sourcePort = parseHandleId(sourceHandleId, sourceNode)
      const targetPort = parseHandleId(targetHandleId, targetNode)

      if (!sourcePort || !targetPort) {
        return { compatible: true } // Unknown port — allow but don't validate
      }

      return checkCompatibility(sourcePort, targetPort)
    },
    []
  )

  return { validateConnection }
}
