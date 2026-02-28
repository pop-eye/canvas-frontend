import { useMemo } from "react"
import { AlertTriangle, XCircle, Activity } from "lucide-react"
import { useCanvasStore } from "../../store/canvasStore"
import {
  buildNodeMap,
  buildAdjacency,
  calcPortOverloads,
  detectLoops,
  calcCableDistances,
  calcPoeBudget,
  calcDmxCollisions,
  calcDaisyChainViolations,
} from "../../utils/graphAnalysis"

export function RigHealthPanel() {
  const { nodes, edges, placements } = useCanvasStore()

  const {
    portOverloads,
    loops,
    cableViolations,
    poeIssues,
    dmxCollisions,
    daisyViolations,
  } = useMemo(() => {
    if (nodes.length === 0) {
      return { portOverloads: [], loops: [], cableViolations: [], poeIssues: [], dmxCollisions: [], daisyViolations: [] }
    }
    const nodeMap = buildNodeMap(nodes)
    const adjacency = buildAdjacency(edges)
    return {
      portOverloads: calcPortOverloads(nodes, edges),
      loops: detectLoops(nodeMap, adjacency),
      cableViolations: calcCableDistances(edges, nodeMap, placements).filter(r => r.exceeded),
      poeIssues: calcPoeBudget(nodes, edges, nodeMap).filter(r => r.overloaded),
      dmxCollisions: calcDmxCollisions(nodes),
      daisyViolations: calcDaisyChainViolations(nodes, edges),
    }
  }, [nodes, edges, placements])

  const errors = portOverloads.length + loops.length + poeIssues.length
  const warnings = cableViolations.length + dmxCollisions.length + daisyViolations.length
  const total = errors + warnings

  if (total === 0) return null

  return (
    <div
      className="pointer-events-auto rounded-[2px] overflow-hidden shadow-2xl w-72 mt-2"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      }}
    >
      <div
        className="px-3 py-2 flex items-center gap-2 border-b"
        style={{ borderColor: "var(--border)", background: "var(--bg)" }}
      >
        <Activity size={12} style={{ color: "var(--accent)" }} />
        <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
          Rig Health
        </span>
        <div className="flex gap-1.5 ml-auto">
          {errors > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-[1px]" style={{ background: "#EF444420", color: "#EF4444" }}>
              {errors} error{errors !== 1 ? "s" : ""}
            </span>
          )}
          {warnings > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-[1px]" style={{ background: "#F59E0B20", color: "#F59E0B" }}>
              {warnings} warn{warnings !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {loops.length > 0 && (
          <Section label="Signal Loops" colour="#EF4444" icon={<XCircle size={10} />}>
            {loops.map((loop, i) => (
              <Row key={i} colour="#EF4444"
                label={`Loop of ${loop.length - 1} device${loop.length > 2 ? "s" : ""} detected`}
              />
            ))}
          </Section>
        )}

        {portOverloads.length > 0 && (
          <Section label="Port Overloads" colour="#EF4444" icon={<XCircle size={10} />}>
            {portOverloads.map((o, i) => (
              <Row key={i} colour="#EF4444"
                label={`${o.nodeName} — ${o.direction} ${o.protocol} (${o.used}/${o.capacity})`}
              />
            ))}
          </Section>
        )}

        {poeIssues.length > 0 && (
          <Section label="PoE Budget Exceeded" colour="#EF4444" icon={<XCircle size={10} />}>
            {poeIssues.map((p, i) => (
              <Row key={i} colour="#EF4444"
                label={`${p.switchName}: ${p.consumedWatts}W / ${p.budgetWatts}W`}
              />
            ))}
          </Section>
        )}

        {cableViolations.length > 0 && (
          <Section label="Cable Distance Exceeded" colour="#F59E0B" icon={<AlertTriangle size={10} />}>
            {cableViolations.map((c, i) => (
              <Row key={i} colour="#F59E0B"
                label={`${c.sourceName} → ${c.targetName}: ~${c.estimatedLengthM}m (max ${c.maxLengthM}m)`}
              />
            ))}
          </Section>
        )}

        {dmxCollisions.length > 0 && (
          <Section label="Universe Conflict" colour="#F59E0B" icon={<AlertTriangle size={10} />}>
            {dmxCollisions.map((d, i) => (
              <Row key={i} colour="#F59E0B"
                label={`${d.protocol} U${d.universe}: ${d.devices.map(x => x.name).join(", ")}`}
              />
            ))}
          </Section>
        )}

        {daisyViolations.length > 0 && (
          <Section label="Daisy Chain Limit" colour="#F59E0B" icon={<AlertTriangle size={10} />}>
            {daisyViolations.map((d, i) => (
              <Row key={i} colour="#F59E0B"
                label={`${d.name}: ${d.chainDepth} units (max ${d.maxDepth})`}
              />
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({
  label, colour, icon, children,
}: {
  label: string
  colour: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div
        className="px-3 py-1.5 flex items-center gap-1.5 text-[9px] uppercase tracking-widest border-t"
        style={{ color: colour, borderColor: "var(--border)" }}
      >
        {icon}
        {label}
      </div>
      {children}
    </div>
  )
}

function Row({ label, colour }: { label: string; colour: string }) {
  return (
    <div className="px-4 py-0.5 text-[10px] leading-snug" style={{ color: colour, opacity: 0.85 }}>
      {label}
    </div>
  )
}
