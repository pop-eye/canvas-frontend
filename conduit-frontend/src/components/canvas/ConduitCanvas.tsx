import { useCallback, useMemo, useRef } from "react"
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
import { getEquipment } from "../../api/equipment"
import { DeviceNode as DeviceNodeComponent } from "./DeviceNode"
import { ConnectionEdge as ConnectionEdgeComponent } from "./ConnectionEdge"
import { RoomBounds } from "./RoomBounds"
import { ConnectionEdge, DeviceNode } from "../../types/canvas"
import { v4 as uuidv4 } from "uuid"
import { CompatibilityAlert } from "../panels/CompatibilityAlert"

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

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const equipmentId = e.dataTransfer.getData("equipment-id")
      if (!equipmentId) return

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })

      try {
        const record = await getEquipment(equipmentId)
        addNode(record, position)
      } catch {
        addToast({ type: "error", message: "Failed to load equipment from API" })
      }
    },
    [screenToFlowPosition, addNode, addToast]
  )

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) return

      const result = validateConnection(
        params.source,
        params.sourceHandle,
        params.target,
        params.targetHandle,
        nodes
      )

      if (!result.compatible) {
        addToast({ type: "error", message: result.reason ?? "Incompatible connection" })
        return
      }

      if (result.warning) {
        addToast({ type: "warning", message: result.warning })
      }

      // Determine signal type from source port
      const sourceNode = nodes.find((n) => n.id === params.source)
      const sourceOutputs = sourceNode?.data.record.metadata.connectivity.outputs ?? []
      const handleParts = params.sourceHandle.split("-")
      const idx = parseInt(handleParts[handleParts.length - 1], 10) || 0
      const signalType = sourceOutputs[idx]?.signal_type ?? "other"

      const edge: ConnectionEdge = {
        id: uuidv4(),
        type: "connection",
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        data: {
          sourcePortId: params.sourceHandle,
          targetPortId: params.targetHandle,
          signalType,
          compatible: result.compatible,
          warning: result.warning,
        },
      }

      addEdge(edge)
    },
    [nodes, validateConnection, addEdge, addToast]
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

      {/* Compatibility alert floating panel */}
      <div className="absolute bottom-4 right-4 pointer-events-none">
        <CompatibilityAlert />
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

export function ConduitCanvas() {
  return (
    <ReactFlowProvider>
      <ConduitCanvasInner />
    </ReactFlowProvider>
  )
}
