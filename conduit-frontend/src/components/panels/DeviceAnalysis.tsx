import { useMemo } from "react"
import { useCanvasStore } from "../../store/canvasStore"
import {
  buildNodeMap,
  traceDownstreamPaths,
  calcCableDistances,
  calcPortOverloads,
} from "../../utils/graphAnalysis"
import { portColourHex } from "../../utils/portColour"
import { deviceName } from "../../conduit/device"
import { signalLabel } from "../../conduit/signalType"

interface DeviceAnalysisProps {
  nodeId: string
}

export function DeviceAnalysis({ nodeId }: DeviceAnalysisProps) {
  const { nodes, edges, placements } = useCanvasStore()

  const { paths, cables, portOverloads, nodeName } = useMemo(() => {
    const nodeMap = buildNodeMap(nodes)
    const node = nodeMap.get(nodeId)
    const nodeName = node ? (node.data.label ?? deviceName(node.data.device)) : "?"

    // Downstream signal paths
    const paths = traceDownstreamPaths(nodeId, nodeMap, edges)

    // Cable distances for connections touching this node
    const allCables = calcCableDistances(edges, nodeMap, placements)
    const cables = allCables.filter(
      c => c.sourceNodeId === nodeId || c.targetNodeId === nodeId
    )

    // Port overloads on this device only
    const allOverloads = calcPortOverloads(nodes, edges)
    const portOverloads = allOverloads.filter(o => o.nodeId === nodeId)

    return { paths, cables, portOverloads, nodeName }
  }, [nodes, edges, placements, nodeId])

  const hasSomething = paths.length > 0 || cables.length > 0 || portOverloads.length > 0

  if (!hasSomething) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
        No connections to analyse
      </div>
    )
  }

  return (
    <div
      className="p-4 space-y-4"
      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
    >
      {/* Port capacity */}
      {portOverloads.length > 0 && (
        <div className="space-y-1">
          <SectionLabel label="Port Overloads" colour="#EF4444" />
          {portOverloads.map((o, i) => (
            <div
              key={i}
              className="flex justify-between p-2 rounded-[2px]"
              style={{ background: "#EF444410", border: "1px solid #EF444430" }}
            >
              <span style={{ color: "#EF4444" }}>
                {o.direction} {o.protocol}
              </span>
              <span style={{ color: "#EF4444" }}>
                {o.used}/{o.capacity} used
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Cable distances */}
      {cables.length > 0 && (
        <div className="space-y-1">
          <SectionLabel label="Cable Run Estimates" />
          {cables.map((c, i) => {
            const isSource = c.sourceNodeId === nodeId
            const otherName = isSource ? c.targetName : c.sourceName
            const exceeded = c.exceeded
            const colour = exceeded ? "#EF4444" : c.maxLengthM ? "#10B981" : "var(--text-secondary)"
            return (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-[2px]"
                style={{
                  background: exceeded ? "#EF444410" : "var(--bg)",
                  border: `1px solid ${exceeded ? "#EF444430" : "var(--border)"}`,
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: portColourHex(c.signalType) }}
                  />
                  <span className="truncate" style={{ color: "var(--text-secondary)" }}>
                    {isSource ? "→" : "←"} {otherName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span style={{ color: colour }}>~{c.estimatedLengthM}m</span>
                  {c.maxLengthM && (
                    <span className="opacity-50" style={{ color: colour }}>/ {c.maxLengthM}m</span>
                  )}
                </div>
              </div>
            )
          })}
          <div className="text-[9px] pt-0.5" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
            Estimated from 3D placement positions — straight-line distance only
          </div>
        </div>
      )}

      {/* Downstream signal paths */}
      {paths.length > 0 && (
        <div className="space-y-1">
          <SectionLabel label={`Signal Paths (${paths.length})`} />
          {paths.map((path, i) => {
            const nodeMap = buildNodeMap(nodes)
            const steps = path.nodeIds.map(id => {
              const n = nodeMap.get(id)
              return n ? (n.data.label ?? deviceName(n.data.device)) : id
            })
            const hasLatency = path.totalLatencyMs > 0
            const signalType = path.signalTypes[0] ?? "other"
            return (
              <div
                key={i}
                className="p-2 rounded-[2px] space-y-1"
                style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: portColourHex(signalType) }}
                  />
                  <span style={{ color: portColourHex(signalType), fontSize: 9 }} title={signalType}>
                    {signalLabel(signalType)}
                  </span>
                  {hasLatency && (
                    <span className="ml-auto text-[9px]" style={{ color: "var(--text-secondary)" }}>
                      {path.totalLatencyMs}ms
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {steps.map((name, si) => (
                    <span key={si} className="flex items-center gap-1">
                      {si > 0 && <span style={{ color: "var(--text-secondary)", opacity: 0.4 }}>→</span>}
                      <span
                        style={{
                          color: si === 0 ? "var(--accent)" : "var(--text-primary)",
                          fontSize: 10,
                        }}
                      >
                        {name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {paths.length === 0 && cables.length === 0 && portOverloads.length === 0 && (
        <div className="text-center text-[11px]" style={{ color: "var(--text-secondary)" }}>
          No downstream signal paths from {nodeName}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ label, colour }: { label: string; colour?: string }) {
  return (
    <div
      className="text-[9px] uppercase tracking-widest mb-1"
      style={{ color: colour ?? "var(--text-secondary)" }}
    >
      {label}
    </div>
  )
}
