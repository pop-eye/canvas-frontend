import { useEffect, useMemo, useState } from "react"
import { ReactFlow, Background, BackgroundVariant, Controls, MiniMap, ReactFlowProvider } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { DeviceNode as DeviceNodeComponent } from "../canvas/DeviceNode"
import { ConnectionEdge as ConnectionEdgeComponent } from "../canvas/ConnectionEdge"
import { RoomBounds } from "../canvas/RoomBounds"
import { isCloudEnabled } from "../../backend/supabase"
import { getSharedProject } from "../../backend/projects"
import type { ProjectState } from "../../backend/projectState"

const nodeTypes = { device: DeviceNodeComponent, roomBounds: RoomBounds }
const edgeTypes = { connection: ConnectionEdgeComponent }

type Loaded = { name: string; state: ProjectState }
type Status = "loading" | "notfound" | Loaded

export function ShareView({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("loading")

  useEffect(() => {
    let alive = true
    if (!isCloudEnabled()) { setStatus("notfound"); return }
    getSharedProject(token)
      .then((r) => { if (alive) setStatus(r ?? "notfound") })
      .catch(() => { if (alive) setStatus("notfound") })
    return () => { alive = false }
  }, [token])

  if (status === "loading") return <Centered>Loading shared rig…</Centered>
  if (status === "notfound") return <Centered>This share link is invalid or has been removed.<OpenLink /></Centered>

  return <SharedCanvas loaded={status} />
}

function SharedCanvas({ loaded }: { loaded: Loaded }) {
  const { name, state } = loaded
  const nodes = useMemo(() => {
    const base = state.nodes ?? []
    if (!state.roomConfig) return base
    const bounds = {
      id: "__room_bounds__", type: "roomBounds", position: { x: 0, y: 0 },
      data: { width_m: state.roomConfig.width_m, depth_m: state.roomConfig.depth_m, name: state.roomConfig.name },
      selectable: false, draggable: false, connectable: false, focusable: false, deletable: false,
    }
    return [bounds, ...base] as typeof base
  }, [state])

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-3 px-4 h-10 shrink-0 border-b" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
        <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em" }}>CONDUIT</span>
        <span className="text-sm" style={{ color: "var(--text-primary)" }}>{name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-[1px]" style={{ background: "var(--border)", color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>READ-ONLY</span>
        <div className="flex-1" />
        <OpenLink inline />
      </div>
      <div className="flex-1 min-h-0">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={state.edges ?? []}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            edgesFocusable={false}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1E2025" />
            <Controls showInteractive={false} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 2 }} />
            <MiniMap style={{ background: "var(--panel)", border: "1px solid var(--border)" }} nodeColor="#1E2025" maskColor="rgba(10,10,11,0.7)" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-screen text-center px-6" style={{ background: "var(--bg)", color: "var(--text-secondary)" }}>
      <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>CONDUIT</span>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function OpenLink({ inline }: { inline?: boolean }) {
  return (
    <a href={window.location.origin} className={inline ? "text-xs" : "text-xs mt-2"} style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>
      Open CONDUIT →
    </a>
  )
}
