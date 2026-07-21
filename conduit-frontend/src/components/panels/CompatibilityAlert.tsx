import { useCanvasStore } from "../../store/canvasStore"
import { AlertTriangle, XCircle } from "lucide-react"
import { deviceName } from "../../conduit/device"

export function CompatibilityAlert() {
  const { edges, nodes } = useCanvasStore()

  const issues = edges.filter(
    (e) => !e.data?.compatible || e.data?.warning
  )

  if (issues.length === 0) return null

  const errors = issues.filter((e) => !e.data?.compatible)
  const warnings = issues.filter((e) => e.data?.compatible && e.data?.warning)

  return (
    <div
      className="pointer-events-auto rounded-[2px] overflow-hidden shadow-2xl w-72"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      }}
    >
      <div
        className="px-3 py-2 flex items-center gap-2 border-b"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg)",
        }}
      >
        <AlertTriangle size={12} className="text-amber-400" />
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ color: "var(--text-secondary)" }}
        >
          {issues.length} issue{issues.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="max-h-48 overflow-y-auto">
        {errors.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest" style={{ color: "#EF4444" }}>
              Errors
            </div>
            {errors.map((edge) => (
              <IssueRow key={edge.id} edge={edge} nodes={nodes} type="error" />
            ))}
          </div>
        )}
        {warnings.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest" style={{ color: "#F59E0B" }}>
              Warnings
            </div>
            {warnings.map((edge) => (
              <IssueRow key={edge.id} edge={edge} nodes={nodes} type="warning" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function IssueRow({
  edge,
  nodes,
  type,
}: {
  edge: import("../../types/canvas").ConnectionEdge
  nodes: import("../../types/canvas").DeviceNode[]
  type: "error" | "warning"
}) {
  const sourceNode = nodes.find((n) => n.id === edge.source)
  const targetNode = nodes.find((n) => n.id === edge.target)
  const sourceName = sourceNode?.data.label ?? (sourceNode ? deviceName(sourceNode.data.device) : "?")
  const targetName = targetNode?.data.label ?? (targetNode ? deviceName(targetNode.data.device) : "?")
  const message = edge.data?.warning ?? "Incompatible connection"
  const colour = type === "error" ? "#EF4444" : "#F59E0B"
  const Icon = type === "error" ? XCircle : AlertTriangle

  return (
    <div
      className="px-3 py-2 flex gap-2 items-start border-b last:border-0"
      style={{ borderColor: "var(--border)" }}
    >
      <Icon size={11} style={{ color: colour, flexShrink: 0, marginTop: 1 }} />
      <div className="min-w-0">
        <div className="text-[10px]" style={{ color: "var(--text-primary)" }}>
          <span className="text-[10px] opacity-80">{sourceName}</span>
          <span className="mx-1 opacity-40">→</span>
          <span className="text-[10px] opacity-80">{targetName}</span>
        </div>
        <div className="text-[10px] mt-0.5" style={{ color: colour }}>
          {message}
        </div>
      </div>
    </div>
  )
}
