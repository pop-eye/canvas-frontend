import { DeviceNode, ConnectionEdge } from "../types/canvas"
import { DevicePlacement } from "../types/spatial"

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

// Parse protocol from a React Flow handle id:  "input-HDMI-0" / "output-Art-Net-1"
export function parseProtocolFromHandle(handle: string): string | null {
  const parts = handle.split("-")
  if (parts.length < 3) return null
  return parts.slice(1, -1).join("-")
}

// ─── Port overload detection ────────────────────────────────────────────────

export interface PortOverload {
  nodeId: string
  nodeName: string
  direction: "input" | "output"
  protocol: string
  used: number
  capacity: number
}

export function calcPortOverloads(
  nodes: DeviceNode[],
  edges: ConnectionEdge[]
): PortOverload[] {
  const overloads: PortOverload[] = []

  for (const node of nodes) {
    const conn = node.data.record.metadata.connectivity
    const inputCap = new Map<string, number>()
    const outputCap = new Map<string, number>()
    for (const port of conn.inputs)
      inputCap.set(port.protocol, (inputCap.get(port.protocol) ?? 0) + port.quantity)
    for (const port of conn.outputs)
      outputCap.set(port.protocol, (outputCap.get(port.protocol) ?? 0) + port.quantity)

    const inputUsed = new Map<string, number>()
    const outputUsed = new Map<string, number>()
    for (const edge of edges) {
      if (edge.target === node.id) {
        const proto = parseProtocolFromHandle(edge.targetHandle ?? "")
        if (proto) inputUsed.set(proto, (inputUsed.get(proto) ?? 0) + 1)
      }
      if (edge.source === node.id) {
        const proto = parseProtocolFromHandle(edge.sourceHandle ?? "")
        if (proto) outputUsed.set(proto, (outputUsed.get(proto) ?? 0) + 1)
      }
    }

    const name = node.data.label ?? node.data.record.name
    for (const [proto, cap] of inputCap) {
      const used = inputUsed.get(proto) ?? 0
      if (used > cap) overloads.push({ nodeId: node.id, nodeName: name, direction: "input", protocol: proto, used, capacity: cap })
    }
    for (const [proto, cap] of outputCap) {
      const used = outputUsed.get(proto) ?? 0
      if (used > cap) overloads.push({ nodeId: node.id, nodeName: name, direction: "output", protocol: proto, used, capacity: cap })
    }
  }

  return overloads
}

// Used by useCompatibility to block a single new connection before it is added
export function isPortAtCapacity(
  nodeId: string,
  handleId: string,
  direction: "input" | "output",
  nodes: DeviceNode[],
  edges: ConnectionEdge[]
): { overloaded: boolean; used: number; capacity: number; protocol: string } | null {
  const node = nodes.find(n => n.id === nodeId)
  if (!node) return null
  const proto = parseProtocolFromHandle(handleId)
  if (!proto) return null

  const conn = node.data.record.metadata.connectivity
  const ports = direction === "input" ? conn.inputs : conn.outputs
  const cap = ports.filter(p => p.protocol === proto).reduce((s, p) => s + p.quantity, 0)
  if (cap === 0) return null

  const used = edges.filter(e =>
    direction === "input"
      ? e.target === nodeId && parseProtocolFromHandle(e.targetHandle ?? "") === proto
      : e.source === nodeId && parseProtocolFromHandle(e.sourceHandle ?? "") === proto
  ).length

  return { overloaded: used >= cap, used, capacity: cap, protocol: proto }
}

// ─── Loop detection (directed DFS) ─────────────────────────────────────────

export function detectLoops(
  nodeMap: NodeMap,
  adjacency: AdjacencyMap
): string[][] {
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

export function traceDownstreamPaths(
  startNodeId: string,
  nodeMap: NodeMap,
  edges: ConnectionEdge[]
): SignalPath[] {
  const paths: SignalPath[] = []

  function dfs(
    currentId: string,
    pathNodes: string[],
    pathEdges: string[],
    pathSignals: string[],
    latency: number,
    visited: Set<string>
  ) {
    const outgoing = edges.filter(e => e.source === currentId && !visited.has(e.target))
    if (outgoing.length === 0) {
      if (pathNodes.length > 1) {
        paths.push({
          nodeIds: [...pathNodes],
          edgeIds: [...pathEdges],
          signalTypes: [...pathSignals],
          totalLatencyMs: latency,
        })
      }
      return
    }
    for (const edge of outgoing) {
      if (!nodeMap.has(edge.target)) continue
      const targetNode = nodeMap.get(edge.target)!
      const newVisited = new Set(visited)
      newVisited.add(currentId)
      // Accumulate latency from the target port
      const proto = parseProtocolFromHandle(edge.targetHandle ?? "")
      const targetInputs = targetNode.data.record.metadata.connectivity.inputs
      const port = proto ? targetInputs.find(p => p.protocol === proto) : undefined
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
    const proto = parseProtocolFromHandle(edge.sourceHandle ?? "") ?? (edge.data?.signalType ?? "other")

    let maxDist: number | null = null
    if (srcNode) {
      const port = srcNode.data.record.metadata.connectivity.outputs.find(p => p.protocol === proto)
      if (port?.max_cable_distance_m) maxDist = port.max_cable_distance_m
    }

    results.push({
      edgeId: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      sourceName: srcNode ? (srcNode.data.label ?? srcNode.data.record.name) : "?",
      targetName: tgtNode ? (tgtNode.data.label ?? tgtNode.data.record.name) : "?",
      estimatedLengthM: Math.round(dist * 10) / 10,
      maxLengthM: maxDist,
      exceeded: maxDist !== null && dist > maxDist,
      protocol: proto,
      signalType: edge.data?.signalType ?? "other",
    })
  }

  return results
}

// ─── PoE budget analysis ────────────────────────────────────────────────────

export interface PoeBudgetResult {
  switchNodeId: string
  switchName: string
  budgetWatts: number
  consumedWatts: number
  overloaded: boolean
  consumers: { nodeId: string; name: string; watts: number }[]
}

export function calcPoeBudget(
  nodes: DeviceNode[],
  edges: ConnectionEdge[],
  nodeMap: NodeMap
): PoeBudgetResult[] {
  const results: PoeBudgetResult[] = []

  for (const node of nodes) {
    const sc = node.data.record.metadata.signal_chain
    if (!sc?.poe_provides || !sc.poe_budget_watts) continue

    const connectedIds = new Set([
      ...edges.filter(e => e.source === node.id).map(e => e.target),
      ...edges.filter(e => e.target === node.id).map(e => e.source),
    ])

    const consumers: PoeBudgetResult["consumers"] = []
    for (const cid of connectedIds) {
      const cNode = nodeMap.get(cid)
      if (!cNode?.data.record.metadata.signal_chain?.poe_powered) continue
      consumers.push({
        nodeId: cid,
        name: cNode.data.label ?? cNode.data.record.name,
        watts: 15.4, // IEEE 802.3af default; 802.3at devices would be 30W
      })
    }

    if (consumers.length === 0) continue
    const consumed = consumers.reduce((s, c) => s + c.watts, 0)
    results.push({
      switchNodeId: node.id,
      switchName: node.data.label ?? node.data.record.name,
      budgetWatts: sc.poe_budget_watts,
      consumedWatts: Math.round(consumed * 10) / 10,
      overloaded: consumed > sc.poe_budget_watts,
      consumers,
    })
  }

  return results
}

// ─── DMX / Art-Net / sACN universe collision ────────────────────────────────

export interface DmxCollision {
  universe: number
  protocol: "Art-Net" | "sACN"
  devices: { nodeId: string; name: string }[]
}

export function calcDmxCollisions(nodes: DeviceNode[]): DmxCollision[] {
  const artnetMap = new Map<number, { nodeId: string; name: string }[]>()
  const sacnMap = new Map<number, { nodeId: string; name: string }[]>()

  for (const node of nodes) {
    const sc = node.data.record.metadata.signal_chain
    if (!sc) continue
    const name = node.data.label ?? node.data.record.name
    if (sc.artnet_universe_default !== undefined) {
      const u = sc.artnet_universe_default
      if (!artnetMap.has(u)) artnetMap.set(u, [])
      artnetMap.get(u)!.push({ nodeId: node.id, name })
    }
    if (sc.sacn_universe_default !== undefined) {
      const u = sc.sacn_universe_default
      if (!sacnMap.has(u)) sacnMap.set(u, [])
      sacnMap.get(u)!.push({ nodeId: node.id, name })
    }
  }

  const collisions: DmxCollision[] = []
  for (const [universe, devices] of artnetMap)
    if (devices.length > 1) collisions.push({ universe, protocol: "Art-Net", devices })
  for (const [universe, devices] of sacnMap)
    if (devices.length > 1) collisions.push({ universe, protocol: "sACN", devices })
  return collisions
}

// ─── Daisy chain depth validation ──────────────────────────────────────────

export interface DaisyChainViolation {
  nodeId: string
  name: string
  chainDepth: number
  maxDepth: number
}

export function calcDaisyChainViolations(
  nodes: DeviceNode[],
  edges: ConnectionEdge[]
): DaisyChainViolation[] {
  const violations: DaisyChainViolation[] = []

  for (const node of nodes) {
    const sc = node.data.record.metadata.signal_chain
    if (!sc?.daisy_chainable || !sc.daisy_chain_max_units) continue

    let depth = 0
    let curr: string | null = node.id
    const visited = new Set<string>()
    while (curr && !visited.has(curr)) {
      visited.add(curr)
      depth++
      const out = edges.find(e => e.source === curr)
      curr = out ? out.target : null
    }

    if (depth > sc.daisy_chain_max_units) {
      violations.push({
        nodeId: node.id,
        name: node.data.label ?? node.data.record.name,
        chainDepth: depth,
        maxDepth: sc.daisy_chain_max_units,
      })
    }
  }

  return violations
}
