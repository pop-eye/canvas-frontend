import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ExternalLink, Pencil, RotateCcw } from "lucide-react"
import { useCanvasStore } from "../../store/canvasStore"
import { useUIStore } from "../../store/uiStore"
import { ConfidenceLevelBadge } from "../ui/Badge"
import { DevicePanel } from "../panels/DevicePanel"
import { PowerSummary } from "../panels/PowerSummary"
import { SignalReport } from "../panels/SignalReport"
import { DeviceAnalysis } from "../panels/DeviceAnalysis"
import { ProjectorAnalysisPanel } from "../panels/ProjectorAnalysisPanel"
import { getCategoryIcon, categoryLabel } from "../../conduit/category"
import { deviceName, deviceDatasheetUrl, deviceNeedsReview, deviceUpdatedAt } from "../../conduit/device"
import type { ConduitDevice } from "../../conduit/types"
import { MountPosition } from "../../types/spatial"

const ALL_TABS = [
  { id: "panel", label: "Panel", categories: null },
  { id: "specs", label: "Specs", categories: null },
  { id: "power", label: "Power", categories: null },
  { id: "connections", label: "Connections", categories: null },
  { id: "position", label: "Position", categories: null },
  { id: "analysis", label: "Analysis", categories: null },
  { id: "throw", label: "Throw", categories: ["projector"] as string[] },
] as const

type TabId = typeof ALL_TABS[number]["id"]

export function Inspector() {
  const { nodes, selectedNodeId, selectNode, updateNodeLabel } = useCanvasStore()
  const { inspectorTab, setInspectorTab } = useUIStore()

  const [editingLabel, setEditingLabel] = useState(false)
  const [editValue, setEditValue] = useState("")
  const labelInputRef = useRef<HTMLInputElement>(null)

  const node = nodes.find((n) => n.id === selectedNodeId)
  const device = node?.data.device
  const name = node?.data.label ?? (device ? deviceName(device) : "")

  const visibleTabs = ALL_TABS.filter(
    (t) => t.categories === null || (device && t.categories.includes(device.category))
  )

  useEffect(() => {
    if (!device) return
    if (device.category === "projector") {
      setInspectorTab("throw" as TabId)
    } else if (visibleTabs.find((t) => t.id === inspectorTab) == null) {
      setInspectorTab("panel" as TabId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId])

  useEffect(() => {
    if (device && visibleTabs.find((t) => t.id === inspectorTab) == null) {
      setInspectorTab("panel" as TabId)
    }
  }, [device?.category])

  useEffect(() => { if (!editingLabel) setEditValue(name) }, [name, editingLabel])
  useEffect(() => { if (editingLabel) labelInputRef.current?.select() }, [editingLabel])

  if (!node || !device) return null

  const CategoryIcon = getCategoryIcon(device.category)
  const needsReview = deviceNeedsReview(device)
  const datasheet = deviceDatasheetUrl(device)
  const updated = deviceUpdatedAt(device)

  const commitLabel = () => {
    const val = editValue.trim()
    updateNodeLabel(node.id, val || deviceName(device))
    setEditingLabel(false)
  }

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-0 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-start gap-2">
          <div className="shrink-0 mt-0.5 p-1.5 rounded-[2px]" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <CategoryIcon size={13} style={{ color: needsReview ? "#F59E0B" : "var(--accent)" }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 group/name">
              {editingLabel ? (
                <input
                  ref={labelInputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitLabel}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitLabel()
                    if (e.key === "Escape") setEditingLabel(false)
                  }}
                  className="flex-1 bg-transparent border-b text-sm font-semibold outline-none"
                  style={{ color: "var(--text-primary)", borderColor: "var(--accent)", fontFamily: "'DM Sans', sans-serif" }}
                />
              ) : (
                <span
                  className="text-sm font-semibold leading-tight cursor-text"
                  style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}
                  onDoubleClick={() => setEditingLabel(true)}
                  title="Double-click to rename"
                >
                  {name}
                </span>
              )}
              {!editingLabel && (
                <button onClick={() => setEditingLabel(true)} className="opacity-0 group-hover/name:opacity-40 hover:!opacity-100 transition-opacity">
                  <Pencil size={10} style={{ color: "var(--text-secondary)" }} />
                </button>
              )}
            </div>

            <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
              <span>{device.manufacturer}</span>
              <span className="opacity-40">·</span>
              <span>{device.model}</span>
              <span className="opacity-40">·</span>
              <span>{categoryLabel(device.category)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <ConfidenceLevelBadge level={device.profile_meta?.confidence} />
            {needsReview && (
              <span className="text-[9px] px-1 py-0.5 rounded-[1px]" style={{ background: "#F59E0B20", color: "#F59E0B", border: "1px solid #F59E0B40", fontFamily: "'JetBrains Mono', monospace" }}>
                REVIEW
              </span>
            )}
            {datasheet && (
              <a href={datasheet} target="_blank" rel="noopener noreferrer" className="opacity-50 hover:opacity-100 transition-opacity" title="View datasheet ↗">
                <ExternalLink size={12} style={{ color: "var(--text-secondary)" }} />
              </a>
            )}
            <button onClick={() => selectNode(null)} className="opacity-50 hover:opacity-100 transition-opacity">
              <X size={13} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        <div className="mt-1.5 mb-2 text-[9px]" style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>
          {updated ? `updated ${updated}` : "unversioned"}
          &nbsp;·&nbsp;schema {device.schema_version}
        </div>

        {/* Tabs */}
        <div className="relative mt-3 -mb-3">
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10" style={{ background: "linear-gradient(to right, transparent, var(--panel))" }} />
          <div className="flex gap-0" style={{ overflowX: "auto", scrollbarWidth: "none" }}>
            {visibleTabs.map((tab) => {
              const isActive = inspectorTab === tab.id
              const hasBadge = tab.id === "throw" && device.category === "projector"
              return (
                <button
                  key={tab.id}
                  onClick={() => setInspectorTab(tab.id as TabId)}
                  className="px-2 py-1.5 text-xs border-b-2 transition-colors shrink-0 whitespace-nowrap flex items-center gap-1"
                  style={{
                    borderBottomColor: isActive ? "var(--accent)" : "transparent",
                    color: isActive ? "var(--accent)" : "var(--text-secondary)",
                    fontFamily: "'JetBrains Mono', monospace",
                    background: "transparent",
                  }}
                >
                  {tab.label}
                  {hasBadge && !isActive && (
                    <span className="inline-block rounded-full" style={{ width: 5, height: 5, background: "var(--accent)", flexShrink: 0 }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={inspectorTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className="h-full">
            {inspectorTab === "panel" && <DevicePanel device={device} />}
            {inspectorTab === "specs" && <SpecsTab device={device} />}
            {inspectorTab === "power" && <PowerSummary />}
            {inspectorTab === "connections" && <SignalReport nodeId={selectedNodeId!} />}
            {inspectorTab === "position" && <PositionTab instanceId={node.data.instanceId} />}
            {inspectorTab === "analysis" && <DeviceAnalysis nodeId={selectedNodeId!} />}
            {inspectorTab === "throw" && <ProjectorAnalysisPanel nodeId={selectedNodeId!} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── Specs ───────────────────────────────────────────────────────────────────

function SpecsTab({ device }: { device: ConduitDevice }) {
  const p = device.power
  const env = device.environment
  const rel = device.reliability
  const dims = device.dimensions

  return (
    <div className="p-4 space-y-1" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
      {device.description && (
        <div className="text-[11px] leading-relaxed pb-2" style={{ color: "var(--text-secondary)" }}>
          {device.description}
        </div>
      )}

      <Section label="Physical" defaultOpen>
        {device.weight_kg != null && <KV k="Weight" v={`${device.weight_kg} kg`} />}
        {dims && (dims.width_mm || dims.height_mm || dims.depth_mm) && (
          <KV k="Dimensions" v={`${dims.width_mm ?? "?"} × ${dims.height_mm ?? "?"} × ${dims.depth_mm ?? "?"} mm`} />
        )}
        {device.rack_units != null && <KV k="Rack Units" v={`${device.rack_units}U`} />}
        {device.form_factor && <KV k="Form Factor" v={device.form_factor} />}
        {env?.ip_rating && <KV k="IP Rating" v={env.ip_rating} />}
      </Section>

      {p && (
        <Section label="Power" defaultOpen>
          {p.max_wattage != null && <KV k="Max Draw" v={`${p.max_wattage}W`} />}
          {p.typical_wattage != null && <KV k="Typical" v={`${p.typical_wattage}W`} />}
          {p.standby_wattage != null && <KV k="Standby" v={`${p.standby_wattage}W`} />}
          {p.voltage_v != null && <KV k="Voltage" v={`${Array.isArray(p.voltage_v) ? p.voltage_v.join("–") : p.voltage_v}V`} />}
          {p.frequency_hz != null && <KV k="Frequency" v={`${Array.isArray(p.frequency_hz) ? p.frequency_hz.join("/") : p.frequency_hz}Hz`} />}
          {p.phases != null && <KV k="Phases" v={p.phases === 3 ? "3-phase" : "Single-phase"} />}
          {p.inrush_current_a != null && <KV k="Inrush" v={`${p.inrush_current_a}A`} />}
          {p.connector_type && <KV k="Connector" v={p.connector_type} />}
          {p.psu_type && <KV k="PSU" v={p.psu_type} />}
          {p.redundant_psu && <KV k="Redundant PSU" v="Yes" />}
          {p.poe_budget_w != null && <KV k="PoE Budget" v={`${p.poe_budget_w}W`} />}
        </Section>
      )}

      {/* Capability blocks */}
      {(device.capabilities ?? []).map((cap, i) => (
        <CapabilitySection key={i} cap={cap} />
      ))}

      {env && (env.operating_temp_min_c != null || env.audible_noise_dba != null || env.heat_dissipation_btu_hr != null || env.altitude_max_m != null || env.humidity_max_percent != null) && (
        <Section label="Environment">
          {env.operating_temp_min_c != null && env.operating_temp_max_c != null && (
            <KV k="Op. Temp" v={`${env.operating_temp_min_c}°C – ${env.operating_temp_max_c}°C`} />
          )}
          {env.humidity_max_percent != null && <KV k="Humidity" v={`${env.humidity_max_percent}%`} />}
          {env.altitude_max_m != null && <KV k="Max Altitude" v={`${env.altitude_max_m}m`} />}
          {env.audible_noise_dba != null && <KV k="Noise" v={`${env.audible_noise_dba} dB(A)`} />}
          {env.heat_dissipation_btu_hr != null && <KV k="Heat" v={`${env.heat_dissipation_btu_hr} BTU/hr`} />}
        </Section>
      )}

      {rel && (rel.mtbf_hours != null || rel.warranty_years != null || rel.eol_date) && (
        <Section label="Reliability">
          {rel.mtbf_hours != null && <KV k="MTBF" v={`${rel.mtbf_hours.toLocaleString()} hrs`} />}
          {rel.warranty_years != null && <KV k="Warranty" v={`${rel.warranty_years} yr`} />}
          {rel.eol_date && <KV k="End of Life" v={rel.eol_date} />}
        </Section>
      )}

      {(device.protocols?.length ?? 0) > 0 && (
        <Section label="Protocols">
          {device.protocols!.map((pr, i) => (
            <KV key={i} k={pr.name} v={[pr.version, pr.transport, pr.port_number ? `:${pr.port_number}` : null].filter(Boolean).join(" · ") || "—"} />
          ))}
        </Section>
      )}

      {(device.tags?.length ?? 0) > 0 && (
        <Section label="Tags">
          <div className="flex flex-wrap gap-1">
            {device.tags!.map((t, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded-[2px] text-[10px]" style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>{t}</span>
            ))}
          </div>
        </Section>
      )}

      {device.notes && (
        <Section label="Notes">
          <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-primary)" }}>{device.notes}</div>
        </Section>
      )}

      {(device.sources?.length ?? 0) > 0 && (
        <Section label="Sources">
          {device.sources!.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] py-0.5 hover:underline" style={{ color: "var(--accent)" }}>
              <ExternalLink size={9} /> {s.title || s.type || s.url}
            </a>
          ))}
        </Section>
      )}
    </div>
  )
}

const CAP_LABELS: Record<string, string> = {
  display: "Display / Projection",
  compute: "Compute",
  "network-switch": "Network Switch",
  "led-processor": "LED Processor",
  "audio-io": "Audio I/O",
  intercom: "Intercom",
}

function CapabilitySection({ cap }: { cap: import("../../conduit/types").CapabilityBlock }) {
  const label = CAP_LABELS[cap.type] ?? String(cap.type)
  const rows: [string, string][] = []
  for (const [key, value] of Object.entries(cap)) {
    if (key === "type" || value == null) continue
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        if (value.length) rows.push([prettyKey(key), value.join(", ")])
      } else {
        // e.g. native_resolution { width_px, height_px, fps }
        const r = value as Record<string, unknown>
        if (r.width_px && r.height_px) rows.push([prettyKey(key), `${r.width_px}×${r.height_px}${r.fps ? ` @ ${Array.isArray(r.fps) ? Math.max(...(r.fps as number[])) : r.fps}Hz` : ""}`])
      }
      continue
    }
    rows.push([prettyKey(key), typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)])
  }
  if (rows.length === 0) return null
  return (
    <Section label={label} defaultOpen>
      {rows.map(([k, v]) => <KV key={k} k={k} v={v} />)}
    </Section>
  )
}

function prettyKey(key: string): string {
  return key
    .replace(/_(px|hz|khz|mhz|gbps|mpps|kb|mb|gb|tb|lm|db|dbu|ghz|us|ms|w|v|a)\b/gi, (_, u) => ` ${u.toUpperCase()}`)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function Section({ label, children, defaultOpen = false }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex items-center gap-2 py-1.5 cursor-pointer list-none select-none" style={{ color: "var(--text-secondary)" }}>
        <span className="text-[9px] uppercase tracking-[0.15em] font-semibold flex-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
        <span className="text-[10px] opacity-40 group-open:rotate-180 transition-transform inline-block">▾</span>
      </summary>
      <div className="pl-2 pb-2 space-y-1">{children}</div>
    </details>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-[11px] shrink-0 w-28" style={{ color: "var(--text-secondary)" }}>{k}</span>
      <span className="text-[11px]" style={{ color: "var(--text-primary)" }}>{v}</span>
    </div>
  )
}

// ─── Position tab ────────────────────────────────────────────────────────────

const MOUNT_OPTIONS: { value: MountPosition; label: string }[] = [
  { value: "floor", label: "Floor" },
  { value: "table", label: "Table / Desk" },
  { value: "rack", label: "Rack" },
  { value: "truss", label: "Truss / Flown" },
  { value: "freestanding", label: "Freestanding" },
  { value: "wall-front", label: "Wall (Front)" },
  { value: "wall-rear", label: "Wall (Rear)" },
  { value: "ceiling", label: "Ceiling" },
]

function PositionTab({ instanceId }: { instanceId: string }) {
  const { placements, setPlacement, initPlacement, nodes } = useCanvasStore()
  const placement = placements[instanceId]
  const node = nodes.find((n) => n.id === instanceId)

  if (!placement) {
    return (
      <div className="p-4 flex flex-col gap-3">
        <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>No 3D position assigned yet.</p>
        {node && (
          <button
            onClick={() => initPlacement(instanceId, node.data.device)}
            className="px-3 py-1.5 text-xs rounded-[2px] self-start"
            style={{ background: "var(--accent)", color: "#000", fontFamily: "'JetBrains Mono', monospace" }}
          >
            Assign Default Position
          </button>
        )}
      </div>
    )
  }

  const { position3d, rotation, mounted } = placement

  function setXYZ(axis: "x" | "y" | "z", raw: string) {
    const v = parseFloat(raw)
    if (isNaN(v)) return
    setPlacement(instanceId, { position3d: { ...position3d, [axis]: v } })
  }
  function setRotY(raw: string) {
    const v = parseFloat(raw)
    if (isNaN(v)) return
    setPlacement(instanceId, { rotation: { ...rotation, y: v } })
  }

  return (
    <div className="p-4 space-y-5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div className="space-y-1.5">
        <label className="text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ color: "var(--text-secondary)" }}>Mount Position</label>
        <select
          value={mounted}
          onChange={(e) => setPlacement(instanceId, { mounted: e.target.value as MountPosition })}
          className="w-full px-2 py-1.5 text-xs rounded-[2px] outline-none"
          style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        >
          {MOUNT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ color: "var(--text-secondary)" }}>Position (metres)</label>
        <div className="grid grid-cols-3 gap-2">
          {(["x", "y", "z"] as const).map((axis) => (
            <div key={axis} className="flex flex-col gap-1">
              <span className="text-[9px] uppercase" style={{ color: "var(--text-secondary)" }}>{axis}</span>
              <input
                type="number"
                step="0.1"
                value={position3d[axis].toFixed(2)}
                onChange={(e) => setXYZ(axis, e.target.value)}
                className="w-full px-2 py-1 text-xs rounded-[2px] outline-none text-right"
                style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ color: "var(--text-secondary)" }}>
          Rotation Y: {Math.round(rotation.y * (180 / Math.PI))}°
        </label>
        <input type="range" min={-Math.PI} max={Math.PI} step={0.01} value={rotation.y} onChange={(e) => setRotY(e.target.value)} className="w-full" />
      </div>

      {node && (
        <button
          onClick={() => initPlacement(instanceId, node.data.device)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[2px] opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          <RotateCcw size={11} /> Reset to default
        </button>
      )}
    </div>
  )
}
