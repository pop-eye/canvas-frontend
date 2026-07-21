import { DeviceNode } from "../types/canvas"
import { deviceName, deviceMaxWatts, deviceTypicalWatts, connectorLabel } from "../conduit/device"

export interface PowerSummaryEntry {
  nodeId: string
  instanceId: string
  name: string
  totalWatts: number       // max draw (falls back to typical)
  typicalWatts: number
  connector: string        // mains connector — proxy for the circuit type
}

export interface CircuitGroup {
  circuitRequired: string  // connector/circuit label
  devices: PowerSummaryEntry[]
  totalWatts: number
  limitWatts: number
}

// Rough continuous-load ceiling (W) by mains connector, at ~230V unless noted.
const CONNECTOR_LIMITS: Record<string, number> = {
  "iec-c13": 2300, "iec-c14": 2300, "iec-c19": 3680, "iec-c20": 3680,
  "bs1363": 3000, "schuko": 3680, "nema-5-15": 1800, "nema-5-20": 2400,
  "nema-l6-20": 4600, "nema-l21-30": 20700, "cee-16a": 3680, "cee-32a": 7360,
  "powercon-true1": 3680, "powercon-true1-top": 3680, "powerlock": 40000,
}

function connectorLimit(connector: string | undefined): number {
  if (connector && connector in CONNECTOR_LIMITS) return CONNECTOR_LIMITS[connector]
  return 3000
}

export function calcPowerSummary(nodes: DeviceNode[]): {
  entries: PowerSummaryEntry[]
  groups: CircuitGroup[]
  grandTotalWatts: number
} {
  const entries: PowerSummaryEntry[] = nodes.map((node) => {
    const d = node.data.device
    return {
      nodeId: node.id,
      instanceId: node.data.instanceId,
      name: node.data.label ?? deviceName(d),
      totalWatts: Math.round(deviceMaxWatts(d)),
      typicalWatts: Math.round(deviceTypicalWatts(d)),
      connector: d.power?.connector_type ?? "",
    }
  })

  const groupMap = new Map<string, CircuitGroup>()
  for (const entry of entries) {
    if (entry.totalWatts <= 0) continue
    const key = entry.connector || "unmetered"
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        circuitRequired: entry.connector ? connectorLabel(entry.connector) : "Unmetered",
        devices: [],
        totalWatts: 0,
        limitWatts: connectorLimit(entry.connector),
      })
    }
    const group = groupMap.get(key)!
    group.devices.push(entry)
    group.totalWatts += entry.totalWatts
  }

  const grandTotalWatts = entries.reduce((sum, e) => sum + e.totalWatts, 0)

  return { entries, groups: Array.from(groupMap.values()), grandTotalWatts }
}
