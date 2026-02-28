import { DeviceNode } from "../types/canvas"
import { PowerSpec } from "../types/api"

export interface PowerSummaryEntry {
  nodeId: string
  instanceId: string
  name: string
  totalWatts: number
  maxWatts: number
  circuits: PowerSpec[]
}

export interface CircuitGroup {
  circuitRequired: string
  devices: PowerSummaryEntry[]
  totalWatts: number
  limitWatts: number  // e.g. 3000 for 13A, 4600 for 20A
}

const CIRCUIT_LIMITS: Record<string, number> = {
  "13A": 3000,
  "15A": 3450,
  "20A": 4600,
  "32A": 7360,
  "63A": 14490,
}

function circuitLimit(circuitRequired: string): number {
  for (const [key, limit] of Object.entries(CIRCUIT_LIMITS)) {
    if (circuitRequired.includes(key)) return limit
  }
  return 3000 // default to 13A
}

export function calcPowerSummary(nodes: DeviceNode[]): {
  entries: PowerSummaryEntry[]
  groups: CircuitGroup[]
  grandTotalWatts: number
} {
  const entries: PowerSummaryEntry[] = nodes.map((node) => {
    const power = node.data.record.metadata.power ?? []
    const totalWatts = power.reduce((sum, p) => sum + (p.draw_watts ?? 0), 0)
    const maxWatts = power.reduce((sum, p) => sum + (p.draw_watts_max ?? p.draw_watts ?? 0), 0)
    return {
      nodeId: node.id,
      instanceId: node.data.instanceId,
      name: node.data.label ?? node.data.record.name,
      totalWatts,
      maxWatts,
      circuits: power,
    }
  })

  const groupMap = new Map<string, CircuitGroup>()
  for (const entry of entries) {
    for (const circuit of entry.circuits) {
      const key = circuit.circuit_required ?? "Unknown"
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          circuitRequired: key,
          devices: [],
          totalWatts: 0,
          limitWatts: circuitLimit(key),
        })
      }
      const group = groupMap.get(key)!
      group.devices.push(entry)
      group.totalWatts += circuit.draw_watts ?? 0
    }
  }

  const grandTotalWatts = entries.reduce((sum, e) => sum + e.totalWatts, 0)

  return {
    entries,
    groups: Array.from(groupMap.values()),
    grandTotalWatts,
  }
}
