import { useCallback, useMemo, useRef, useState } from "react"
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Connection,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useCanvasStore } from "../../store/canvasStore"
import { useUIStore } from "../../store/uiStore"
import { useCompatibility } from "../../hooks/useCompatibility"
import { fetchDevice } from "../../conduit/source"
import { useConverters, pickBridgePorts, type ConverterMatch } from "../../conduit/converters"
import { DeviceNode as DeviceNodeComponent } from "./DeviceNode"
import { ConnectionEdge as ConnectionEdgeComponent } from "./ConnectionEdge"
import { RoomBounds } from "./RoomBounds"
import { ConnectionEdge, DeviceNode } from "../../types/canvas"
import { v4 as uuidv4 } from "uuid"
import { CompatibilityAlert } from "../panels/CompatibilityAlert"
import { RigHealthPanel } from "../panels/RigHealthPanel"
import { ConverterSuggestionBar } from "../panels/ConverterSuggestionBar"

interface PendingConverter {
  source: string
  sourceHandle: string
  target: string
  targetHandle: string
  from: string
  to: string
  fromLabel: string
  toLabel: string
}

const nodeTypes = { device: DeviceNodeComponent, roomBounds: RoomBounds }
const edgeTypes = { connection: ConnectionEdgeComponent }

function ConduitCanvasInner() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    removeNode,
    addEdge,
    removeEdge,
    selectNode,
    undo,
    roomConfig,
  } = useCanvasStore()

  // Prepend a non-interactive RoomBounds node when a room is configured
  const allNodes = useMemo(() => {
    if (!roomConfig) return nodes
    const boundsNode = {
      id: "__room_bounds__",
      type: "roomBounds",
      position: { x: 0, y: 0 },
      data: {
        width_m: roomConfig.width_m,
        depth_m: roomConfig.depth_m,
        name: roomConfig.name,
      },
      selectable: false,
      draggable: false,
      connectable: false,
      focusable: false,
      deletable: false,
    }
    return [boundsNode, ...nodes] as typeof nodes
  }, [nodes, roomConfig])
  const { addToast } = useUIStore()
  const { validateConnection } = useCompatibility()
  const { screenToFlowPosition } = useReactFlow()
  const dropRef = useRef<HTMLDivElement>(null)
  const [pendingConverter, setPendingConverter] = useState<PendingConverter | null>(null)

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const deviceId = e.dataTransfer.getData("device-id")
      if (!deviceId) return

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })

      try {
        const device = await fetchDevice(deviceId)
        addNode(device, deviceId, position)
      } catch {
        addToast({ type: "error", message: "Failed to load device profile" })
      }
    },
    [screenToFlowPosition, addNode, addToast]
  )

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  // Validate + create one edge. Returns true if the edge was added.
  const connect = useCallback(
    (sourceId: string, sourceHandle: string, targetId: string, targetHandle: string, nodesArr: DeviceNode[]): boolean => {
      const result = validateConnection(sourceId, sourceHandle, targetId, targetHandle, nodesArr, useCanvasStore.getState().edges)
      if (!result.compatible) {
        addToast({ type: "error", message: result.reason ?? "Incompatible connection" })
        return false
      }
      if (result.warning) addToast({ type: "warning", message: result.warning })

      const sNode = nodesArr.find((n) => n.id === sourceId)
      const sPort = sNode?.data.device.ports.find((p) => p.id === result.sourcePortId)
      const edge: ConnectionEdge = {
        id: uuidv4(),
        type: "connection",
        source: sourceId,
        target: targetId,
        sourceHandle,
        targetHandle,
        data: {
          sourcePortId: result.sourcePortId ?? "",
          targetPortId: result.targetPortId ?? "",
          signalType: sPort?.signal_type ?? "other",
          severity: result.severity,
          compatible: result.compatible,
          warning: result.warning,
        },
      }
      addEdge(edge)
      return true
    },
    [validateConnection, addEdge, addToast]
  )

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) return

      const result = validateConnection(params.source, params.sourceHandle, params.target, params.targetHandle, nodes, edges)

      if (!result.compatible) {
        // A protocol mismatch that a converter could bridge → offer to insert one.
        if (result.converter) {
          setPendingConverter({
            source: params.source, sourceHandle: params.sourceHandle,
            target: params.target, targetHandle: params.targetHandle,
            ...result.converter,
          })
        } else {
          addToast({ type: "error", message: result.reason ?? "Incompatible connection" })
        }
        return
      }
      connect(params.source, params.sourceHandle, params.target, params.targetHandle, nodes)
    },
    [nodes, edges, validateConnection, connect, addToast]
  )

  // Insert a converter between the blocked source/target and auto-wire both hops.
  const insertConverter = useCallback(
    (match: ConverterMatch) => {
      const pc = pendingConverter
      if (!pc) return
      const bridge = pickBridgePorts(match.device, pc.from, pc.to)
      if (!bridge) {
        addToast({ type: "error", message: "That converter has no matching ports" })
        setPendingConverter(null)
        return
      }
      const src = nodes.find((n) => n.id === pc.source)
      const tgt = nodes.find((n) => n.id === pc.target)
      const pos = {
        x: ((src?.position.x ?? 0) + (tgt?.position.x ?? 0)) / 2 + (src && tgt ? 0 : 80),
        y: ((src?.position.y ?? 0) + (tgt?.position.y ?? 0)) / 2 + 60,
      }
      const convId = addNode(match.device, match.id, pos)
      // Fresh nodes now include the converter (zustand set is synchronous).
      const fresh = useCanvasStore.getState().nodes
      const ok1 = connect(pc.source, pc.sourceHandle, convId, `${bridge.inId}::in`, fresh)
      const ok2 = connect(convId, `${bridge.outId}::out`, pc.target, pc.targetHandle, useCanvasStore.getState().nodes)
      if (ok1 && ok2) {
        addToast({ type: "success", message: `Inserted ${match.device.manufacturer} ${match.device.model}` })
      }
      setPendingConverter(null)
    },
    [pendingConverter, nodes, addNode, connect, addToast]
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id)
      useUIStore.getState().openInspector()
    },
    [selectNode]
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  // React Flow calls these when its own delete key fires (Backspace/Delete)
  const onNodesDelete = useCallback(
    (deleted: DeviceNode[]) => {
      deleted.forEach((n) => removeNode(n.id))
    },
    [removeNode]
  )

  const onEdgesDelete = useCallback(
    (deleted: ConnectionEdge[]) => {
      deleted.forEach((e) => removeEdge(e.id))
    },
    [removeEdge]
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault()
        undo()
      }
      if (e.key === "Escape") {
        selectNode(null)
      }
    },
    [undo, selectNode]
  )

  return (
    <div
      ref={dropRef}
      className="w-full h-full"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onKeyDown={onKeyDown}
      tabIndex={0}
      style={{ outline: "none" }}
    >
      <ReactFlow
        nodes={allNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={"loose" as import("@xyflow/react").ConnectionMode}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#1E2025"
        />
        <Controls
          showFitView
          showZoom
          showInteractive={false}
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 2,
          }}
        />
        <MiniMap
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
          }}
          nodeColor="#1E2025"
          maskColor="rgba(10,10,11,0.7)"
        />
      </ReactFlow>

      {/* Converter suggestion (on a protocol-mismatch connection attempt) */}
      {pendingConverter && (
        <ConverterPrompt pc={pendingConverter} onInsert={insertConverter} onDismiss={() => setPendingConverter(null)} />
      )}

      {/* Floating analysis overlays */}
      <div className="absolute bottom-4 right-4 pointer-events-none flex flex-col items-end">
        <CompatibilityAlert />
        <RigHealthPanel />
      </div>

      {nodes.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ color: "var(--text-secondary)" }}
        >
          <div className="text-center space-y-2">
            <div className="text-sm">Drag equipment from the library onto the canvas</div>
            <div className="text-xs opacity-60">Connect ports to map signal flow</div>
          </div>
        </div>
      )}
    </div>
  )
}

// Runs the catalog search for a pending converter and renders the suggestion bar.
function ConverterPrompt({
  pc,
  onInsert,
  onDismiss,
}: {
  pc: PendingConverter
  onInsert: (m: ConverterMatch) => void
  onDismiss: () => void
}) {
  const { data: matches, isLoading } = useConverters(pc.from, pc.to)
  return (
    <ConverterSuggestionBar
      fromLabel={pc.fromLabel}
      toLabel={pc.toLabel}
      matches={matches ?? []}
      loading={isLoading}
      onInsert={onInsert}
      onDismiss={onDismiss}
    />
  )
}

export function ConduitCanvas() {
  return (
    <ReactFlowProvider>
      <ConduitCanvasInner />
    </ReactFlowProvider>
  )
}
