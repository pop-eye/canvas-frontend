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
import type { ConduitDevice } from "../conduit/types"
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

  addNode: (device: ConduitDevice, deviceId: string, position: XYPosition) => string
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
  /** Restore a full project (nodes, edges, room, 3D placements). */
  loadProject: (p: {
    nodes: DeviceNode[]
    edges: ConnectionEdge[]
    roomConfig: RoomConfig | null
    roomConfig3D: RoomConfig3D | null
    placements: Record<string, DevicePlacement>
  }) => void
  // 3D
  setPlacement: (instanceId: string, placement: Partial<DevicePlacement>) => void
  setRoomConfig3D: (config: Partial<RoomConfig3D>) => void
  initPlacement: (instanceId: string, device: ConduitDevice) => void
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

const RACK_CATEGORIES = new Set([
  "media-server", "network-switch", "network-router", "network-gateway",
  "video-switcher", "video-scaler", "video-converter", "video-matrix",
  "video-capture", "video-encoder", "video-decoder", "led-processor",
  "audio-processor", "audio-interface", "power-distribution", "ups",
  "intercom-matrix", "rf-distribution", "antenna-combiner",
])
const TRUSS_CATEGORIES = new Set([
  "lighting-fixture", "led-fixture", "audio-loudspeaker", "audio-monitor",
])
const TABLE_CATEGORIES = new Set([
  "control-system", "show-controller", "audio-console", "lighting-console",
  "computer", "media-player", "camera",
])

function defaultPlacement(
  instanceId: string,
  device: ConduitDevice,
  roomConfig3D: RoomConfig3D | null
): DevicePlacement {
  const room = roomConfig3D ?? DEFAULT_ROOM3D
  const cx = room.width_m / 2
  const cz = room.depth_m / 2
  const H = room.height_m
  const ff = device.form_factor ?? ""
  const cat = device.category ?? ""

  let mounted: MountPosition = "floor"
  let y = 0

  if (ff === "rackmount" || RACK_CATEGORIES.has(cat)) {
    mounted = "rack"
    y = 0.8
  } else if (ff === "truss-mount" || ff === "ceiling-mount" || TRUSS_CATEGORIES.has(cat)) {
    mounted = "truss"
    y = H - 0.5
  } else if (ff === "desktop" || TABLE_CATEGORIES.has(cat)) {
    mounted = "table"
    y = 0.9
  } else if (ff === "wall-mount" || cat === "display" || cat === "projector") {
    // displays hang on the front wall; projectors default to ceiling
    if (cat === "projector") {
      mounted = "ceiling"
      y = H - 0.5
    } else {
      mounted = "wall-front"
      y = 1.5
    }
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

      addNode: (device, deviceId, position) => {
        const state = get()
        const instanceId = uuidv4()
        const newNode: DeviceNode = {
          id: instanceId,
          type: "device",
          position,
          data: { device, deviceId, instanceId },
        }
        const placement = defaultPlacement(instanceId, device, state.roomConfig3D)
        set({
          undoStack: [snapshot(state), ...state.undoStack].slice(0, MAX_UNDO_STACK),
          nodes: [...state.nodes, newNode],
          placements: { ...state.placements, [instanceId]: placement },
        })
        return instanceId
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
          : defaultPlacement(newId, source.data.device, state.roomConfig3D)
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

      loadProject: (p) => {
        set({
          nodes: p.nodes ?? [],
          edges: p.edges ?? [],
          roomConfig: p.roomConfig ?? null,
          roomConfig3D: p.roomConfig3D ?? null,
          placements: p.placements ?? {},
          selectedNodeId: null,
          undoStack: [],
        })
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

      initPlacement: (instanceId, device) => {
        const room3D = get().roomConfig3D
        const placement = defaultPlacement(instanceId, device, room3D)
        set((state) => ({
          placements: { ...state.placements, [instanceId]: placement },
        }))
      },
    }),
    {
      // v2: conduit/v1 device model. Old v1 (scraper EquipmentRecord) state is
      // incompatible and intentionally dropped by the new key.
      name: "conduit-canvas-v2",
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
