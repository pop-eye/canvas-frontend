import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
  addEdge as rfAddEdge,
  applyNodeChanges,
  applyEdgeChanges,
  XYPosition,
  OnNodesChange,
  OnEdgesChange,
} from "@xyflow/react"
import { v4 as uuidv4 } from "uuid"
import { EquipmentRecord } from "../types/api"
import { DeviceNode, ConnectionEdge, RoomConfig } from "../types/canvas"
import { DevicePlacement, MountPosition, RoomConfig3D } from "../types/spatial"

const MAX_UNDO_STACK = 20

interface CanvasSnapshot {
  nodes: DeviceNode[]
  edges: ConnectionEdge[]
}

interface CanvasStore {
  nodes: DeviceNode[]
  edges: ConnectionEdge[]
  selectedNodeId: string | null
  roomConfig: RoomConfig | null
  placements: Record<string, DevicePlacement>
  roomConfig3D: RoomConfig3D | null
  undoStack: CanvasSnapshot[]

  addNode: (record: EquipmentRecord, position: XYPosition) => void
  duplicateNode: (id: string) => void
  removeNode: (id: string) => void
  selectNode: (id: string | null) => void
  addEdge: (edge: ConnectionEdge) => void
  removeEdge: (id: string) => void
  onNodesChange: OnNodesChange<DeviceNode>
  onEdgesChange: OnEdgesChange<ConnectionEdge>
  clearCanvas: () => void
  undo: () => void
  setRoomConfig: (config: RoomConfig) => void
  updateNodeLabel: (id: string, label: string) => void
  loadRig: (nodes: DeviceNode[], edges: ConnectionEdge[], roomConfig: RoomConfig | null) => void
  // 3D
  setPlacement: (instanceId: string, placement: Partial<DevicePlacement>) => void
  setRoomConfig3D: (config: Partial<RoomConfig3D>) => void
  initPlacement: (instanceId: string, record: EquipmentRecord) => void
}

function snapshot(state: { nodes: DeviceNode[]; edges: ConnectionEdge[] }): CanvasSnapshot {
  return { nodes: [...state.nodes], edges: [...state.edges] }
}

const DEFAULT_ROOM3D: RoomConfig3D = {
  width_m: 20,
  depth_m: 15,
  height_m: 5,
  venueName: "Untitled Venue",
}

function defaultPlacement(
  instanceId: string,
  record: EquipmentRecord,
  roomConfig3D: RoomConfig3D | null
): DevicePlacement {
  const room = roomConfig3D ?? DEFAULT_ROOM3D
  const W = room.width_m
  const D = room.depth_m
  const H = room.height_m
  const cx = W / 2
  const cz = D / 2
  const ff = record.metadata?.physical?.form_factor ?? ""
  const cat = record.category ?? ""

  let mounted: MountPosition = "floor"
  let y = 0

  if (
    ff === "rackmount" ||
    cat === "media_server" ||
    cat === "networking" ||
    cat === "power_distribution"
  ) {
    mounted = "rack"
    y = 0.8
  } else if (
    ff === "flown" ||
    ff === "truss" ||
    cat === "lighting" ||
    cat === "audio_amplified" ||
    cat === "audio_passive"
  ) {
    mounted = "truss"
    y = H - 0.5
  } else if (ff === "desktop" || cat === "control") {
    mounted = "table"
    y = 0.9
  }

  return {
    instanceId,
    position3d: { x: cx, y, z: cz },
    rotation: { x: 0, y: 0, z: 0 },
    mounted,
  }
}

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      roomConfig: null,
      placements: {},
      roomConfig3D: null,
      undoStack: [],

      addNode: (record, position) => {
        const state = get()
        const instanceId = uuidv4()
        const newNode: DeviceNode = {
          id: instanceId,
          type: "device",
          position,
          data: {
            record,
            instanceId,
          },
        }
        // Create default 3D placement
        const room3D = state.roomConfig3D
        const placement = defaultPlacement(instanceId, record, room3D)
        set({
          undoStack: [snapshot(state), ...state.undoStack].slice(0, MAX_UNDO_STACK),
          nodes: [...state.nodes, newNode],
          placements: { ...state.placements, [instanceId]: placement },
        })
      },

      duplicateNode: (id) => {
        const state = get()
        const source = state.nodes.find((n) => n.id === id)
        if (!source) return
        const newId = uuidv4()
        const newNode: DeviceNode = {
          ...source,
          id: newId,
          position: { x: source.position.x + 40, y: source.position.y + 40 },
          data: { ...source.data, instanceId: newId },
          selected: false,
        }
        const srcPlacement = state.placements[id]
        const newPlacement = srcPlacement
          ? { ...srcPlacement, instanceId: newId }
          : defaultPlacement(newId, source.data.record, state.roomConfig3D)
        set({
          undoStack: [snapshot(state), ...state.undoStack].slice(0, MAX_UNDO_STACK),
          nodes: [...state.nodes, newNode],
          placements: { ...state.placements, [newId]: newPlacement },
          selectedNodeId: newId,
        })
      },

      removeNode: (id) => {
        const state = get()
        set({
          undoStack: [snapshot(state), ...state.undoStack].slice(0, MAX_UNDO_STACK),
          nodes: state.nodes.filter((n) => n.id !== id),
          edges: state.edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        })
      },

      selectNode: (id) => set({ selectedNodeId: id }),

      addEdge: (edge) => {
        const state = get()
        set({
          undoStack: [snapshot(state), ...state.undoStack].slice(0, MAX_UNDO_STACK),
          edges: rfAddEdge(edge, state.edges) as ConnectionEdge[],
        })
      },

      removeEdge: (id) => {
        const state = get()
        set({
          undoStack: [snapshot(state), ...state.undoStack].slice(0, MAX_UNDO_STACK),
          edges: state.edges.filter((e) => e.id !== id),
        })
      },

      onNodesChange: (changes) => {
        set((state) => ({
          nodes: applyNodeChanges(changes, state.nodes) as DeviceNode[],
        }))
      },

      onEdgesChange: (changes) => {
        set((state) => ({
          edges: applyEdgeChanges(changes, state.edges) as ConnectionEdge[],
        }))
      },

      clearCanvas: () => {
        const state = get()
        set({
          undoStack: [snapshot(state), ...state.undoStack].slice(0, MAX_UNDO_STACK),
          nodes: [],
          edges: [],
          selectedNodeId: null,
        })
      },

      undo: () => {
        const state = get()
        if (state.undoStack.length === 0) return
        const [prev, ...rest] = state.undoStack
        set({
          nodes: prev.nodes,
          edges: prev.edges,
          undoStack: rest,
          selectedNodeId: null,
        })
      },

      setRoomConfig: (config) => set({ roomConfig: config }),

      updateNodeLabel: (id, label) => {
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, label } } : n
          ),
        }))
      },

      loadRig: (nodes, edges, roomConfig) => {
        set({ nodes, edges, roomConfig, selectedNodeId: null, undoStack: [] })
      },

      setPlacement: (instanceId, update) =>
        set((state) => ({
          placements: {
            ...state.placements,
            [instanceId]: {
              ...state.placements[instanceId],
              instanceId,
              ...update,
            },
          },
        })),

      setRoomConfig3D: (config) =>
        set((state) => ({
          roomConfig3D: { ...(state.roomConfig3D ?? DEFAULT_ROOM3D), ...config },
        })),

      initPlacement: (instanceId, record) => {
        const room3D = get().roomConfig3D
        const placement = defaultPlacement(instanceId, record, room3D)
        set((state) => ({
          placements: { ...state.placements, [instanceId]: placement },
        }))
      },
    }),
    {
      name: "conduit-canvas-v1",
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        roomConfig: state.roomConfig,
        placements: state.placements,
        roomConfig3D: state.roomConfig3D,
      }),
    }
  )
)
