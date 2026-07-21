/**
 * Serialise / restore the full rig as a portable project state — the blob
 * stored in the cloud `projects.state` column and returned by share links.
 * Captures everything a rig needs: canvas, room, 3D placements, and pricing.
 */
import { useCanvasStore } from "../store/canvasStore"
import { usePricingStore } from "../store/pricingStore"
import type { DeviceNode, ConnectionEdge, RoomConfig } from "../types/canvas"
import type { DevicePlacement, RoomConfig3D } from "../types/spatial"

export interface ProjectState {
  version: 2
  nodes: DeviceNode[]
  edges: ConnectionEdge[]
  roomConfig: RoomConfig | null
  roomConfig3D: RoomConfig3D | null
  placements: Record<string, DevicePlacement>
  pricing?: { currency: string; prices: Record<string, number> }
}

export function captureProjectState(): ProjectState {
  const c = useCanvasStore.getState()
  const p = usePricingStore.getState()
  return {
    version: 2,
    nodes: c.nodes,
    edges: c.edges,
    roomConfig: c.roomConfig,
    roomConfig3D: c.roomConfig3D,
    placements: c.placements,
    pricing: { currency: p.currency, prices: p.prices },
  }
}

export function applyProjectState(state: ProjectState): void {
  if (state.pricing) {
    usePricingStore.setState({ currency: state.pricing.currency ?? "£", prices: state.pricing.prices ?? {} })
  }
  useCanvasStore.getState().loadProject({
    nodes: state.nodes ?? [],
    edges: state.edges ?? [],
    roomConfig: state.roomConfig ?? null,
    roomConfig3D: state.roomConfig3D ?? null,
    placements: state.placements ?? {},
  })
}
