/**
 * Bill of materials + cable schedule — the professional deliverables.
 *
 * Pure builders over the current rig plus a small CSV serialiser. The BOM
 * aggregates canvas devices by type with quantities; the cable schedule turns
 * every connection into a numbered, from/to cable run with estimated length.
 */
import { DeviceNode, ConnectionEdge } from "../types/canvas"
import { DevicePlacement } from "../types/spatial"
import { deviceName, deviceMaxWatts, connectorLabel } from "../conduit/device"
import { signalLabel } from "../conduit/signalType"
import { categoryLabel } from "../conduit/category"
import { buildNodeMap, calcCableDistances } from "./graphAnalysis"

// ─── Bill of materials ───────────────────────────────────────────────────────

export interface BOMLine {
  key: string          // deviceId (stable) or "mfr|model" fallback
  manufacturer: string
  model: string
  category: string
  qty: number
  unitWatts: number
  totalWatts: number
}

export function buildBOM(nodes: DeviceNode[]): BOMLine[] {
  const map = new Map<string, BOMLine>()
  for (const n of nodes) {
    const d = n.data.device
    const key = n.data.deviceId || `${d.manufacturer}|${d.model}`
    const unitWatts = Math.round(deviceMaxWatts(d))
    const existing = map.get(key)
    if (existing) {
      existing.qty += 1
      existing.totalWatts += unitWatts
    } else {
      map.set(key, {
        key,
        manufacturer: d.manufacturer,
        model: d.model,
        category: categoryLabel(d.category),
        qty: 1,
        unitWatts,
        totalWatts: unitWatts,
      })
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      a.category.localeCompare(b.category) ||
      a.manufacturer.localeCompare(b.manufacturer) ||
      a.model.localeCompare(b.model)
  )
}

// ─── Cable schedule ──────────────────────────────────────────────────────────

export interface CableLine {
  cableId: string
  fromDevice: string
  fromPort: string
  toDevice: string
  toPort: string
  signal: string
  connectorFrom: string
  connectorTo: string
  lengthM: number | null
  maxLengthM: number | null
  exceeded: boolean
}

export function buildCableSchedule(
  nodes: DeviceNode[],
  edges: ConnectionEdge[],
  placements: Record<string, DevicePlacement>
): CableLine[] {
  const nodeMap = buildNodeMap(nodes)
  const dist = new Map(calcCableDistances(edges, nodeMap, placements).map((r) => [r.edgeId, r]))

  return edges.map((e, i) => {
    const s = nodeMap.get(e.source)
    const t = nodeMap.get(e.target)
    const sPort = s?.data.device.ports.find((p) => p.id === e.data?.sourcePortId)
    const tPort = t?.data.device.ports.find((p) => p.id === e.data?.targetPortId)
    const d = dist.get(e.id)
    return {
      cableId: `C${String(i + 1).padStart(3, "0")}`,
      fromDevice: s ? (s.data.label ?? deviceName(s.data.device)) : "?",
      fromPort: sPort?.label ?? sPort?.id ?? "—",
      toDevice: t ? (t.data.label ?? deviceName(t.data.device)) : "?",
      toPort: tPort?.label ?? tPort?.id ?? "—",
      signal: signalLabel(e.data?.signalType ?? "other"),
      connectorFrom: connectorLabel(sPort?.connector_type) || "—",
      connectorTo: connectorLabel(tPort?.connector_type) || "—",
      lengthM: d?.estimatedLengthM ?? null,
      maxLengthM: d?.maxLengthM ?? null,
      exceeded: d?.exceeded ?? false,
    }
  })
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

export function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n")
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
