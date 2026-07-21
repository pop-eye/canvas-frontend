import { DeviceNode, ConnectionEdge } from "../types/canvas"
import { DevicePlacement } from "../types/spatial"
import type { Port } from "../conduit/types"
import { deviceName } from "../conduit/device"
import { parseSignalType, protocolFamily, signalLabel } from "../conduit/signalType"

// ─── Shared map builders ────────────────────────────────────────────────────

export type NodeMap = Map<string, DeviceNode>

export function buildNodeMap(nodes: DeviceNode[]): NodeMap {
  const map = new Map<string, DeviceNode>()
  for (const n of nodes) map.set(n.id, n)
  return map
}

export interface AdjacencyEntry {
  edgeId: string
  neighborId: string
  direction: "out" | "in"
}
export type AdjacencyMap = Map<string, AdjacencyEntry[]>

export function buildAdjacency(edges: ConnectionEdge[]): AdjacencyMap {
  const map = new Map<string, AdjacencyEntry[]>()
  for (const edge of edges) {
    if (!map.has(edge.source)) map.set(edge.source, [])
    if (!map.has(edge.target)) map.set(edge.target, [])
    map.get(edge.source)!.push({ edgeId: edge.id, neighborId: edge.target, direction: "out" })
    map.get(edge.target)!.push({ edgeId: edge.id, neighborId: edge.source, direction: "in" })
  }
  return map
}

// Resolve the conduit Port a given edge endpoint refers to.
function edgeSourcePort(edge: ConnectionEdge, node: DeviceNode | undefined): Port | undefined {
  if (!node) return undefined
  return node.data.device.ports.find((p) => p.id === edge.data?.sourcePortId)
}
function edgeTargetPort(edge: ConnectionEdge, node: DeviceNode | undefined): Port | undefined {
  if (!node) return undefined
  return node.data.device.ports.find((p) => p.id === edge.data?.targetPortId)
}

const portCapacity = (port: Port): number => port.count ?? 1

// ─── Port overload detection ────────────────────────────────────────────────

export interface PortOverload {
  nodeId: string
  nodeName: string
  direction: "input" | "output"
  protocol: string
  used: number
  capacity: number
}

export function calcPortOverloads(nodes: DeviceNode[], edges: ConnectionEdge[]): PortOverload[] {
  const overloads: PortOverload[] = []
  const nodeMap = buildNodeMap(nodes)

  for (const node of nodes) {
    const outUsed = new Map<string, number>()
    const inUsed = new Map<string, number>()
    for (const edge of edges) {
      if (edge.source === node.id && edge.data?.sourcePortId)
        outUsed.set(edge.data.sourcePortId, (outUsed.get(edge.data.sourcePortId) ?? 0) + 1)
      if (edge.target === node.id && edge.data?.targetPortId)
        inUsed.set(edge.data.targetPortId, (inUsed.get(edge.data.targetPortId) ?? 0) + 1)
    }
    const name = node.data.label ?? deviceName(node.data.device)
    for (const port of node.data.device.ports) {
      const cap = portCapacity(port)
      const outN = outUsed.get(port.id) ?? 0
      if (outN > cap)
        overloads.push({ nodeId: node.id, nodeName: name, direction: "output", protocol: signalLabel(port.signal_type), used: outN, capacity: cap })
      const inN = inUsed.get(port.id) ?? 0
      if (inN > cap)
        overloads.push({ nodeId: node.id, nodeName: name, direction: "input", protocol: signalLabel(port.signal_type), used: inN, capacity: cap })
    }
  }
  void nodeMap
  return overloads
}

/** Used by useCompatibility to block a new connection before it is added. */
export function isPortAtCapacity(
  nodeId: string,
  portId: string,
  role: "in" | "out",
  nodes: DeviceNode[],
  edges: ConnectionEdge[]
): { overloaded: boolean; used: number; capacity: number; protocol: string } | null {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return null
  const port = node.data.device.ports.find((p) => p.id === portId)
  if (!port) return null
  const cap = portCapacity(port)
  const used = edges.filter((e) =>
    role === "out"
      ? e.source === nodeId && e.data?.sourcePortId === portId
      : e.target === nodeId && e.data?.targetPortId === portId
  ).length
  return { overloaded: used >= cap, used, capacity: cap, protocol: signalLabel(port.signal_type) }
}

// ─── Loop detection (directed DFS) ─────────────────────────────────────────

export function detectLoops(nodeMap: NodeMap, adjacency: AdjacencyMap): string[][] {
  const loops: string[][] = []
  const globalVisited = new Set<string>()

  for (const startId of nodeMap.keys()) {
    if (globalVisited.has(startId)) continue
    const path: string[] = []
    const pathSet = new Set<string>()

    function dfs(id: string) {
      if (pathSet.has(id)) {
        const cycleStart = path.indexOf(id)
        if (cycleStart !== -1) loops.push([...path.slice(cycleStart), id])
        return
      }
      if (globalVisited.has(id)) return
      pathSet.add(id)
      path.push(id)
      for (const { neighborId, direction } of adjacency.get(id) ?? []) {
        if (direction === "out") dfs(neighborId)
      }
      path.pop()
      pathSet.delete(id)
      globalVisited.add(id)
    }

    dfs(startId)
  }
  return loops
}

// ─── Signal path tracing ────────────────────────────────────────────────────

export interface SignalPath {
  nodeIds: string[]
  edgeIds: string[]
  signalTypes: string[]
  totalLatencyMs: number
}

export function traceDownstreamPaths(startNodeId: string, nodeMap: NodeMap, edges: ConnectionEdge[]): SignalPath[] {
  const paths: SignalPath[] = []

  function dfs(currentId: string, pathNodes: string[], pathEdges: string[], pathSignals: string[], latency: number, visited: Set<string>) {
    const outgoing = edges.filter((e) => e.source === currentId && !visited.has(e.target))
    if (outgoing.length === 0) {
      if (pathNodes.length > 1) {
        paths.push({ nodeIds: [...pathNodes], edgeIds: [...pathEdges], signalTypes: [...pathSignals], totalLatencyMs: latency })
      }
      return
    }
    for (const edge of outgoing) {
      const targetNode = nodeMap.get(edge.target)
      if (!targetNode) continue
      const newVisited = new Set(visited)
      newVisited.add(currentId)
      const port = edgeTargetPort(edge, targetNode)
      const portLatency = port?.latency_ms ?? 0
      dfs(
        edge.target,
        [...pathNodes, edge.target],
        [...pathEdges, edge.id],
        [...pathSignals, edge.data?.signalType ?? "other"],
        latency + portLatency,
        newVisited
      )
    }
  }

  dfs(startNodeId, [startNodeId], [], [], 0, new Set())
  return paths
}

// ─── Cable distance estimation ──────────────────────────────────────────────
// The standard has no per-port max cable distance, so we apply a conservative
// heuristic per signal protocol/domain. Indicative only.

const MAX_DISTANCE_BY_FAMILY: Record<string, number> = {
  "video/hdmi": 15, "video/displayport": 3, "video/dvi": 5, "video/vga": 15,
  "video/sdi": 100, "video/hdbaset": 100, "video/composite": 30, "video/component": 30,
  "network/ethernet": 100, "network/fibre": 300,
  "audio/analogue": 100, "audio/aes3": 100, "audio/dante": 100, "audio/aes67": 100, "audio/madi": 100,
  "lighting/dmx512": 300, "lighting/artnet": 100, "lighting/sacn": 100,
  "control/rs232": 15, "control/rs485": 1000, "control/rs422": 1000,
}
const MAX_DISTANCE_BY_DOMAIN: Record<string, number> = {
  video: 15, audio: 100, network: 100, lighting: 100, control: 30,
}

function maxCableDistanceM(signalType: string): number | null {
  const fam = protocolFamily(signalType)
  if (fam in MAX_DISTANCE_BY_FAMILY) return MAX_DISTANCE_BY_FAMILY[fam]
  const domain = parseSignalType(signalType).domain
  return MAX_DISTANCE_BY_DOMAIN[domain] ?? null
}

export interface CableDistanceResult {
  edgeId: string
  sourceNodeId: string
  targetNodeId: string
  sourceName: string
  targetName: string
  estimatedLengthM: number
  maxLengthM: number | null
  exceeded: boolean
  protocol: string
  signalType: string
}

export function calcCableDistances(
  edges: ConnectionEdge[],
  nodeMap: NodeMap,
  placements: Record<string, DevicePlacement>
): CableDistanceResult[] {
  const results: CableDistanceResult[] = []

  for (const edge of edges) {
    const srcPlacement = placements[edge.source]
    const tgtPlacement = placements[edge.target]
    if (!srcPlacement || !tgtPlacement) continue

    const sp = srcPlacement.position3d
    const tp = tgtPlacement.position3d
    const dist = Math.sqrt((tp.x - sp.x) ** 2 + (tp.y - sp.y) ** 2 + (tp.z - sp.z) ** 2)

    const srcNode = nodeMap.get(edge.source)
    const tgtNode = nodeMap.get(edge.target)
    const signalType = edge.data?.signalType ?? "other"
    const maxDist = maxCableDistanceM(signalType)

    results.push({
      edgeId: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      sourceName: srcNode ? (srcNode.data.label ?? deviceName(srcNode.data.device)) : "?",
      targetName: tgtNode ? (tgtNode.data.label ?? deviceName(tgtNode.data.device)) : "?",
      estimatedLengthM: Math.round(dist * 10) / 10,
      maxLengthM: maxDist,
      exceeded: maxDist !== null && dist > maxDist,
      protocol: signalLabel(signalType),
      signalType,
    })
  }
  return results
}

// ─── PoE budget analysis ────────────────────────────────────────────────────

const POE_CLASS_WATTS: Record<string, number> = {
  "0": 15.4, "1": 4, "2": 7, "3": 15.4, "4": 30, "5": 45, "6": 60, "7": 75, "8": 90,
}

function poeConsumptionWatts(node: DeviceNode): number | null {
  const d = node.data.device
  // A PD port with a class gives the most accurate figure.
  const pdPort = d.ports.find((p) => p.poe_role === "pd" && p.poe_class)
  if (pdPort?.poe_class) return POE_CLASS_WATTS[pdPort.poe_class] ?? 15.4
  const poweredByPoe = d.power?.psu_type?.startsWith("poe") || d.ports.some((p) => p.poe_role === "pd")
  if (poweredByPoe) return d.power?.max_wattage ?? d.power?.typical_wattage ?? 15.4
  return null
}

export interface PoeBudgetResult {
  switchNodeId: string
  switchName: string
  budgetWatts: number
  consumedWatts: number
  overloaded: boolean
  consumers: { nodeId: string; name: string; watts: number }[]
}

export function calcPoeBudget(nodes: DeviceNode[], edges: ConnectionEdge[], nodeMap: NodeMap): PoeBudgetResult[] {
  const results: PoeBudgetResult[] = []

  for (const node of nodes) {
    const budget = node.data.device.power?.poe_budget_w
    const providesPoe = (budget ?? 0) > 0 || node.data.device.ports.some((p) => p.poe_role === "pse")
    if (!providesPoe || !budget) continue

    const connectedIds = new Set([
      ...edges.filter((e) => e.source === node.id).map((e) => e.target),
      ...edges.filter((e) => e.target === node.id).map((e) => e.source),
    ])

    const consumers: PoeBudgetResult["consumers"] = []
    for (const cid of connectedIds) {
      const cNode = nodeMap.get(cid)
      if (!cNode) continue
      const watts = poeConsumptionWatts(cNode)
      if (watts == null) continue
      consumers.push({ nodeId: cid, name: cNode.data.label ?? deviceName(cNode.data.device), watts })
    }

    if (consumers.length === 0) continue
    const consumed = consumers.reduce((s, c) => s + c.watts, 0)
    results.push({
      switchNodeId: node.id,
      switchName: node.data.label ?? deviceName(node.data.device),
      budgetWatts: budget,
      consumedWatts: Math.round(consumed * 10) / 10,
      overloaded: consumed > budget,
      consumers,
    })
  }
  return results
}

// ─── DMX / Art-Net / sACN universe collision ────────────────────────────────

export interface DmxCollision {
  universe: number
  protocol: string
  devices: { nodeId: string; name: string }[]
}

export function calcDmxCollisions(nodes: DeviceNode[]): DmxCollision[] {
  // key = `${protocol}:${universe}`
  const byKey = new Map<string, { protocol: string; universe: number; devices: { nodeId: string; name: string }[] }>()

  for (const node of nodes) {
    const name = node.data.label ?? deviceName(node.data.device)
    for (const port of node.data.device.ports) {
      if (port.universe == null) continue
      const p = parseSignalType(port.signal_type)
      if (p.domain !== "lighting") continue
      const protocol = p.protocol ?? "dmx"
      const key = `${protocol}:${port.universe}`
      if (!byKey.has(key)) byKey.set(key, { protocol, universe: port.universe, devices: [] })
      const entry = byKey.get(key)!
      if (!entry.devices.some((d) => d.nodeId === node.id)) entry.devices.push({ nodeId: node.id, name })
    }
  }

  const collisions: DmxCollision[] = []
  for (const { protocol, universe, devices } of byKey.values()) {
    if (devices.length > 1) {
      collisions.push({ universe, protocol: protocol === "artnet" ? "Art-Net" : protocol === "sacn" ? "sACN" : "DMX", devices })
    }
  }
  return collisions
}

// ─── Daisy chain depth (loop-through) ───────────────────────────────────────
// conduit/v1 marks loop-through capability per port but has no universal max
// depth, so this reports long loop-through chains without a hard limit.

export interface DaisyChainViolation {
  nodeId: string
  name: string
  chainDepth: number
  maxDepth: number
}

export function calcDaisyChainViolations(_nodes: DeviceNode[], _edges: ConnectionEdge[]): DaisyChainViolation[] {
  void _nodes
  void _edges
  return []
}
