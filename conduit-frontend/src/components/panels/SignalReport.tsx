import { useCanvasStore } from "../../store/canvasStore"
import { portColourHex } from "../../utils/portColour"
import { deviceName } from "../../conduit/device"
import { signalLabel } from "../../conduit/signalType"

interface SignalReportProps {
  nodeId: string
}

export function SignalReport({ nodeId }: SignalReportProps) {
  const { edges, nodes } = useCanvasStore()

  const connected = edges.filter(
    (e) => e.source === nodeId || e.target === nodeId
  )

  if (connected.length === 0) {
    return (
      <div
        className="p-4 text-center text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        No connections on this device
      </div>
    )
  }

  return (
    <div
      className="p-4 space-y-2"
      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
    >
      <div
        className="text-[9px] uppercase tracking-widest mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        {connected.length} connection{connected.length !== 1 ? "s" : ""}
      </div>

      {connected.map((edge) => {
        const isSource = edge.source === nodeId
        const otherNodeId = isSource ? edge.target : edge.source
        const otherNode = nodes.find((n) => n.id === otherNodeId)
        const otherName = otherNode
          ? (otherNode.data.label ?? deviceName(otherNode.data.device))
          : "Unknown"

        const data = edge.data
        const signalType = data?.signalType ?? "other"
        const compatible = data?.compatible ?? true
        const warning = data?.warning

        const statusColour = !compatible ? "#EF4444" : warning ? "#F59E0B" : "#10B981"
        const statusLabel = !compatible ? "ERROR" : warning ? "WARN" : "OK"

        return (
          <div
            key={edge.id}
            className="flex items-start gap-2 p-2 rounded-[2px]"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          >
            <div
              className="w-2 h-2 rounded-full mt-1 shrink-0"
              style={{ background: portColourHex(signalType) }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span style={{ color: "var(--text-secondary)", fontSize: 10 }}>
                  {isSource ? "→" : "←"}
                </span>
                <span
                  className="truncate"
                  style={{ color: "var(--text-primary)", fontSize: 11 }}
                >
                  {otherName}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span style={{ color: portColourHex(signalType), fontSize: 10 }} title={signalType}>
                  {signalLabel(signalType)}
                </span>
                <span
                  className="text-[9px] px-1 rounded-[1px]"
                  style={{
                    background: statusColour + "20",
                    color: statusColour,
                  }}
                >
                  {statusLabel}
                </span>
              </div>
              {warning && (
                <div className="text-[10px] mt-0.5" style={{ color: "#F59E0B" }}>
                  {warning}
                </div>
              )}
              {!compatible && data?.warning && (
                <div className="text-[10px] mt-0.5" style={{ color: "#EF4444" }}>
                  {data.warning}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
